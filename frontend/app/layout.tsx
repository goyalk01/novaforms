import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthProvider } from './AuthProvider';
import Header from './Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'NovaForms',
  description: 'A futuristic form studio with a Java backend and Neon PostgreSQL.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Suspense fallback={<div className="global-header-fallback" style={{ height: '72px' }} />}>
            <Header />
          </Suspense>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
