import { create } from 'zustand';

interface AuthState {
    encryptionKey: CryptoKey | null;
    setEncryptionKey: (key: CryptoKey | null) => void;
    lockVault: () => void; // Utility to wipe the key from memory
}

export const useAuthStore = create<AuthState>((set) => ({
    encryptionKey: null,

    // Call this when the user logs in or enters their Vault PIN
    setEncryptionKey: (key) => set({ encryptionKey: key }),

    // Call this on logout or when the session times out
    lockVault: () => set({ encryptionKey: null }),
}));