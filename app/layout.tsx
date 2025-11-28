import './globals.css';
import type { Metadata } from 'next';
import { SupabaseProvider } from './providers';
import { Inter, Playfair_Display } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ 
  subsets: ['latin'], 
  variable: '--font-playfair' 
});

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
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-slate-950 text-slate-50 font-sans selection:bg-lime-500/30">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black -z-10" />
        
        <SupabaseProvider initialSession={null}>
          <div className="min-h-screen flex flex-col">
            <header className="border-b border-white/5 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-lime-400 to-emerald-600 shadow-lg shadow-lime-500/20 flex items-center justify-center text-sm font-serif font-bold text-slate-900">
                    MW
                </div>
                <span className="font-serif font-bold tracking-tight text-2xl text-slate-100">
                  MixWise
                </span>
              </div>
              {/* Removed Guest Mode Component */}
            </header>
            <main className="flex-1">{children}</main>
          </div>
        </SupabaseProvider>
      </body>
    </html>
  );
}
