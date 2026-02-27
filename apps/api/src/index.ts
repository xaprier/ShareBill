import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';
const EXPENSE_SERVICE_URL = process.env.EXPENSE_SERVICE_URL || 'http://localhost:3003';

app.use(cors());

// Health check (before body parsing)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// Auth service proxy (before express.json() to preserve raw body)
app.use('/api/auth', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '',
  },
  onProxyReq: (proxyReq, req) => {
    console.log(`[PROXY] ${req.method} ${req.url} -> ${AUTH_SERVICE_URL}${proxyReq.path}`);
  },
  onProxyRes: (proxyRes, req) => {
    console.log(`[PROXY] ${req.method} ${req.url} <- ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error(`[PROXY ERROR] ${req.method} ${req.url}:`, err.message);
  },
  logLevel: 'debug',
}));

// User service proxy
app.use('/api/users', createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/users': '/users',
  },
}));

// Expense/Transaction service proxy
app.use('/api/transactions', createProxyMiddleware({
  target: EXPENSE_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/transactions': '/transactions',
  },
}));

// Statistics proxy
app.use('/api/statistics', createProxyMiddleware({
  target: EXPENSE_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/statistics': '/statistics',
  },
}));

app.use(express.json());

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Auth Service: ${AUTH_SERVICE_URL}`);
  console.log(`User Service: ${USER_SERVICE_URL}`);
  console.log(`Expense Service: ${EXPENSE_SERVICE_URL}`);
});
