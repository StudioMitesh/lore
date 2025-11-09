import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../index.css';
import { AuthProvider } from '@/context/AuthProvider';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Lore - Document Your Journey',
  description: 'Capture and organize your travel memories with beautiful maps and rich storytelling tools',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

