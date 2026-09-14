import express from "express";
import { promisify } from 'util';
import bycrypt from "bcryptjs"
import db from "../services/db.js";
import { body, validationResult } from 'express-validator';
import { generateTokens, authenticateToken, verifyRefreshToken, verifyAccessToken } from "../../middleware/tokens.js";

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

        let result = await db.runAsync(`
          INSERT INTO profiles (email, password_hash, full_name, organization, department, role) 
          values (?, ?, ?, ?, ?, ?)`,
           [email, passwordHash, fullName, organization, department, role]
        );

        const org = await db.runAsync(`
          INSERT INTO organizations (name, description, created_by)
            VALUES (?, ?, ?)`,
          [organization, null, result.lastID]
        );

        await db.runAsync(`
          INSERT INTO user_organizations (user_id, organization_id, role, department)
            VALUES (?, ?, ?, ?)`,
          [result.lastID, org.lastID, "admin", department || null]
        );

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

    const isValidPassword = await bycrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    const expiresAt = new Date(Date.now() + 3 * 7 * 24 * 60 * 60 * 1000);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3 * 7 * 24 * 60 * 60 * 1000 
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.full_name,
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
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await db.getAsync(`SELECT * FROM profiles WHERE id = ?`, [decoded.userId]);

    if (!user) {
      return res.status(403).json({ error: 'User not found', code: 'USER_INACTIVE' });
    }

    const { accessToken, refreshToken: newRefresh } = generateTokens(decoded.userId);

    // rotate refresh token cookie
    res.cookie('refreshToken', newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3 * 7 * 24 * 60 * 60 * 1000
    });

    // set access token cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        organization: user.organization,
        department: user.department,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', authenticateToken(), async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    const { devices } = req.body;

    if (devices === "all" && refreshToken) {
      const userID = await db.getAsync('SELECT user_id FROM profiles WHERE token = ?', [refreshToken]);

      await db.runAsync('DELETE FROM refresh_tokens WHERE user_id = ?', [userID])
    }
    
    if (refreshToken) {
      await db.runAsync('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/refresh'
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post("/changePassword", authenticateToken(), async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ error: "Current password, new password, and confirmation are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long" });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: "New password and confirmation do not match" });
    }

    const user = await db.getAsync(`SELECT password_hash FROM profiles WHERE id = ?`, [req.user.id]);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isPasswordOk = await bycrypt.compare(currentPassword, user.password_hash);

    if (!isPasswordOk) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const saltRounds = 12;
    const newPasswordHash = await bycrypt.hash(newPassword, saltRounds);

    await db.runAsync(`UPDATE profiles SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`, [newPasswordHash, req.user.id]);

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error while changing password' });
  }
});

const cleanupExpiredTokens = async () => {
  try {
    await db.runAsync(
      'DELETE FROM refresh_tokens WHERE expires_at < datetime("now")'
    );
    console.log('Cleaned up expired refresh tokens');
  } catch (error) {
    console.error('Token cleanup error:', error);
  }
};

cleanupExpiredTokens();

setInterval(cleanupExpiredTokens, 24 * 60 * 60 * 1000);

export default router;
