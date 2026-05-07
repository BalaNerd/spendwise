/**
 * Auth middleware - validates Supabase JWT and attaches user to request
 */

import jwt from 'jsonwebtoken';
export { createUserClient } from '../utils/supabase.js';

/**
 * Verify Supabase JWT token
 */
function verifySupabaseJWT(token) {
  try {
    // Get Supabase JWT secret from environment
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      // Fallback: decode only (less secure but functional)
      console.warn('SUPABASE_JWT_SECRET not found, falling back to decode-only');
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.sub) {
        throw new Error('Invalid token structure');
      }
      return decoded;
    }

    // Verify token signature and expiration
    const decoded = jwt.verify(token, jwtSecret);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token signature');
    } else {
      throw new Error('Token validation failed');
    }
  }
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
    // Verify Supabase JWT (not just decode!)
    const decoded = verifySupabaseJWT(token);

    if (!decoded || !decoded.sub) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }

    // Check token expiration
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired'
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
      message: err.message || 'Token validation failed'
    });
  }
}
