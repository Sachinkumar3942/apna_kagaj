import { compressDocument } from './compression';

// --- 1. KEY DERIVATION ---
async function getPasswordKey(password: string) {
    const enc = new TextEncoder();
    return await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
}

export async function deriveKeyFromPassword(password: string, email: string): Promise<CryptoKey> {
    const keyMaterial = await getPasswordKey(password);
    const enc = new TextEncoder();
    const salt = enc.encode(email);

    return await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

// --- 2. ENCRYPTION (For Uploads) ---
export async function processAndEncryptDocument(file: File, key: CryptoKey): Promise<File> {
    // Compress first
    const compressedFile = await compressDocument(file);
    const arrayBuffer = await compressedFile.arrayBuffer();

    // Create Initialization Vector (IV)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encryptedContent = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        arrayBuffer
    );

    // Package IV and Ciphertext together
    const encryptedBlob = new Blob([iv, encryptedContent], { type: 'application/octet-stream' });

    return new File([encryptedBlob], `${file.name}.enc`, {
        type: 'application/octet-stream',
        lastModified: Date.now(),
    });
}

// --- 3. DECRYPTION (With Error Handling) ---
export async function decryptDocument(encryptedBlob: Blob, key: CryptoKey): Promise<string> {
    try {
        const arrayBuffer = await encryptedBlob.arrayBuffer();

        if (arrayBuffer.byteLength < 13) {
            throw new Error("File is too small or corrupted.");
        }

        const iv = arrayBuffer.slice(0, 12);
        const data = arrayBuffer.slice(12);

        // This is where the math fails if the PIN/Key is wrong
        const decryptedContent = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(iv) },
            key,
            data
        );

        const decryptedBlob = new Blob([decryptedContent], { type: 'image/jpeg' });
        return URL.createObjectURL(decryptedBlob);
    } catch (error: any) {
        // Detect if it's a "Wrong PIN" error
        if (error.name === "OperationError") {
            throw new Error("INVALID_KEY"); // Custom code for our UI to catch
        }
        throw new Error("DECRYPTION_FAILED");
    }
}