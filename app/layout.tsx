import './globals.css';
import type { Metadata } from 'next';
import { SupabaseProvider } from './providers';
import { HeaderAuth } from '@/components/HeaderAuth';

export const metadata: Metadata = {
  title: 'MixWise',
  description: 'See what cocktails you can make with the bottles you already own.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-50">
        <SupabaseProvider initialSession={null}>
          <div className="min-h-screen flex flex-col">
            <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-lime-400/80" />
                <span className="font-semibold tracking-tight text-lg">MixWise</span>
              </div>
              <HeaderAuth />
            </header>
            <main className="flex-1">{children}</main>
          </div>
        </SupabaseProvider>
      </body>
    </html>
  );
}