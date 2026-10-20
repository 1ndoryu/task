// PROYECTO TASKS de escritorio: arranca el backend local (glory-backend.exe) contra
// el PostgreSQL del propio equipo y muestra la app contra él. Todo el dato vive aquí:
// la 89 solo compila los .exe. Al cerrar la ventana se para lo que lanzó.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::ffi::OsStr;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};

use tauri::{Manager, RunEvent};

const PUERTO_BACKEND: u16 = 4190;
const MAX_RESPALDOS: usize = 14;
// [por que] Sin este flag Windows abre una consola por el backend.
const SIN_VENTANA: u32 = 0x0800_0000;
// [por que] Cada cuánto se comprueba que la BD sigue respondiendo.
const INTERVALO_VIGILANCIA: Duration = Duration::from_secs(10);
// [por que] Un fallo suelto de `/api/ready` puede ser un pico; reiniciar el backend
// por uno solo haría parpadear la app. Se exigen dos seguidos.
const FALLOS_PARA_RECUPERAR: u32 = 2;
// [por que] Si el PostgreSQL local está caído, reiniciar el backend no arregla nada:
// sin esta pausa el vigilante lo relanzaría cada 20 s indefinidamente.
const ESPERA_TRAS_RECUPERACION: Duration = Duration::from_secs(60);

/// Procesos lanzados por esta app, en ranuras con nombre; se paran al salir.
/// [por que] Con nombre y no en una lista porque el vigilante tiene que poder
/// matar y relanzar *solo* el backend al recuperarse.
#[derive(Default)]
struct Hijos {
    backend: Mutex<Option<Child>>,
}

/// Ajustes de la instalación (`config.env` junto al exe, fuera del repo: lleva la
/// contraseña de la BD). [por que] El lanzador no puede traerla compilada —el repo
/// es público para el gate— ni asumir una ruta de PostgreSQL que cambie de versión.
struct Ajustes {
    database_url: String,
    pg_dump: Option<PathBuf>,
}

impl Ajustes {
    fn leer(dir: &Path) -> Result<Self, String> {
        let texto = fs::read_to_string(dir.join("config.env"))
            .map_err(|e| format!("no se pudo leer config.env: {e}"))?;
        let valor = |clave: &str| {
            texto
                .lines()
                .filter(|l| !l.trim_start().starts_with('#'))
                .filter_map(|l| l.split_once('='))
                .find(|(k, _)| k.trim() == clave)
                .map(|(_, v)| v.trim().to_string())
        };
        let database_url = valor("DATABASE_URL")
            .ok_or("config.env no trae DATABASE_URL")?;
        Ok(Self {
            database_url,
            pg_dump: valor("PG_DUMP").map(PathBuf::from),
        })
    }
}

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
            // [por que] El backend no muere con la ventana por su cuenta: sin esto
            // queda vivo ocupando el puerto y el siguiente arranque falla.
            matar(&app.state::<Hijos>().backend);
        }
    });
}

fn arrancar(app: &tauri::AppHandle) -> Result<(), String> {
    let dir = dir_app()?;
    let ajustes = Ajustes::leer(&dir)?;
    // [por que] Si el puerto ya responde es otro backend (p. ej. exe-local): no usarlo a ciegas.
    if puerto_abierto(PUERTO_BACKEND) {
        return Err(format!("el puerto {PUERTO_BACKEND} ya está en uso; cierra el otro backend"));
    }
    mostrar_estado(app, "Arrancando el backend…");
    lanzar_backend(app, &dir, &ajustes)?;
    esperar_puerto(PUERTO_BACKEND, 30)?;

    // [por que] El respaldo corre aparte: un fallo no debe impedir abrir la app.
    let dir_respaldo = dir.clone();
    let ajustes_respaldo = Ajustes {
        database_url: ajustes.database_url.clone(),
        pg_dump: ajustes.pg_dump.clone(),
    };
    thread::spawn(move || {
        if let Err(e) = respaldar(&ajustes_respaldo) {
            registrar(&dir_respaldo, &format!("respaldo: {e}"));
        }
    });

    let url = format!("http://127.0.0.1:{PUERTO_BACKEND}/");
    let js = format!("location.replace({})", serde_json::to_string(&url).map_err(|e| e.to_string())?);
    app.get_webview_window("main")
        .ok_or("no existe la ventana principal")?
        .eval(&js)
        .map_err(|e| e.to_string())?;

    /* [20AA-1] [por que] El backend abre su pool de SQLx una sola vez y no lo
     * vigila nadie: si PostgreSQL se reinicia o se cae la conexión, el pool queda
     * trabado con conexiones fantasma y TODA petición falla hasta reiniciar el
     * proceso a mano; la app se quedaba muda y en la landing (2026-10-20). El
     * vigilante detecta el corte y rehace el backend sin intervención. */
    let vigilante = app.clone();
    thread::spawn(move || vigilar(vigilante));
    Ok(())
}

