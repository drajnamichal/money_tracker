import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Sidebar } from '@/components/sidebar';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/providers/query-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { KeyboardShortcuts } from '@/components/keyboard-shortcuts';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Family Money Tracker',
  description: 'Track your family assets, income, and expenses',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold focus:shadow-lg"
        >
          Preskočiť na obsah
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>
            <div className="flex min-h-screen bg-background text-foreground">
              <Sidebar />
              <main id="main-content" className="flex-1 overflow-y-auto">
                <div className="container mx-auto p-4 md:p-8 pt-8 pb-20 md:pb-8 min-h-screen flex flex-col">
                  <ErrorBoundary>
                    <div className="flex-1">{children}</div>
                  </ErrorBoundary>
                  <footer className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                    <p>Vytvorené s láskou pre spoločné ciele ❤️</p>
                  </footer>
                </div>
              </main>
            </div>
            <KeyboardShortcuts />
            <Toaster position="top-right" richColors />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
