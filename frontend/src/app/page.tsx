'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,120,120,0.15),transparent)]" />
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <span className="text-xl font-semibold">SpendWise</span>
          <Link href="/login">
            <Button variant="ghost">Sign in</Button>
          </Link>
        </nav>
        <div className="relative mx-auto max-w-7xl px-4 pt-24 pb-32 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Financial insights for professionals.
            </h1>
            <p className="mt-6 text-lg text-neutral-400 max-w-2xl">
              Understand your spending patterns, subscriptions, and trends with calm, data-driven insights.
              No judgment — just clarity.
            </p>
            <div className="mt-10 flex gap-4">
              <Link href="/signup">
                <Button size="lg" className="px-8">
                  Get started
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="px-8">
                  Sign in
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Features */}
      <section className="relative border-t border-neutral-800 bg-neutral-900/30 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Built for clarity
            </h2>
            <p className="mt-4 text-neutral-400 max-w-2xl mx-auto">
              One dashboard. Clear answers. No noise.
            </p>
          </motion.div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Monthly overview',
                description: 'See total expenses, category breakdown, and subscription costs at a glance.'
              },
              {
                title: 'Subscription intelligence',
                description: 'Track active subscriptions, monthly vs yearly costs, and identify low-value spend.'
              },
              {
                title: 'Smart insights',
                description: 'Trend-based analysis: weekday vs weekend spending, recurring costs, and patterns.'
              }
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6"
              >
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm text-neutral-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-neutral-800 py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Start understanding your finances
            </h2>
            <p className="mt-4 text-neutral-400 max-w-xl mx-auto">
              Free and open-source. No paid APIs. Your data stays yours.
            </p>
            <Link href="/signup" className="inline-block mt-8">
              <Button size="lg" className="px-8">
                Create free account
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-neutral-800 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-neutral-500">
            © {new Date().getFullYear()} SpendWise. Built for professionals.
          </p>
        </div>
      </footer>
    </div>
  );
}