/// Vigila que el backend siga alcanzando la BD; si no, lo rehace.
/// [por que] El sondeo es `/api/ready`, que hace un `ping` real a PostgreSQL: es
/// el único test que ve el caso difícil —el pool trabado—, que un simple «¿el
/// puerto responde?» no distingue (el listener del backend sigue abierto).
fn vigilar(app: tauri::AppHandle) {
    let mut fallos = 0u32;
    loop {
        thread::sleep(INTERVALO_VIGILANCIA);
        // La ventana cerrada es la señal de salida; el proceso entero se va detrás.
        if app.get_webview_window("main").is_none() {
            return;
        }
        if readiness_ok() {
            fallos = 0;
            continue;
        }
        fallos += 1;
        let dir = dir_app().unwrap_or_default();
        registrar(&dir, &format!("la BD no responde ({fallos}/{FALLOS_PARA_RECUPERAR})"));
        if fallos < FALLOS_PARA_RECUPERAR {
            continue;
        }
        fallos = 0;
        mostrar_estado(&app, "Reconectando con la base de datos…");
        match recuperar(&app) {
            Ok(()) => {
                registrar(&dir, "recuperado: backend reiniciado");
                recargar(&app);
            }
            Err(e) => {
                registrar(&dir, &format!("la recuperación falló: {e}"));
                // [por que] Si la BD está caída de verdad, insistir cada 20 s no
                // arregla nada y llena el log: se da un respiro y se reintenta.
                thread::sleep(ESPERA_TRAS_RECUPERACION);
            }
        }
    }
}

/// Rehace el backend. [por que] Su pool está trabado con conexiones muertas y
/// ninguna se recupera sola; solo un proceso nuevo abre un pool sano. Las sesiones
/// viven en la BD y las cookies en el webview, así que al recargar la usuaria
/// sigue dentro.
fn recuperar(app: &tauri::AppHandle) -> Result<(), String> {
    let dir = dir_app()?;
    let ajustes = Ajustes::leer(&dir)?;
    matar(&app.state::<Hijos>().backend);
    esperar_puerto_cerrado(PUERTO_BACKEND, 10);
    lanzar_backend(app, &dir, &ajustes)?;
    esperar_puerto(PUERTO_BACKEND, 30)
}

/// ¿El backend contesta `/api/ready` con 200? Petición HTTP a mano: el lanzador
/// no lleva cliente HTTP y para una línea de estado no hace falta uno.
fn readiness_ok() -> bool {
    let Ok(mut flujo) = TcpStream::connect_timeout(
        &SocketAddr::from(([127, 0, 0, 1], PUERTO_BACKEND)),
        Duration::from_millis(500),
    ) else {
        return false;
    };
    // [por que] El pool agotado tarda `acquire_timeout` (5 s) en rendirse: sin
    // margen, un corte se leería como «no respondió» y no como 503.
    let _ = flujo.set_read_timeout(Some(Duration::from_secs(8)));
    if flujo
        .write_all(format!("GET /api/ready HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n").as_bytes())
        .is_err()
    {
        return false;
    }
    let mut trozo = [0u8; 32];
    match flujo.read(&mut trozo) {
        Ok(n) => {
            let inicio = String::from_utf8_lossy(&trozo[..n]);
            inicio.starts_with("HTTP/1.1 200") || inicio.starts_with("HTTP/1.0 200")
        }
        Err(_) => false,
    }
}

