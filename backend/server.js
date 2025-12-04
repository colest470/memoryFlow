import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from "./src/routes/auth.js";
import userRoutes from "./src/routes/user.js"

const app = express();

const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
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

app.use(cookieParser());

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authLimiter, authRoutes);
app.use("/api/user", userRoutes);

app.get('/api/health', (req, res) => {
	res.json({ status: 'ok' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`);
});
