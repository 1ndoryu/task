// PROYECTO TASKS de escritorio: abre el túnel a la BD de la 89, arranca el backend
// local (glory-backend.exe) y muestra la app contra él. Al cerrar la ventana
// se paran los procesos que lanzó; un túnel ya abierto a mano se deja como estaba.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::ffi::OsStr;
use std::fs::{self, File};
use std::net::{SocketAddr, TcpStream};
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};

use tauri::{Manager, RunEvent};

const HOST_REMOTO: &str = "dev89";
const PUERTO_BACKEND: u16 = 4190;
const PUERTO_TUNEL_BD: u16 = 15433;
const SOCKET_PG: &str = "/var/run/postgresql/.s.PGSQL.5432";
const BD: &str = "glory_backend_local";
const MAX_RESPALDOS: usize = 14;
// [por que] Sin este flag Windows abre una consola por cada ssh y por el backend.
const SIN_VENTANA: u32 = 0x0800_0000;

// Procesos lanzados por esta app; se paran al salir.
#[derive(Default)]
struct Hijos(Mutex<Vec<Child>>);

fn main() {
    let construida = tauri::Builder::default()
        .manage(Hijos::default())
        .setup(|app| {
            let app_handle = app.handle().clone();
            // [por que] El arranque espera a puertos; va en un hilo para que la ventana aparezca ya.
            thread::spawn(move || {
                if let Err(e) = arrancar(&app_handle) {
                    registrar(&dir_app().unwrap_or_default(), &e);
                    mostrar_estado(&app_handle, &format!("No se pudo arrancar:\n{e}"));
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!());
    // [por que] Con windows_subsystem="windows" un panic no deja rastro visible: el fallo va a app.log.
    let app = match construida {
        Ok(app) => app,
        Err(e) => {
            registrar(&dir_app().unwrap_or_default(), &format!("no se pudo crear la app: {e}"));
            std::process::exit(1);
        }
    };
    app.run(|app, evento| {
        if let RunEvent::Exit = evento {
            let hijos = app.state::<Hijos>();
            for mut h in hijos.0.lock().unwrap_or_else(|e| e.into_inner()).drain(..) {
                let _ = h.kill();
            }
        }
    });
}

fn arrancar(app: &tauri::AppHandle) -> Result<(), String> {
    let dir = dir_app()?;
    // [por que] Si el puerto ya responde es otro backend (p. ej. exe-local): no usarlo a ciegas.
    if puerto_abierto(PUERTO_BACKEND) {
        return Err(format!("el puerto {PUERTO_BACKEND} ya está en uso; cierra el otro backend"));
    }
    if !puerto_abierto(PUERTO_TUNEL_BD) {
        mostrar_estado(app, "Abriendo el túnel a la base de datos de la 89…");
        lanzar_tunel(app)?;
    }
    mostrar_estado(app, "Arrancando el backend…");
    lanzar_backend(app, &dir)?;
    esperar_puerto(PUERTO_BACKEND, 30)?;

    // [por que] El respaldo corre aparte: un fallo no debe impedir abrir la app.
    let dir_respaldo = dir.clone();
    thread::spawn(move || {
        if let Err(e) = respaldar() {
            registrar(&dir_respaldo, &format!("respaldo: {e}"));
        }
    });

    let url = format!("http://127.0.0.1:{PUERTO_BACKEND}/");
    let js = format!("location.replace({})", serde_json::to_string(&url).map_err(|e| e.to_string())?);
    app.get_webview_window("main")
        .ok_or("no existe la ventana principal")?
        .eval(&js)
        .map_err(|e| e.to_string())
}

fn lanzar_tunel(app: &tauri::AppHandle) -> Result<(), String> {
    // [por que] Peer auth: ssh entrega la conexión como `dev` en el socket; sin contraseñas.
    let reenvio = format!("{PUERTO_TUNEL_BD}:{SOCKET_PG}");
    let hijo = comando("ssh")
        .args(["-N", "-o", "BatchMode=yes", "-o", "ExitOnForwardFailure=yes", "-o", "ServerAliveInterval=30"])
        .args(["-L", reenvio.as_str(), HOST_REMOTO])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("no se pudo lanzar ssh: {e}"))?;
    registrar_hijo(app, hijo);
    esperar_puerto(PUERTO_TUNEL_BD, 15).map_err(|_| "el túnel a la 89 no respondió".to_string())
}

fn lanzar_backend(app: &tauri::AppHandle, dir: &Path) -> Result<(), String> {
    // [por que] Variables explícitas: el .env no viaja al equipo. Solo loopback, sin nada público.
    let log = File::create(dir.join("backend.log")).map_err(|e| e.to_string())?;
    let hijo = comando(dir.join("glory-backend.exe"))
        .current_dir(dir)
        .env("DATABASE_URL", format!("postgres://dev@127.0.0.1:{PUERTO_TUNEL_BD}/{BD}"))
        .env("HOST", "127.0.0.1")
        .env("PORT", PUERTO_BACKEND.to_string())
        .env("CORS_ORIGINS", format!("http://127.0.0.1:{PUERTO_BACKEND},http://localhost:{PUERTO_BACKEND}"))
        .env("FRONTEND_DIST", dir.join("tareas-front"))
        // [por que] Solo avisos: con DEBUG el log crece y gasta disco y CPU.
        .env("RUST_LOG", "warn")
        .stdin(Stdio::null())
        .stdout(log.try_clone().map_err(|e| e.to_string())?)
        .stderr(log)
        .spawn()
        .map_err(|e| format!("no se pudo lanzar el backend: {e}"))?;
    registrar_hijo(app, hijo);
    Ok(())
}

// Copia de la BD de la 89 a la carpeta de respaldos del laptop (fuera de OneDrive).
fn respaldar() -> Result<(), String> {
    let carpeta = PathBuf::from(std::env::var("USERPROFILE").map_err(|e| e.to_string())?)
        .join("Respaldos")
        .join("PROYECTO-TASKS");
    fs::create_dir_all(&carpeta).map_err(|e| e.to_string())?;
    // [por que] El nombre lo genera la app, no entra de fuera; canonicalizar fija la carpeta real
    // y la comprobación deja el destino dentro de ella aunque cambie el formato del nombre.
    let carpeta = fs::canonicalize(&carpeta).map_err(|e| e.to_string())?;
    let nombre = format!("tareas-{}.dump", chrono::Local::now().format("%Y%m%d-%H%M%S"));
    let destino = carpeta.join(&nombre);
    if !destino.starts_with(&carpeta) {
        return Err("destino fuera de la carpeta de respaldos".into());
    }
    let salida = File::create(&destino).map_err(|e| e.to_string())?;
    let remoto = format!("pg_dump -Fc -h /var/run/postgresql -U dev {BD}");
    let ok = comando("ssh")
        .args(["-o", "BatchMode=yes", HOST_REMOTO, remoto.as_str()])
        .stdin(Stdio::null())
        .stdout(salida)
        .stderr(Stdio::null())
        .status()
        .map_err(|e| e.to_string())?
        .success();
    if !ok {
        let _ = fs::remove_file(&destino);
        return Err("pg_dump en la 89 falló".into());
    }
    rotar(&carpeta, MAX_RESPALDOS).map_err(|e| e.to_string())
}

// Mantiene los últimos `max` respaldos; el nombre lleva la fecha, así que el orden es cronológico.
fn rotar(carpeta: &Path, max: usize) -> std::io::Result<()> {
    let mut dumps: Vec<PathBuf> = fs::read_dir(carpeta)?
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.extension().and_then(OsStr::to_str) == Some("dump"))
        .collect();
    dumps.sort();
    let sobran = dumps.len().saturating_sub(max);
    for p in dumps.iter().take(sobran) {
        fs::remove_file(p)?;
    }
    Ok(())
}

fn comando(programa: impl AsRef<OsStr>) -> Command {
    let mut c = Command::new(programa);
    c.creation_flags(SIN_VENTANA);
    c
}

fn registrar_hijo(app: &tauri::AppHandle, hijo: Child) {
    app.state::<Hijos>().0.lock().unwrap_or_else(|e| e.into_inner()).push(hijo);
}

fn dir_app() -> Result<PathBuf, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    exe.parent().map(Path::to_path_buf).ok_or_else(|| "sin carpeta de la app".into())
}

// Línea en app.log junto al exe; sin consola no hay otro sitio donde ver los fallos.
fn registrar(dir: &Path, mensaje: &str) {
    use std::io::Write;
    if let Ok(mut f) = fs::OpenOptions::new().create(true).append(true).open(dir.join("app.log")) {
        let _ = writeln!(f, "{} {mensaje}", chrono::Local::now().format("%Y-%m-%d %H:%M:%S"));
    }
}

fn puerto_abierto(puerto: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], puerto));
    TcpStream::connect_timeout(&addr, Duration::from_millis(300)).is_ok()
}

fn esperar_puerto(puerto: u16, segundos: u64) -> Result<(), String> {
    let limite = Instant::now() + Duration::from_secs(segundos);
    while Instant::now() < limite {
        if puerto_abierto(puerto) {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(300));
    }
    Err(format!("el puerto {puerto} no respondió en {segundos} s"))
}

// Escribe el estado en la ventana de arranque (la pantalla de carga de web/).
fn mostrar_estado(app: &tauri::AppHandle, texto: &str) {
    if let (Some(ventana), Ok(json)) = (app.get_webview_window("main"), serde_json::to_string(texto)) {
        let _ = ventana.eval(&format!("document.getElementById('estado').textContent = {json}"));
    }
}
