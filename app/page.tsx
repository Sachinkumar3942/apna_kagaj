import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h1 className="text-5xl font-extrabold text-blue-600 mb-6">Apna Kagaj</h1>
      <p className="text-xl text-gray-600 mb-10 max-w-lg">
        Your secure, zero-knowledge financial identity layer. Store your KYC documents with military-grade client-side encryption.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="px-8 py-3 bg-white text-blue-600 border border-blue-600 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Create Account
        </Link>
      </div>
    </main>
  );
}