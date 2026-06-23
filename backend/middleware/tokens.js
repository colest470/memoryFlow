import jwt from 'jsonwebtoken';
import "dotenv/config";
import db from '../src/services/db.js';

const JWT_SECRET = process.env.JWT_SECRET_KEY;

export const authenticateToken = () => {
  return async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      const user = await db.getAsync('SELECT * FROM profiles WHERE id = ?', [decoded.userId]);
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(403).json({ error: 'Invalid token' });
    }
  }
};

export const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '3w' });
  const refreshToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '3w' });

  return { accessToken, refreshToken };
};