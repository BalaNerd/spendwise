import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

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
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-[hsl(var(--background))] text-[hsl(var(--foreground))]`}>
        {children}
      </body>
    </html>
  );
}
