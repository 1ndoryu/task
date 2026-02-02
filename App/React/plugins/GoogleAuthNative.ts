import { registerPlugin } from '@capacitor/core';

export interface GoogleAuthNativePlugin {
  initialize(options?: { serverClientId?: string }): Promise<void>;
  signIn(): Promise<{
    email: string;
    displayName: string;
    givenName: string;
    familyName: string;
    photoUrl: string | null;
    id: string;
    serverAuthCode: string;
  }>;
  signOut(): Promise<void>;
}

const GoogleAuthNative = registerPlugin<GoogleAuthNativePlugin>('GoogleAuthNative');

export default GoogleAuthNative;
