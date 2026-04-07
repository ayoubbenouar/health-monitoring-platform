/**
 * JWT verification middleware - forwards Authorization header to backends;
 * in production, gateway can validate JWT and pass user context via X-User-Id, X-Role.
 */
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization' });
  }
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.sub, role: decoded.role };
    req.headers['x-user-id'] = decoded.sub;
    req.headers['x-role'] = decoded.role || 'patient';
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
      req.user = { id: decoded.sub, role: decoded.role };
      req.headers['x-user-id'] = decoded.sub;
      req.headers['x-role'] = decoded.role;
    } catch (_) {}
  }
  next();
}

module.exports = { authMiddleware, optionalAuth };
