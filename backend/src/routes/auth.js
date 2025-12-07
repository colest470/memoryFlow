import express from "express";
import { promisify } from 'util';
import bycrypt from "bcryptjs"
import db from "../services/db.js";
import { body, validationResult } from 'express-validator';
import { generateTokens, authenticateToken } from "../../middleware/tokens.js";

db.getAsync = promisify(db.get.bind(db));
db.allAsync = promisify(db.all.bind(db));

db.runAsync = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const router = express.Router();

router.post("/register", [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),

  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),

  body("fullName").notEmpty().withMessage("Name is required"),
  body("organization").notEmpty().withMessage("Organization is required"),
  body("department").notEmpty().withMessage("Department is required"),
  body("role").notEmpty().withMessage("Role is required"),
], async (req, res) => {
    try {
        console.log("Registering user");

        const { email, fullName, password, confirmPassword, organization, department, role } = req.body;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
        }

        const existingUser = await db.getAsync(`SELECT * FROM profiles WHERE email = ?`, [email]);

        if (password !== confirmPassword) {
            console.log("Password and confirm password do not match!");
            res.status(400).json({ error: "Password and confirm password do not match!" });
        }

        if (existingUser) {
            console.log("User already exists");
            return res.status(400).json({ error: "User already exists" });
        }

        const saltRounds = 12;
        const passwordHash = await bycrypt.hash(password, saltRounds);

        let result = await db.runAsync(`INSERT INTO profiles (email, password_hash, full_name, organization, department, role) values (?, ?, ?, ?, ?, ?)`, [email, passwordHash, fullName, organization, department, role]);

        res.status(201).json({ 
            message: 'User registered successfully.',
            userId: result.lastID
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post("/login", [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),

  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    let user;

    user = await db.getAsync('SELECT * FROM profiles WHERE email = ?', [email]);

    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`User: ${user.email}`);

    const isValidPassword = await bycrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    const expiresAt = new Date(Date.now() + 3 * 7 * 24 * 60 * 60 * 1000);

    await db.runAsync(
    'INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)',
    [refreshToken, user.id, expiresAt]
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 3 * 7 * 24 * 60 * 60 * 1000 
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organization: user.organization,
        department: user.department,
        role: user.role
      }
    });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/refresh', async (req, res) => {
  try {
    console.log("Refresh ...");
    const { refreshToken } = req.cookies;
    console.log(refreshToken, "143");

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const tokenRecord = await db.getAsync(
        'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > datetime("now")',
        [refreshToken]
    );

    if (!tokenRecord) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    console.log("Tokenrecord: ", tokenRecord);

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(tokenRecord.user_id);

    console.log(refreshToken, "70");

    await db.runAsync('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);

    const expiresAt = new Date(Date.now() + 3 * 7 * 24 * 60 * 60 * 1000);
    await db.runAsync(
    'INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)',
    [newRefreshToken, tokenRecord.user_id, expiresAt]
    );

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || true,
      sameSite: 'strict',
      maxAge: 3 * 7 * 24 * 60 * 60 * 1000
    });

    const user = await db.getAsync('SELECT * FROM profiles WHERE id = ?', [tokenRecord.user_id]);

    console.log(user);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: role,
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', authenticateToken(), async (req, res) => {
  try {
    console.log("User logging out ...");
    const { refreshToken } = req.cookies;
    
    if (refreshToken) {
      await db.runAsync('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
    }

    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post("/changePassword", async () => {

});

export default router;
