"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { decryptDocument, processAndEncryptDocument } from '@/lib/cryptoSetup';
import { useAuthStore } from '@/store/useAuthStore';

interface DocumentCardProps {
    docType: string;
    filePath: string;
    userId: string;
    onDelete: (docType: string) => void;
    onUpdate: (docType: string, newPath: string) => void;
}

export default function DocumentCard({ docType, filePath, userId, onDelete, onUpdate }: DocumentCardProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false); // For update/delete loading states
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const encryptionKey = useAuthStore((state) => state.encryptionKey);

    useEffect(() => {
        const fetchAndDecrypt = async () => {
            if (!encryptionKey) {
                setError("Vault locked. Missing key.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const { data, error: downloadError } = await supabase.storage.from('documents').download(filePath);
                if (downloadError) throw downloadError;

                if (data) {
                    const decryptedUrl = await decryptDocument(data, encryptionKey);
                    setImageUrl(decryptedUrl);
                }
            } catch (err: any) {
                console.error("Error fetching document:", err);
                setError("Failed to load or decrypt.");
            } finally {
                setLoading(false);
            }
        };

        fetchAndDecrypt();

        return () => {
            if (imageUrl) URL.revokeObjectURL(imageUrl);
        };
    }, [filePath, encryptionKey]);

    // --- ACTIONS ---

    const handleDownload = () => {
        if (!imageUrl) return;
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = `${docType}-GigSahay.jpg`; // Defaulting to jpg format
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete your ${docType}?`)) return;
        setIsProcessing(true);

        const { error } = await supabase.storage.from('documents').remove([filePath]);
        if (error) {
            alert("Failed to delete: " + error.message);
            setIsProcessing(false);
        } else {
            onDelete(docType); // Tell the Dashboard to remove it from UI
        }
    };

    const handleUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !encryptionKey) return;

        setIsProcessing(true);
        try {
            // 1. Encrypt new file
            const securedFile = await processAndEncryptDocument(file, encryptionKey);
            const newFilePath = `${userId}/${docType}-${Date.now()}.enc`;

            // 2. Upload new file
            const { error: uploadError } = await supabase.storage.from('documents').upload(newFilePath, securedFile);
            if (uploadError) throw uploadError;

            // 3. Delete old file to save space
            await supabase.storage.from('documents').remove([filePath]);

            // 4. Update Dashboard UI
            onUpdate(docType, newFilePath);
        } catch (err) {
            console.error("Update failed:", err);
            alert("Failed to update document.");
            setIsProcessing(false);
        }
    };

    return (
        <>
            <div className="p-4 border rounded-xl bg-white shadow-sm flex flex-col relative">
                <h3 className="font-semibold mb-3 text-gray-800">{docType}</h3>

                {/* Image Display Area */}
                <div
                    className="w-full h-40 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer group relative"
                    onClick={() => imageUrl && setIsFullscreen(true)}
                >
                    {loading || isProcessing ? (
                        <span className="text-sm text-gray-400 font-medium animate-pulse">
                            {isProcessing ? 'Processing...' : 'Decrypting...'}
                        </span>
                    ) : error ? (
                        <span className="text-sm text-red-500 font-medium">{error}</span>
                    ) : imageUrl ? (
                        <>
                            <img src={imageUrl} alt={docType} className="object-cover w-full h-full transition-transform group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white text-sm font-medium">Click to Expand</span>
                            </div>
                        </>
                    ) : (
                        <span className="text-sm text-gray-400">Not available</span>
                    )}
                </div>

                {/* Action Buttons */}
                {!loading && !error && imageUrl && (
                    <div className="flex justify-between items-center mt-3 pt-3 border-t">
                        <button onClick={handleDownload} disabled={isProcessing} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                            Download
                        </button>
                        <div className="flex gap-3">
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleUpdate}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isProcessing}
                                className="text-xs font-medium text-gray-600 hover:text-gray-900"
                            >
                                Update
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isProcessing}
                                className="text-xs font-medium text-red-500 hover:text-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Fullscreen Modal */}
            {isFullscreen && imageUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
                    <button
                        onClick={() => setIsFullscreen(false)}
                        className="absolute top-6 right-6 text-white text-4xl font-bold hover:text-gray-300 transition-colors z-50"
                        aria-label="Close fullscreen"
                    >
                        &times;
                    </button>
                    <img
                        src={imageUrl}
                        alt={docType}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    />
                </div>
            )}
        </>
    );
}