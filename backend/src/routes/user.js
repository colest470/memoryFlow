import express from "express";
import { promisify } from 'util';
import { authenticateToken } from "../../middleware/tokens.js";
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

router.get("/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const user = await db.getAsync(`SELECT id, full_name, organization, department, role  FROM profiles WHERE email = ?`, [email]);

    console.log(user);

    if (!user) {
      res.status(200).json({ success: false, error: "User not found" });
    }

    const projects = await db.allAsync(
      `SELECT p.*, pm.role as project_role 
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       WHERE pm.user_id = ?`,
      [user.id]
    );

    if (!projects) {
      res.status(200).json({ success: true, data: null });
      return;
    }

    const entries = await db.allAsync(
      `SELECT * FROM memory_entries 
       WHERE author_id = ? 
       ORDER BY created_at DESC`,
      [user.id]
    );

    let entryLinks = [];
    for (const entry of entries) {
      const links = await db.allAsync(
        `SELECT * FROM entry_links 
         WHERE parent_entry_id = ? OR child_entry_id = ?`,
        [entry.id, entry.id]
      );
      entryLinks = [...entryLinks, ...links];
    }

    const organizations = await db.allAsync(
      `SELECT o.*, uo.role as org_role 
       FROM organizations o
       JOIN user_organizations uo ON o.id = uo.organization_id
       WHERE uo.user_id = ?`,
      [user.id]
    );

    res.status(200).json({ success: true, 
      data: user,
      projects,
      entries,
      entryLinks,
      organizations
    });
  } catch (error) {
    console.error("Error fetching profile data: ", error);
    res.status(500).json({ error: error });
  }
});

// router.put('/change-password', authenticateToken(), [
//   body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
//   body('confirmPassword').custom((value, { req }) => {
//     if (value !== req.body.newPassword) {
//       throw new Error('Passwords do not match');
//     }
//     return true;
//   })
// ], async (req, res) => {
//     try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }

//     if (isVerifiedCode === false) {
//       return res.status(403).json({ error: 'User is not verified' });
//     }

//     const { newPassword, role } = req.body;

//     let user;

//     if (role === "creator") {
//       user = await db.getAsync('SELECT * FROM users WHERE id = ?', [req.user.id]);
//     } else if (role === "brand") {
//       user = await db.getAsync('SELECT * FROM brand_users WHERE id = ?', [req.user.id]);
//     } else {
//       user = await db.getAsync('SELECT * FROM admin WHERE id = ?', [req.user.id]);
//     }

//     // const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

//     // if (!isValidPassword) {
//     //   return res.status(400).json({ error: 'Current password is incorrect' });
//     // }

//     const saltRounds = 12;
//     const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

//     if (role === "creator") {
//       await db.runAsync(
//         'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?',
//         [newPasswordHash, req.user.id]
//       );
//     } else if (role === "brand") {
//       await db.runAsync(
//         'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?',
//         [newPasswordHash, req.user.id]
//       );
//     } else {
//       await db.runAsync(
//         'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?',
//         [newPasswordHash, req.user.id]
//       );
//     }

//     if (role === "creator") {
//       await db.runAsync('DELETE FROM refresh_tokens WHERE user_id = ?', [req.user.id]);
//     } else if (role === "brand") {
//       await db.runAsync('DELETE FROM refresh_tokens_brand WHERE user_id = ?', [req.user.id]);
//     } else {
//       await db.runAsync('DELETE FROM refresh_tokens_admin WHERE user_id = ?', [req.user.id]);
//     }

//     res.json({ message: 'Password changed successfully. Please log in again.' });
//   } catch (error) {
//     console.error('Password change error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

router.post("/updateProfile", async () => {

});

router.get("/getProjects", async () => {

});

export default router;