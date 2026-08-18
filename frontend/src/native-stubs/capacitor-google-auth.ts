/* Stub para @codetrix-studio/capacitor-google-auth (solo plataforma nativa
 * Capacitor). El login web usa credenciales contra el backend Rust; el
 * OAuth de Google se migra en Fase 3 del plan. */
export const GoogleAuth = {
    initialize: async (): Promise<void> => {},
    signIn: async (): Promise<never> => {
        throw new Error('GoogleAuth no disponible en web');
    },
    signOut: async (): Promise<void> => {},
};

export default GoogleAuth;
