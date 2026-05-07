import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/Providers';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import NextTopLoader from 'nextjs-toploader';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'SpendWise — Financial Insights Platform',
  description: 'Data-driven financial insights for professionals. Understand your spending, subscriptions, and trends.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground transition-colors duration-300`}>
        <ErrorBoundary>
          <Providers>
            <NextTopLoader
              color="hsl(var(--foreground))"
              height={2}
              showSpinner={false}
              easing="ease"
              speed={250}
            />
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
