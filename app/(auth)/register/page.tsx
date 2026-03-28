"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { deriveKeyFromPassword } from '@/lib/cryptoSetup';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const setEncryptionKey = useAuthStore((state) => state.setEncryptionKey);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signUp({ email, password });

        if (error) {
            alert(error.message);
            setLoading(false);
            return;
        }

        // Immediately derive key so they can use the dashboard right away
        const key = await deriveKeyFromPassword(password, email);
        setEncryptionKey(key);

        alert("Account created successfully!");
        router.push('/dashboard');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="p-8 bg-white border rounded-xl shadow-sm w-full max-w-md">
                <h1 className="text-2xl font-bold mb-2 text-center">Create your Vault</h1>
                <p className="text-sm text-gray-500 mb-6 text-center">Your password acts as your master encryption key. Do not lose it.</p>

                <form onSubmit={handleRegister}>
                    <input
                        type="email" placeholder="Email address" required
                        className="w-full mb-3 p-3 border rounded-lg"
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password" placeholder="Strong Password" required minLength={8}
                        className="w-full mb-6 p-3 border rounded-lg"
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button disabled={loading} className="w-full bg-green-600 text-white font-medium py-3 rounded-lg hover:bg-green-700">
                        {loading ? 'Securing Account...' : 'Register'}
                    </button>
                </form>
                <p className="mt-4 text-center text-sm text-gray-600">
                    Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Log in</Link>
                </p>
            </div>
        </div>
    );
}