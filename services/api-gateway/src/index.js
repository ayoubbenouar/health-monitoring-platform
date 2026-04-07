/**
 * API Gateway - Health Monitoring Platform
 * Routes: /auth, /users -> user-service; /vitals, /dashboard -> health-data-service;
 *         /assessments, /predict -> ai-inference-service; /notifications -> notification-service
 */
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { authMiddleware, optionalAuth } = require('./auth');

const app = express();
const PORT = process.env.PORT || 8080;

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:8001';
const HEALTH_DATA_SERVICE_URL = process.env.HEALTH_DATA_SERVICE_URL || 'http://localhost:8002';
const AI_INFERENCE_SERVICE_URL = process.env.AI_INFERENCE_SERVICE_URL || 'http://localhost:8003';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8004';

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
// express.json() consomme le body et empêche le proxy de le transmettre.
// On l'applique uniquement aux routes que la gateway gère directement (aucune pour l'instant).
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' },
});
app.use(limiter);

// Page d'accueil (vérification visuelle que l'API répond)
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>API - Surveillance Santé</title></head>
    <body style="font-family: system-ui; max-width: 600px; margin: 2rem auto; padding: 1rem;">
      <h1>API Gateway – Surveillance Santé</h1>
      <p><strong>Statut :</strong> <span style="color: green;">OK</span></p>
      <p>Le backend est démarré. Vous pouvez utiliser l'application frontend (port 3000).</p>
      <p><a href="/health">/health</a> (JSON)</p>
    </body></html>
  `);
});

// Health check (JSON pour les appels programmatiques)
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

// Auth & user routes -> user-service (public auth, protected user routes)
app.use('/auth', createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/auth': '/auth' },
  proxyTimeout: 12000,
  onError: (err, req, res) => {
    console.error('[auth proxy]', err.message);
    res.status(502).json({ error: 'Service utilisateur indisponible. Vérifiez les logs user-service.' });
  },
}));
app.use('/users', authMiddleware, createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/users': '/users' },
  proxyTimeout: 12000,
  onError: (err, req, res) => {
    console.error('[users proxy]', err.message);
    res.status(502).json({ error: 'Service utilisateur indisponible.' });
  },
}));

// Vitals & dashboard -> health-data-service (protected)
app.use('/vitals', authMiddleware, createProxyMiddleware({
  target: HEALTH_DATA_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/vitals': '/vitals' },
}));
app.use('/dashboard', authMiddleware, createProxyMiddleware({
  target: HEALTH_DATA_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/dashboard': '/dashboard' },
}));

// AI assessments & predict -> ai-inference-service (protected)
app.use('/assessments', authMiddleware, createProxyMiddleware({
  target: AI_INFERENCE_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/assessments': '/assessments' },
}));
app.use('/predict', authMiddleware, createProxyMiddleware({
  target: AI_INFERENCE_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/predict': '/predict' },
}));

// Notifications -> notification-service (protected)
app.use('/notifications', authMiddleware, createProxyMiddleware({
  target: NOTIFICATION_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/notifications': '/notifications' },
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`API Gateway listening on ${PORT}`));
