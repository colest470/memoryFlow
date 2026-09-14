import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { authLimiter } from "./middleware/authLimiter.js";
import authRoutes from "./src/routes/auth.js";
import userRoutes from "./src/routes/user.js";
import projectRoutes from "./src/routes/projects.js";
import entriesRoutes from "./src/routes/entries.js";
import aiRoutes from "./src/routes/ai.js"

const app = express();
const PORT = process.env.PORT || 8808;

app.use(cookieParser());

app.use(helmet());

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || FRONTEND_URL).split(',');

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy: Origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
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

if (process.env.START_SERVER !== 'false') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}