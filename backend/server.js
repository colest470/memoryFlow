import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import multer from 'multer';

import authRoutes from "./src/routes/auth.js";
import userRoutes from "./src/routes/user.js";
import projectRoutes from "./src/routes/projects.js";
import entriesRoutes from "./src/routes/entries.js";
import aiRoutes from "./src/routes/ai.js"

const app = express();

const frontendUrl = "https://memory-flow-owej.vercel.app";
const PORT = process.env.PORT || 4000;

app.use(helmet({
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Range'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges'], 
}));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
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

app.use((req, res, next) => {
  if (req.is('multipart/form-data')) {
    next();
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});

app.use(cookieParser());

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

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

// app.listen(PORT, () => {
// 	console.log(`Server listening on http://localhost:${PORT}`);
// });

export default app;