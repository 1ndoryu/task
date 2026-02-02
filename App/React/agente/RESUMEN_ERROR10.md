# ⚡ RESUMEN EJECUTIVO - Error 10 Google Auth

## EL PROBLEMA

Tienes el **Web Client ID** en `strings.xml` cuando debería ser el **Android Client ID**.

---

## LA SOLUCIÓN EN 3 PASOS

### 1. Obtener SHA-1 de tu keystore

```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android | Select-String "SHA1:"
```

### 2. Crear nuevo Android OAuth Client

- https://console.cloud.google.com/apis/credentials
- **Borrar** el Android Client anterior
- **Crear nuevo** con:
  - Package: `com.taskNakomi.app`
  - SHA-1: (del paso 1)
- **Copiar** el Client ID generado

### 3. Actualizar y compilar

**Editar:** `android/app/src/main/res/values/strings.xml`

```xml
<string name="server_client_id">YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com</string>
```

**Compilar:**
```powershell
cd "C:\Users\1u\Local Sites\glorybuilder\app\public\wp-content\themes\glory\App\React"
npx cap sync android
cd android
.\gradlew clean assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## DOCUMENTACIÓN COMPLETA

- **Explicación detallada:** `GOOGLE_AUTH_ERROR10_FIX.md`
- **Comandos completos:** `COMANDOS_FIX_ERROR10.md`
- **Progreso:** `ROADMAP_TASK.md` (Fase 13.3)

---

## FIREBASE vs GOOGLE CLOUD CONSOLE

**RESPUESTA CORTA:** Solo necesitas **Google Cloud Console**.

Firebase es opcional (solo si quieres usar `google-services.json` para leer configs automáticamente).

**Para testing debug:** Google Cloud Console es suficiente.
