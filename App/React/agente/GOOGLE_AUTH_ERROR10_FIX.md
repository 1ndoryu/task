# 🔥 SOLUCIÓN DEFINITIVA: Error 10 Google Auth en Capacitor (APK Debug)

**CREADO:** 2 de febrero de 2026  
**CONTEXTO:** APK para pruebas internas (sin publicar en Play Store)  
**ERROR:** `Something went wrong, code: 10` - Developer Error

---

## 📋 ENTENDER EL PROBLEMA

### ¿Qué es el Error 10?
Google devuelve Error 10 cuando:
1. El **SHA-1** de la APK no coincide con Google Cloud Console
2. El **Package Name** no coincide
3. El **Client ID** usado es incorrecto (Web en lugar de Android)
4. Hay **conflicto entre Firebase y Google Cloud Console**

### Firebase vs Google Cloud Console (LA CONFUSIÓN)

| Herramienta | Propósito | ¿Es necesaria? |
|-------------|-----------|----------------|
| **Google Cloud Console** | Crear OAuth Client IDs (Android, Web, iOS) | ✅ **OBLIGATORIO** |
| **Firebase Console** | Atajo para gestionar configs (opcional) | ❌ **OPCIONAL** |

**IMPORTANTE:** Firebase Console es solo una capa visual sobre Google Cloud Console. Todo termina en el mismo proyecto de GCP.

---

## ✅ SOLUCIÓN PASO A PASO

### **PASO 1: Verificar SHA-1 de tu Debug Keystore**

```powershell
# Ejecutar en PowerShell (Windows)
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

**BUSCAR ESTA LÍNEA:**
```
SHA1: 49:3D:C2:05:E7:F3:FD:21:F7:EA:AD:E9:75:35:CB:50:B5:2F:7A:30
```
📝 **COPIA ESTE SHA-1** (será diferente en tu máquina)

---

### **PASO 2: Limpiar Credenciales Anteriores en Google Cloud**

1. Ir a: https://console.cloud.google.com/apis/credentials
2. **ELIMINAR** todos los OAuth Client IDs de Android anteriores
3. Dejar solo el **Web Client ID** (necesario para backend)

---

### **PASO 3: Crear NUEVO Android OAuth Client (Limpio)**

#### 3.1. En Google Cloud Console

1. Click en **+ CREATE CREDENTIALS** → **OAuth client ID**
2. Tipo: **Android**
3. **Name:** `Tasks Android Debug` (o cualquier nombre descriptivo)
4. **Package name:** `com.taskNakomi.app`  
   ⚠️ **DEBE COINCIDIR 100% con `capacitor.config.json` → `appId`**
5. **SHA-1 certificate fingerprint:** `TU_SHA1_DEL_PASO_1`
6. Click **CREATE**

#### 3.2. Copiar el Client ID Generado

```
Ejemplo: 90767087281-XXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com
```

---

### **PASO 4: Configurar `capacitor.config.json` (SIMPLIFICADO)**

```json
{
    "appId": "com.taskNakomi.app",
    "appName": "Tasks",
    "webDir": "public",
    "server": {
        "url": "https://task.nakomi.studio/",
        "cleartext": true
    },
    "plugins": {
        "GoogleAuth": {
            "scopes": ["profile", "email"],
            "androidClientId": "TU_NUEVO_ANDROID_CLIENT_ID_DEL_PASO_3.apps.googleusercontent.com",
            "forceCodeForRefreshToken": false
        }
    }
}
```

**CAMBIOS CLAVE:**
- ❌ **Eliminar:** `serverClientId` (se usa solo si necesitas backend auth code)
- ❌ **Eliminar:** `grantOfflineAccess` (conflicto con forceCode)
- ✅ **Mantener:** Solo `androidClientId` y `scopes`

---

### **PASO 5: Actualizar Código de Inicio de Sesión**

#### authService.ts (o donde llames GoogleAuth)

```typescript
/*
 * Inicio de sesión Google (Android nativo)
 * IMPORTANTE: No necesita initialize() con config en Capacitor.
 * Lee automáticamente de capacitor.config.json
 */
export const googleLogin = async (): Promise<UserData> => {
  try {
    // Solo llamar signIn(), sin initialize()
    const googleUser = await GoogleAuth.signIn();
    
    return {
      id: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      imageUrl: googleUser.imageUrl || '',
      idToken: googleUser.authentication.idToken,
      accessToken: googleUser.authentication.accessToken
    };
  } catch (error) {
    // Error 10 = configuración incorrecta
    // Error 12501 = usuario canceló
    console.error('Google Sign In Error:', error);
    throw error;
  }
};
```

**❌ NO HACER (Error común):**
```typescript
// INCORRECTO: No necesitas initialize() en Android si tienes capacitor.config.json
await GoogleAuth.initialize({
  clientId: 'xxxx' // Esto sobreescribe y causa conflictos
});
```

---

### **PASO 6: Sincronizar Capacitor y Reconstruir**

```powershell
# 1. Sincronizar cambios de config
npx cap sync android

