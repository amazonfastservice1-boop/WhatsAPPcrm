import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

/**
 * Authentication Middleware: Validates JWT token from Authorization header
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('❌ JWT_SECRET missing in .env');
    return res.status(500).json({ error: 'Internal auth configuration error' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        allowedChannels: {
          select: { channelId: true },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User account not found or has been deactivated.' });
    }

    // Attach user and permitted channel IDs to request
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      allowedChannelIds: user.allowedChannels.map((ac) => ac.channelId),
    };

    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Role-Based Access Control Middleware (RBAC)
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}` 
      });
    }
    next();
  };
}