fn recargar(app: &tauri::AppHandle) {
    if let Some(ventana) = app.get_webview_window("main") {
        let _ = ventana.eval("location.reload()");
    }
}

fn lanzar_backend(app: &tauri::AppHandle, dir: &Path, ajustes: &Ajustes) -> Result<(), String> {
    // [por que] Variables explícitas: el .env no viaja al equipo. Solo loopback, sin nada público.
    let log = File::create(dir.join("backend.log")).map_err(|e| e.to_string())?;
    let hijo = comando(dir.join("glory-backend.exe"))
        .current_dir(dir)
        .env("DATABASE_URL", &ajustes.database_url)
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
    registrar_hijo(&app.state::<Hijos>().backend, hijo);
    Ok(())
}

// Copia de la BD local a la carpeta de respaldos del laptop (fuera de OneDrive).
// [por que] Con el dato en el propio equipo, este volcado es la ÚNICA copia que
// no vive en el mismo disco que el original: por eso corre en cada arranque.
fn respaldar(ajustes: &Ajustes) -> Result<(), String> {
    let pg_dump = ajustes.pg_dump.as_deref()
        .ok_or("config.env no trae PG_DUMP; sin ruta no hay respaldo")?;
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
    /* [por que] pg_dump escribe a un temporal y se renombra al final: en Windows
     * un volcado binario por stdout redirecto puede salir con la traducción de
     * saltos de línea, y además uno cortado no debe quedar con nombre válido. La
     * conexión va como URI —la misma de `DATABASE_URL`— para no repetir usuario,
     * contraseña ni nombre de base en dos sitios. */
    let temporal = carpeta.join(format!(".{nombre}.tmp"));
    let ok = comando(pg_dump)
        .args(["-Fc", "-d", &ajustes.database_url, "-f"])
        .arg(&temporal)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map_err(|e| e.to_string())?
        .success();
    if !ok {
        let _ = fs::remove_file(&temporal);
        return Err("pg_dump local falló".into());
    }
    fs::rename(&temporal, &destino).map_err(|e| e.to_string())?;
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

fn registrar_hijo(slot: &Mutex<Option<Child>>, hijo: Child) {
    if let Some(mut previo) = slot.lock().unwrap_or_else(|e| e.into_inner()).replace(hijo) {
        // [por que] Una ranura con un hijo vivo a quien se pisa quedaría huérfano.
        let _ = previo.kill();
        let _ = previo.wait();
    }
}

/// Para el proceso de una ranura y cosecha su salida.
/// [por que] Sin `wait` el hijo queda zombi y el puerto tarda en soltarse, así que
/// el relanzamiento inmediato chocaría con el listener del muerto.
fn matar(slot: &Mutex<Option<Child>>) {
    if let Some(mut hijo) = slot.lock().unwrap_or_else(|e| e.into_inner()).take() {
        let _ = hijo.kill();
        let _ = hijo.wait();
    }
}

fn dir_app() -> Result<PathBuf, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    exe.parent().map(Path::to_path_buf).ok_or_else(|| "sin carpeta de la app".into())
}

// Línea en app.log junto al exe; sin consola no hay otro sitio donde ver los fallos.
fn registrar(dir: &Path, mensaje: &str) {
    if let Ok(mut f) = fs::OpenOptions::new().create(true).append(true).open(dir.join("app.log")) {
        let _ = writeln!(f, "{} {mensaje}", chrono::Local::now().format("%Y-%m-%d %H:%M:%S"));
    }
}

fn puerto_abierto(puerto: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], puerto));
    TcpStream::connect_timeout(&addr, Duration::from_millis(300)).is_ok()
}

fn esperar_puerto_cerrado(puerto: u16, segundos: u64) {
    let limite = Instant::now() + Duration::from_secs(segundos);
    while Instant::now() < limite && puerto_abierto(puerto) {
        thread::sleep(Duration::from_millis(200));
    }
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
