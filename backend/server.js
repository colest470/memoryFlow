import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from "./src/routes/auth.js";
import userRoutes from "./src/routes/user.js";
import projectRoutes from "./src/routes/projects.js";
import entriesRoutes from "./src/routes/entries.js";
import aiRoutes from "./src/routes/ai.js"

const app = express();
const PORT = process.env.PORT || 4000;

// --- CORS CONFIGURATION (Fully permissive for Vercel) ---
// We allow all origins and methods. Vercel's own proxy handles the main security.
const corsOptions = {
  origin: true, // Allow any origin
  credentials: true, // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Range', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests for all routes

// --- SECURITY MIDDLEWARE ---
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cookieParser());

// --- BODY PARSERS ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- LOGGING MIDDLEWARE (Optional, keep for debugging) ---
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Origin:', req.headers.origin);
  next();
});

// --- RATE LIMITING ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many authentication attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many authentication attempts, try again later'
    });
  }
});

app.use('/api/auth', authLimiter, authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/entries", entriesRoutes);
app.use("/api/ai", aiRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;