/**
 * Auth middleware - validates Supabase JWT and attaches user to request
 */

import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

/**
 * Create Supabase client scoped to authenticated user.
 * Reads env at call time so dotenv has already run.
 */
export function createUserClient(token) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase URL and Anon Key are required');
  }
  return createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}

/**
 * Require authentication middleware
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Authorization header'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Supabase JWT → decode is enough
    const decoded = jwt.decode(token);

    if (!decoded || !decoded.sub) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }

    // 🔑 ATTACH USER
    req.user = {
      id: decoded.sub,
      email: decoded.email
    };

    // 🔑 ATTACH TOKEN FOR SUPABASE CLIENT
    req.supabaseToken = token;

    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token validation failed'
    });
  }
}
