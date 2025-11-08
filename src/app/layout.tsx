import type { Metadata } from 'next';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { PT_Sans } from 'next/font/google';
import { suppressFlushSyncWarning } from '@/lib/suppress-warnings';

// Suppress the specific warning
if (process.env.NODE_ENV === 'development') {
  suppressFlushSyncWarning();
}

const ptSans = PT_Sans({ subsets: ['latin'], weight: ['400', '700'] });

export const metadata: Metadata = {
  title: 'GestionaTuDinero',
  description: 'Tu gestor de finanzas personales.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={ptSans.className}>
          <FirebaseClientProvider>
            {children}
            <Toaster />
          </FirebaseClientProvider>
      </body>
    </html>
  );
}
