import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SOE-DQPS | Digital Question Paper System',
  description: 'Secure University Exam Paper Portal',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-600/20 rounded-full mix-blend-multiply filter blur-[128px] animate-pulse"></div>
          <div className="absolute top-0 -right-4 w-96 h-96 bg-violet-600/20 rounded-full mix-blend-multiply filter blur-[128px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute -bottom-32 left-20 w-96 h-96 bg-emerald-600/20 rounded-full mix-blend-multiply filter blur-[128px] animate-pulse" style={{ animationDelay: '4s' }}></div>
          
          <main className="relative z-10 h-screen w-screen flex flex-col">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
