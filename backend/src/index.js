/**
 * SpendWise Backend API
 * Express server with Supabase integration
 */

import './load-env.js';

import express from 'express';
import cors from 'cors';

import expensesRouter from './routes/expenses.js';
import categoriesRouter from './routes/categories.js';
import subscriptionsRouter from './routes/subscriptions.js';
import summariesRouter from './routes/summaries.js';
import insightsRouter from './routes/insights.js';
import usersRouter from './routes/users.js';
import exportRouter from './routes/export.js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error(
    'Missing Supabase config. Set SUPABASE_URL and SUPABASE_ANON_KEY in backend/.env (get them from Supabase project Settings > API).'
  );
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Request validation: expect Authorization header with Bearer token (Supabase JWT)
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    req.supabaseToken = authHeader.slice(7);
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/expenses', expensesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/summaries', summariesRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/users', usersRouter);
app.use('/api/export', exportRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`SpendWise API running on http://localhost:${PORT}`);
});
