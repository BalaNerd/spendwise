'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { api } from '@/lib/api';

type Insight = {
  id: string;
  type: string;
  title: string;
  description: string;
  data: Record<string, unknown>;
  created_at?: string;
};

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Insight[]>('/api/insights?limit=20')
      .then(setInsights)
      .catch(() => setInsights([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-2 border-neutral-600 border-t-white rounded-full" />
      </div>
    );
  }

  const [featured, ...rest] = insights;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Insights</h1>
        <p className="mt-1 text-neutral-400">
          Behavior-based financial insights from your spending — trends, patterns, and suggestions
        </p>
      </div>

      {insights.length > 0 ? (
        <>
          {featured && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-neutral-700 bg-gradient-to-br from-neutral-900 to-neutral-800/50 p-6"
            >
              <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                Key takeaway
              </span>
              <h2 className="mt-2 text-xl font-semibold text-white">{featured.title}</h2>
              <p className="mt-2 text-neutral-300">{featured.description}</p>
            </motion.div>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            {rest.map((insight, i) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i + 1) * 0.05 }}
              >
                <Card>
                  <CardHeader>
                    <span
                      className={`inline-block w-fit rounded-full px-2 py-1 text-xs font-medium ${
                        insight.type === 'trend'
                          ? 'bg-blue-500/20 text-blue-400'
                          : insight.type === 'summary'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-neutral-700 text-neutral-300'
                      }`}
                    >
                      {insight.type}
                    </span>
                    <CardTitle className="mt-2">{insight.title}</CardTitle>
                  </CardHeader>
                  <p className="text-sm text-neutral-400">{insight.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        <Card className="border-dashed">
          <div className="py-16 px-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500 mb-4">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white">No insights yet</h3>
            <p className="mt-2 text-neutral-500 max-w-sm mx-auto">
              Add expenses over the last few months to get personalized trend analysis, weekday vs weekend spending, and recurring cost breakdowns.
            </p>
            <p className="mt-4 text-sm text-neutral-600">
              Tip: Use the Dashboard to add expenses and revisit this page after you have more data.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
