"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { deriveKeyFromPassword, processAndEncryptDocument, decryptDocument } from '@/lib/cryptoSetup';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import DocumentCard from '@/components/DocumentCard'; // Make sure this is imported!

const DOC_TYPES = ["Aadhar", "PAN", "Passport", "Voter ID", "Driving License", "Passbook", "Photo", "Other"];

export default function Dashboard() {
    const [files, setFiles] = useState<{ [key: string]: File | null }>({});
    const [uploadedDocs, setUploadedDocs] = useState<{ [key: string]: string }>({}); // Tracks files already in the vault
    const [isUploading, setIsUploading] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [pinInput, setPinInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const router = useRouter();
    const encryptionKey = useAuthStore((state) => state.encryptionKey);
    const setEncryptionKey = useAuthStore((state) => state.setEncryptionKey);

    useEffect(() => {
        const checkAuthAndFetchDocs = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setUserEmail(user.email || '');
            setUserId(user.id);

            // Fetch the list of files already in this user's folder
            const { data, error } = await supabase.storage.from('documents').list(`${user.id}/`);
            if (data) {
                const foundDocs: { [key: string]: string } = {};
                data.forEach(file => {
                    // Extract "Aadhar" from "Aadhar-12345.enc"
                    const type = file.name.split('-')[0];
                    foundDocs[type] = `${user.id}/${file.name}`;
                });
                setUploadedDocs(foundDocs);
            }
        };
        checkAuthAndFetchDocs();
    }, [router]);

    const unlockVault = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userEmail) return;

        try {
            setIsProcessing(true); // Add a loading state for the button
            const key = await deriveKeyFromPassword(pinInput, userEmail);

            // TEST DECRYPTION: Try to fetch at least one file to verify the key
            const { data } = await supabase.storage.from('documents').list(`${userId}/`, { limit: 1 });

            if (data && data.length > 0) {
                const testFile = await supabase.storage.from('documents').download(`${userId}/${data[0].name}`);
                if (testFile.data) {
                    await decryptDocument(testFile.data, key); // This will throw if key is wrong
                }
            }

            setEncryptionKey(key); // Key is verified, save to Zustand
        } catch (err: any) {
            alert("Incorrect PIN/Password. Please try again.");
            setPinInput(""); // Clear the input
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileChange = (type: string, file: File | null) => {
        setFiles(prev => ({ ...prev, [type]: file }));
    };

    const uploadDocs = async () => {
        if (!encryptionKey || !userId) return alert("Vault is locked.");
        setIsUploading(true);

        for (const type of DOC_TYPES) {
            const originalFile = files[type];
            if (originalFile) {
                try {
                    const securedFile = await processAndEncryptDocument(originalFile, encryptionKey);
                    const filePath = `${userId}/${type}-${Date.now()}.enc`;

                    const { error } = await supabase.storage.from('documents').upload(filePath, securedFile);
                    if (error) {
                        console.error(`Error uploading ${type}:`, error.message);
                    } else {
                        // Update the UI immediately to show the new file
                        setUploadedDocs(prev => ({ ...prev, [type]: filePath }));
                    }
                } catch (err) {
                    console.error(`Failed to process ${type}`, err);
                }
            }
        }
        alert("Encrypted upload complete!");
        setFiles({}); // Clear selected files
        setIsUploading(false);
    };

    // --- VAULT UNLOCK SCREEN ---
    if (!encryptionKey) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <form onSubmit={unlockVault} className="p-8 bg-white border rounded-xl shadow-sm w-96 text-center">
                    <h2 className="text-xl font-bold mb-2">Unlock Your Vault</h2>
                    <p className="text-sm text-gray-500 mb-6">Enter your password or Vault PIN to decrypt your files.</p>
                    <input
                        type="password" placeholder="Password / PIN" required
                        className="w-full mb-4 p-3 border rounded-lg"
                        onChange={(e) => setPinInput(e.target.value)}
                    />
                    <button
                        disabled={isProcessing}
                        className={`w-full text-white font-medium py-3 rounded-lg ${isProcessing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {isProcessing ? 'Decrypting...' : 'Decrypt Vault'}
                    </button>
                </form>
            </div>
        );
    }

    // --- MAIN DASHBOARD ---
    return (
        <div className="p-10 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold">Identity Verification</h2>
                    <p className="text-green-600 font-medium text-sm mt-1">✓ Vault Decrypted & Secured</p>
                </div>
                <button
                    onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}
                    className="px-4 py-2 border rounded text-sm hover:bg-gray-100"
                >
                    Logout
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {DOC_TYPES.map((doc) => (
                    <div key={doc} className="flex flex-col gap-4">
                        {uploadedDocs[doc] && userId ? (
                            <DocumentCard
                                docType={doc}
                                filePath={uploadedDocs[doc]}
                                userId={userId}
                                onDelete={(deletedType) => {
                                    setUploadedDocs(prev => {
                                        const newDocs = { ...prev };
                                        delete newDocs[deletedType];
                                        return newDocs;
                                    });
                                }}
                                onUpdate={(updatedType, newPath) => {
                                    setUploadedDocs(prev => ({ ...prev, [updatedType]: newPath }));
                                }}
                            />
                        ) : (
                            <div className="p-5 border rounded-xl bg-white shadow-sm h-full flex flex-col justify-center">
                                <label className="block font-semibold mb-3">{doc}</label>
                                <input
                                    type="file" accept="image/*"
                                    onChange={(e) => handleFileChange(doc, e.target.files?.[0] || null)}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Only show the upload button if they have actually selected new files to upload */}
            {Object.values(files).some(file => file !== null) && (
                <button
                    onClick={uploadDocs}
                    disabled={isUploading}
                    className={`mt-8 px-8 py-3 text-white font-medium rounded-lg w-full md:w-auto shadow-sm ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                >
                    {isUploading ? 'Encrypting & Uploading...' : 'Submit New Documents Securely'}
                </button>
            )}
        </div>
    );
}