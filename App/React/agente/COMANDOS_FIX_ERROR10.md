# 🚀 COMANDOS RÁPIDOS - Arreglar Error 10 Google Auth

## 1️⃣ Verificar tu SHA-1 actual

```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android | Select-String "SHA1:"
```

**COPIAR EL RESULTADO**

---

## 2️⃣ Crear nuevo OAuth Client en Google Cloud Console

1. Ir a: https://console.cloud.google.com/apis/credentials
2. **ELIMINAR** el Android Client ID anterior
3. **CREATE CREDENTIALS** → **OAuth client ID**
4. Application type: **Android**
5. Name: `Tasks Android Debug`
6. Package name: `com.taskNakomi.app`
7. SHA-1: **PEGAR EL DEL PASO 1**
8. **CREATE**
9. **COPIAR EL CLIENT ID GENERADO**

---

## 3️⃣ Actualizar strings.xml con el NUEVO Client ID

**Archivo:** `android/app/src/main/res/values/strings.xml`

```xml
<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">Tasks</string>
    <string name="title_activity_main">Tasks</string>
    <string name="package_name">com.taskNakomi.app</string>
    <string name="custom_url_scheme">com.taskNakomi.app</string>
    <!-- ⚠️ CAMBIAR POR TU ANDROID CLIENT ID -->
    <string name="server_client_id">YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com</string>
</resources>
```

---

## 4️⃣ Sincronizar y Compilar

```powershell
# Navegar al directorio del proyecto React
cd "C:\Users\1u\Local Sites\glorybuilder\app\public\wp-content\themes\glory\App\React"

# Sincronizar Capacitor
npx cap sync android

# Ir a carpeta Android
cd android

# Limpiar build anterior (OBLIGATORIO)
.\gradlew clean

# Compilar APK Debug
.\gradlew assembleDebug

# APK generado en: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 5️⃣ Instalar en dispositivo

```powershell
# Con dispositivo conectado por USB (activar Depuración USB)
adb devices

# Instalar APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Ver logs en tiempo real
adb logcat | Select-String "GoogleAuth"
```

---

## 6️⃣ Probar en la app

1. Abrir app en el teléfono
2. Ir a Login
3. Click en "Iniciar sesión con Google"
4. **DEBE ABRIR:** Selector de cuentas de Google del sistema
5. Seleccionar cuenta
6. ✅ **ÉXITO:** Debe iniciar sesión sin Error 10

---

## 🔧 Si sigue fallando

### Ver error exacto en logcat:

```powershell
adb logcat *:E | Select-String -Pattern "GoogleAuth|OAuth|SignIn|Error"
```

### Verificar que todo coincide:

```powershell
# Ver SHA-1 del keystore
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android

# Ver package en AndroidManifest.xml
Select-String -Path "android/app/src/main/AndroidManifest.xml" -Pattern "package="

# Ver strings.xml
Get-Content "android/app/src/main/res/values/strings.xml"
```

---

## ✅ CHECKLIST FINAL

Antes de recompilar, verificar:

- [ ] SHA-1 del debug.keystore copiado correctamente
- [ ] OAuth Client en Google Cloud creado con ese SHA-1
- [ ] Package name `com.taskNakomi.app` en TODOS lados
- [ ] `strings.xml` tiene el ANDROID Client ID (no Web)
- [ ] `capacitor.config.json` sin `androidClientId` ni `serverClientId`
- [ ] `npx cap sync android` ejecutado
- [ ] `gradlew clean` antes de compilar
- [ ] Dispositivo real (no emulador) para pruebas

---

## 📝 IMPORTANTE

**¿Por qué borramos los Client IDs de `capacitor.config.json`?**

Porque estamos usando `strings.xml` para Android. Si pones el Client ID en ambos sitios, Capacitor se confunde. La prioridad es:

1. `capacitor.config.json` → `androidClientId` (ELIMINADO)
2. `strings.xml` → `server_client_id` ✅ (USANDO ESTE)

**Mantener solo UNO para evitar conflictos.**

---

## 🎯 SOLUCIÓN ALTERNATIVA (Si strings.xml no funciona)

Puedes usar solo `capacitor.config.json`:

```json
{
  "plugins": {
    "GoogleAuth": {
      "scopes": ["profile", "email"],
      "androidClientId": "TU_NUEVO_ANDROID_CLIENT_ID.apps.googleusercontent.com",
      "forceCodeForRefreshToken": true
    }
  }
}
```

Y **ELIMINAR** `server_client_id` de `strings.xml`.

Pero NO uses ambos a la vez.
