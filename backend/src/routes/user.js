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

router.put('/change-password', authenticateToken(), [
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
], async (req, res) => {
    try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (isVerifiedCode === false) {
      return res.status(403).json({ error: 'User is not verified' });
    }

    const { newPassword, role } = req.body;

    let user;

    if (role === "creator") {
      user = await db.getAsync('SELECT * FROM users WHERE id = ?', [req.user.id]);
    } else if (role === "brand") {
      user = await db.getAsync('SELECT * FROM brand_users WHERE id = ?', [req.user.id]);
    } else {
      user = await db.getAsync('SELECT * FROM admin WHERE id = ?', [req.user.id]);
    }

    // const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

    // if (!isValidPassword) {
    //   return res.status(400).json({ error: 'Current password is incorrect' });
    // }

    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    if (role === "creator") {
      await db.runAsync(
        'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?',
        [newPasswordHash, req.user.id]
      );
    } else if (role === "brand") {
      await db.runAsync(
        'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?',
        [newPasswordHash, req.user.id]
      );
    } else {
      await db.runAsync(
        'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?',
        [newPasswordHash, req.user.id]
      );
    }

    if (role === "creator") {
      await db.runAsync('DELETE FROM refresh_tokens WHERE user_id = ?', [req.user.id]);
    } else if (role === "brand") {
      await db.runAsync('DELETE FROM refresh_tokens_brand WHERE user_id = ?', [req.user.id]);
    } else {
      await db.runAsync('DELETE FROM refresh_tokens_admin WHERE user_id = ?', [req.user.id]);
    }

    res.json({ message: 'Password changed successfully. Please log in again.' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get("/creator/:username", async (req, res) => {
  try {
    const { username } = req.params;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: "No username provided" });
    }

    const user = await db.getAsync(`
      SELECT id, email, name, bio, portfolio_link, country, city, instagram_link, twitter_link, tiktok_link, youtube_link, username, state, created_at
      FROM users WHERE username = ? 
    `, [username.trim()]);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userParticipations = await db.allAsync(`
      SELECT contest_id, num_submissions, is_winner 
      FROM contest_participation
      WHERE user_id = ?
    `, [user.id]);

    const participationsWithContest = await Promise.all(
      userParticipations.map(async (participation) => {
        const contest = await db.getAsync(`
          SELECT title, frontend_path 
          FROM contests 
          WHERE id = ?
        `, [participation.contest_id]);
        
        return {
          num_submissions: participation.num_submissions,
          is_winner: participation.is_winner,
          contest_title: contest?.title || 'Unknown Contest',
          contest_path: contest?.frontend_path || '#'
        };
      })
    );

    res.status(200).json({ 
      user: {
        email: user.email,
        name: user.name,
        bio: user.bio,
        portfolio_link: user.portfolio_link,
        country: user.country,
        city: user.city,
        instagram_link: user.instagram_link,
        twitter_link: user.twitter_link,
        tiktok_link: user.tiktok_link,
        youtube_link: user.youtube_link,
        username: user.username,
        state: user.state,
        created_at: user.created_at
      },
      participations: participationsWithContest
    });
  } catch (error) {
    console.error('Profile error: ', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post("/updateProfile", async () => {

});

router.get("/getProjects", async () => {

});


// router.post("/createOrganization", authenticateToken(), async (req, res) => {
//   try {
//     const { data } = req.body;
    
//     if (!data || !data.name) {
//       return res.status(400).json({ error: "Organization name is required" });
//     }

//     const result = await db.runAsync(
//       `INSERT INTO organizations (name, description, settings) VALUES (?, ?, ?)`, 
//       [data.name, data.description || null, data.settings || '{}']
//     );

//     res.status(201).json({
//       message: "Organization created successfully",
//       id: result.lastID,
//       organization: {
//         name: data.name,
//         description: data.description,
//         settings: data.settings || {}
//       }
//     });

//   } catch(error) {
//     console.error("Error creating organization:", error);
    
//     if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('UNIQUE')) {
//       return res.status(409).json({ error: "Organization name already exists" });
//     }
    
//     res.status(500).json({ 
//       error: "Failed to create organization",
//       details: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });

router.post("/createProject", authenticateToken(), async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data || !data.name || !data.description || !data.status || !data.createdBy || !data.department) {
      return res.status(400).json({ error: "Organization name is required" });
    }

    if (data.organizationID) {
      const result = await getAsync(`SELECT user_id FROM user_organizations WHERE user_organizations = ?`, [data.organizationID]);

      if (!(result.lastID === data.userID)) {
        res.status(401).json({ error: "user not authorized to create organization!" });
      }
    } else {
      res.status(401).json({ error: "No organization ID passed" });
    }

    const result = await db.runAsync(
      `INSERT INTO organizations (title, description, status, organization_id, created_by, department) VALUES (?, ?, ?, ?, ?, ?)`, 
      [data.title, data.description || null, data.status, data.organizationID, data.createdBy, data.department]
    );

    res.status(201).json({
      message: "Project created successfully",
      id: result.lastID,
      organization: {
        name: data.name,
        description: data.description,
        status: data.status,
        organization: data.organization,
        createdBy: data.createdBy,
        department: data.department,
        settings: data.settings || {}
      }
    });

  } catch(error) {
    console.error("Error creating organization:", error);
    
    res.status(500).json({ 
      error: "Failed to create organization",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get("/loadData", async () => {
  try {
    //const projectsData = await getProjects();
    setProjects(projectsData || []);

    const { count: entriesCount } = await supabase
      .from('memory_entries')
      .select('*', { count: 'exact', head: true });

    const { count: lessonsCount } = await supabase
      .from('memory_entries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'lesson_learned');

    const { data: contributorsData } = await supabase
      .from('profiles')
      .select('id');

    setStats({
      totalEntries: entriesCount || 0,
      activeProjects: projectsData?.filter(p => p.status === 'active').length || 0,
      contributors: contributorsData?.length || 0,
      lessonLearned: lessonsCount || 0,
    });
  } catch (error) {
    console.error('Error loading data:', error);
  } finally {
    setLoading(false);
  }
});

export default router;