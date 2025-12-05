import express from "express";
import { authenticateToken, generateTokens } from "../../middleware/tokens.js";

const router = express.Router();

router.get('/profile', (req, res, next) => {
  authenticateToken(req, res, next);
}, async (req, res) => {
  try {
    const user = await db.getAsync(
        'SELECT * FROM profile WHERE id = ?',
        [req.user.id]
    );


    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        email: user.email,
        bio: user.bio,
        name: user.name,
        role: role
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    console.log("Refresh ...");
    const { refreshToken } = req.cookies;

    console.log(refreshToken);

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

router.post('/logout', (req, res, next) => {
  const { role } = req.body;

  authenticateToken(role)(req, res, next);
}, async (req, res) => {
   try {
    console.log("User logging out ...");
    const { refreshToken } = req.cookies;
    const { role } = req.body;
    
    if (role === "creator") {
      if (refreshToken) {
        await db.runAsync('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
      }
    } else if (role === "brand") {
      if (refreshToken) {
        await db.runAsync('DELETE FROM refresh_tokens_brand WHERE token = ?', [refreshToken]);
      }
    } else {
      if (refreshToken) {
        await db.runAsync('DELETE FROM refresh_tokens_admin WHERE token = ?', [refreshToken]);
      }
    }

    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      owner:profiles!projects_owner_id_fkey(full_name, department)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getProject(id) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      owner:profiles!projects_owner_id_fkey(full_name, department)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateProject(id, updates) {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export default router;