# 2. Limpiar build anterior (IMPORTANTE)
cd android
.\gradlew clean

# 3. Compilar APK Debug
.\gradlew assembleDebug

# APK generado en:
# android/app/build/outputs/apk/debug/app-debug.apk
```

---

### **PASO 7: Instalar y Probar en Dispositivo Real**

```powershell
# Instalar APK en dispositivo conectado por USB
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Ver logs en tiempo real (para debug)
adb logcat | Select-String "GoogleAuth"
```

**TESTING:**
1. Abrir app en el teléfono
2. Click en botón "Iniciar sesión con Google"
3. **DEBE APARECER:** Selector de cuentas de Google del sistema
4. Seleccionar cuenta
5. **ÉXITO:** Debe devolver datos del usuario sin Error 10

---

## 🚨 CHECKLIST ANTI-ERROR 10

Antes de compilar, verificar:

- [ ] **SHA-1 correcto:** El del debug.keystore de TU máquina
- [ ] **Package coincide:** `com.taskNakomi.app` en TODOS lados
- [ ] **Client ID correcto:** Usar el de tipo "Android" (no Web)
- [ ] **Sincronizado:** `npx cap sync android` ejecutado después de cambios
- [ ] **Clean build:** `gradlew clean` antes de recompilar
- [ ] **No hay `initialize()`** sobrescribiendo clientId en código

---

## 🔍 DIAGNÓSTICO SI SIGUE FALLANDO

### Ver logs detallados en logcat:

```powershell
adb logcat *:E | Select-String -Pattern "GoogleAuth|OAuth|SignIn"
```

### Errores comunes y su significado:

| Código | Significado | Solución |
|--------|-------------|----------|
| **10** | Developer error (config incorrecta) | Verificar SHA-1, Package, Client ID |
| **12501** | Usuario canceló | Normal (no es error) |
| **7** | Network error | Verificar internet del dispositivo |

---

## 📦 ARCHIVOS CLAVE A REVISAR

```
App/React/
├── capacitor.config.json         # Config principal de Capacitor
├── android/
│   ├── app/build.gradle           # Package name debe coincidir
│   └── app/src/main/AndroidManifest.xml  # Verificar package
```

### Verificar package en build.gradle:

```gradle
// android/app/build.gradle
android {
    namespace "com.taskNakomi.app"  // ✅ DEBE COINCIDIR
    defaultConfig {
        applicationId "com.taskNakomi.app"  // ✅ DEBE COINCIDIR
    }
}
```

---

## ❓ FAQ

### ¿Necesito Firebase Console?
**NO.** Es opcional. Solo necesitas Google Cloud Console para OAuth Client IDs.

### ¿Qué pasa con `google-services.json`?
**NO LO NECESITAS** para Google Auth básico. Solo si usas Firebase Analytics/Crashlytics.

### ¿Puedo usar el mismo Client ID en Debug y Release?
**NO.** Cada keystore (debug/release) tiene SHA-1 diferente = necesitas 2 Client IDs.

### ¿Cómo testear sin publicar en Play Store?
Tu APK debug funciona perfectamente sin publicar. Solo asegúrate de usar el SHA-1 del debug keystore.

---

## 🎯 RESUMEN ULTRA-RÁPIDO

1. **Obtener SHA-1:** `keytool -list` del debug.keystore
2. **Google Cloud Console:** Crear OAuth Android con SHA-1 + Package
3. **capacitor.config.json:** Solo `androidClientId` del paso 2
4. **Código:** NO usar `initialize()` con clientId
5. **Build:** `npx cap sync` → `gradlew clean` → `gradlew assembleDebug`
6. **Instalar:** `adb install` en dispositivo real
7. **Probar:** Debe abrir selector de cuentas nativo sin Error 10

---

## ✅ SIGUIENTE PASO DESPUÉS DE RESOLVER

Una vez funcione Google Auth en debug:
1. Marcar como completado en `ROADMAP_TASK.md`
2. Proceder con configuración de OAuth Consent Screen (requiere políticas legales)
3. Eventualmente crear Release Keystore y nuevo Client ID para producción

---

**DOCUMENTADO POR:** GitHub Copilot  
**FUENTES:** Issues #380, #371 de CapacitorGoogleAuth + Docs oficiales Google
