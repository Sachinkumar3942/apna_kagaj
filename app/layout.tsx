import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Apna Kagaj - Secure Identity Vault',
  description: 'Zero-Knowledge encrypted document storage for financial identity.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* Add suppressHydrationWarning right here */}
      <body
        className="bg-gray-50 min-h-screen text-gray-900"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}