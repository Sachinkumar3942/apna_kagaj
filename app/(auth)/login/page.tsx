"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { deriveKeyFromPassword } from '@/lib/cryptoSetup';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const setEncryptionKey = useAuthStore((state) => state.setEncryptionKey);

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/dashboard`,
            }
        });
        if (error) alert(error.message);
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            alert(error.message);
            setLoading(false);
            return;
        }

        // Derive and store the AES-256 key in memory (Zero-Knowledge)
        const key = await deriveKeyFromPassword(password, email);
        setEncryptionKey(key);

        router.push('/dashboard');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="p-8 bg-white border rounded-xl shadow-sm w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center">Welcome Back</h1>

                <button
                    onClick={handleGoogleLogin}
                    type="button"
                    className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 mb-6"
                >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                    Continue with Google
                </button>

                <div className="relative flex items-center py-2 mb-4">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">Or with email</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <form onSubmit={handleEmailLogin}>
                    <input
                        type="email" placeholder="Email address" required
                        className="w-full mb-3 p-3 border rounded-lg"
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password" placeholder="Password" required
                        className="w-full mb-6 p-3 border rounded-lg"
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button disabled={loading} className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700">
                        {loading ? 'Decrypting Vault...' : 'Sign In'}
                    </button>
                </form>
                <p className="mt-4 text-center text-sm text-gray-600">
                    Don't have an account? <Link href="/register" className="text-blue-600 hover:underline">Register</Link>
                </p>
            </div>
        </div>
    );
}