/* Declaraciones para modulos solo nativos (Capacitor/Tauri) que en web se
 * resuelven como stubs vacios en vite (ver pluginModulosExternos en
 * vite.config.ts). Solo existen para satisfacer el type-check. */
declare module '@capacitor/local-notifications' {
    export const LocalNotifications: Record<string, never>;
    export default Record<string, never>;
}

declare module '@tauri-apps/plugin-notification' {
    export const isPermissionGranted: () => Promise<boolean>;
    export const sendNotification: (options: unknown) => Promise<void>;
    export const requestPermission: () => Promise<boolean>;
}

declare module '@tauri-apps/plugin-fs' {
    const _default: Record<string, never>;
    export default _default;
}

declare module '@tauri-apps/plugin-shell' {
    const _default: Record<string, never>;
    export default _default;
}

declare module '@tauri-apps/api/app' {
    export const getVersion: () => Promise<string>;
    export const getName: () => Promise<string>;
}
