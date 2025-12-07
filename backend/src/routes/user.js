import express from "express";
import { promisify } from 'util';
import { authenticateToken, generateTokens } from "../../middleware/tokens.js";
import db from "../services/db.js";

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

router.get('/profile', authenticateToken(), async (req, res) => {
  try {
    const user = await db.getAsync(
        'SELECT * FROM profiles WHERE id = ?',
        [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(user);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        organization: user.organization,
        department: user.department,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


export default router;