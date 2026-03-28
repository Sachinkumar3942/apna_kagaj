import imageCompression from 'browser-image-compression';

export async function compressDocument(file: File): Promise<File> {
    const options = {
        maxSizeMB: 0.5, // 500KB target
        maxWidthOrHeight: 1920,
        useWebWorker: true,
    };

    try {
        const compressedBlob = await imageCompression(file, options);
        return new File([compressedBlob], file.name, {
            type: compressedBlob.type,
            lastModified: Date.now(),
        });
    } catch (error) {
        console.error("Error compressing document:", error);
        // Failsafe: return original if compression fails so the upload isn't blocked entirely
        return file;
    }
}