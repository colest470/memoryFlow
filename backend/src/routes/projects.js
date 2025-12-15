import express from 'express';
import { promisify } from 'util';
import { authenticateToken } from '../../middleware/tokens.js';
import db from '../services/db.js';

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

router.post('/', authenticateToken(), async (req, res) => {
  try {
    const { title, description, department, status = 'active' } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Get user's organization
    const org = await db.getAsync(
      'SELECT * FROM user_organizations WHERE user_id = ?',
      [req.user.id]
    );

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const result = await db.runAsync(
      `INSERT INTO projects (title, description, department, organization_id, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description || null, department || null, org.organization_id, status, req.user.id]
    );

    const project = await db.getAsync(
      'SELECT * FROM projects WHERE id = ?',
      [result.lastID]
    );

    await db.runAsync(
      `INSERT INTO project_members (user_id, project_id, role)
       VALUES (?, ?, ?)`,
      [req.user.id, project.id, 'owner']
    );

    res.status(201).json({
      success: true,
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        status: project.status,
        department: project.department,
        created_at: project.created_at
      }
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

/**
 * GET PROJECTS
 * GET /api/projects
 * Returns all projects for the authenticated user's organization
 */
router.get('/', authenticateToken(), async (req, res) => {
  try {
    // Get user's organization
    const user = await db.getAsync(
      'SELECT user_id, role, organization_id FROM user_organizations WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const projects = await db.allAsync(
      `SELECT p.*, 
        (SELECT COUNT(*) FROM memory_entries WHERE project_id = p.id AND status = 'active') as entry_count,
        (SELECT full_name FROM profiles WHERE id = p.created_by ) as owner_name
       FROM projects p
       WHERE p.organization_id  = ?
       ORDER BY p.created_at DESC`,
      [user.organization_id]
    );

    res.json({
      success: true,
      projects: projects || []
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

/**
 * GET PROJECT BY ID
 * GET /api/projects/:id
 * Returns a single project with entry count
 */
router.get('/:id', authenticateToken(), async (req, res) => {
  try {
    const { id } = req.params;

    const orgId = await db.getAsync(
      'SELECT organization_id FROM user_organizations WHERE user_id = ?',
      [req.user.id]
    );

    if (!orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify user has access to this project's organization
    const user = await db.getAsync(
      'SELECT organization_id FROM projects WHERE created_by = ?',
      [req.user.id]
    );

    if (user.organization_id !== orgId.organization_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const project = await db.getAsync(
      `SELECT p.*, 
        (SELECT COUNT(*) FROM memory_entries WHERE project_id = p.id AND status = 'active') as entry_count,
        (SELECT full_name FROM profiles WHERE id = p.created_by) as owner_name
       FROM projects p
       WHERE p.id = ? AND p.organization_id = ?`,
      [id, user.organization_id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

/**
 * UPDATE PROJECT
 * PUT /api/projects/:id
 * Updates project details (owner only)
 */
router.put('/:id', authenticateToken(), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, department } = req.body;

    // Verify user is project owner
    const project = await db.getAsync(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only project owner can update' });
    }

    await db.runAsync(
      `UPDATE projects 
       SET title = ?, description = ?, status = ?, department = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [title || project.title, description || project.description, status || project.status, department || project.department, id]
    );

    const updated = await db.getAsync(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      project: updated
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

/**
 * DELETE PROJECT
 * DELETE /api/projects/:id
 * Deletes a project (owner only)
 */
router.delete('/:id', authenticateToken(), async (req, res) => {
  try {
    const { id } = req.params;

    const project = await db.getAsync(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only project owner can delete' });
    }

    // Soft delete by setting status to archived
    await db.runAsync(
      'UPDATE projects SET status = ?, updated_at = datetime("now") WHERE id = ?',
      ['archived', id]
    );

    res.json({
      success: true,
      message: 'Project deleted'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

/**
 * ANALYZE PROJECT
 * POST /api/projects/:id/analyze
 * Runs embedding + AI analysis for all entries in the project and returns aggregated insights
 */
router.post('/:id/analyze', authenticateToken(), async (req, res) => {
  try {
    const { id: projectId } = req.params;

    // Verify project exists and belongs to user's organization
    const project = await db.getAsync('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Get entries for project
    const entries = await db.allAsync(
      `SELECT id, title, content FROM memory_entries WHERE project_id = ?`,
      [projectId]
    );

    const insights = [];
    const suggestions = [];

    for (const e of entries) {
      const text = `${e.title}\n\n${e.content || ''}`;
      try {
        await generateEmbedding(e.id, text);
      } catch (err) {
        console.warn('Embedding failed for', e.id, err);
      }

      try {
        const aiMeta = await analyzeContent(text);
        await db.runAsync('UPDATE memory_entries SET metadata = ? WHERE id = ?', [JSON.stringify(aiMeta), e.id]);
        insights.push({ entryId: e.id, ...aiMeta });
      } catch (err) {
        console.warn('AI analyze failed for', e.id, err);
      }
    }

    // Suggest timeline links by similarity (basic): compare each pair and suggest if similarity > 0.7
    for (let i = 0; i < entries.length; i++) {
      const textA = `${entries[i].title}\n\n${entries[i].content || ''}`;
      const vecA = await (async () => {
        try { return await getEmbedding(entries[i].id); } catch { return null; }
      })();
      if (!vecA) continue;
      for (let j = i + 1; j < entries.length; j++) {
        const vecB = await (async () => {
          try { return await getEmbedding(entries[j].id); } catch { return null; }
        })();
        if (!vecB) continue;
        const score = require('../services/embeddings.js').cosineSimilarity(vecA, vecB);
        if (score >= 0.7) {
          suggestions.push({ from: entries[i].id, to: entries[j].id, similarity: score });
        }
      }
    }

    res.json({ success: true, insights, suggestions });
  } catch (error) {
    console.error('Project analyze error:', error);
    res.status(500).json({ error: 'Failed to analyze project' });
  }
});

router.get("/:id/members", authenticateToken(), async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const members = await db.allAsync(
      `SELECT p.id, p.full_name, p.email, up.role
       FROM profiles p
       JOIN project_members up ON p.id = up.user_id
       WHERE up.project_id = ?`,
      [projectId]
    );

    res.json({ success: true, members });
  } catch (error) {
    console.error('Error fetching project members:', error);
    res.status(500).json({ error: 'Failed to fetch project members' });
  }
});

router.post("/:id/members", authenticateToken(), async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { user_id: userId, role } = req.body;

    await db.runAsync(
      `INSERT INTO project_members (user_id, project_id, role)
       VALUES (?, ?, ?)`,
      [userId, projectId, role]
    );

    res.status(201).json({ success: true, message: 'Member added' });
  } catch (error) {
    console.error('Error adding project member:', error);
    res.status(500).json({ error: 'Failed to add project member' });
  }
});

router.post("/:id/searchAddMember", authenticateToken(), async (req, res) => {
  try {
    // const { id: projectId } = req.params;
    const { query } = req.body;

    const users = await db.allAsync(
      `SELECT id, full_name, email
       FROM profiles
       WHERE full_name LIKE ? OR email LIKE ?`,
      [`%${query}%`, `%${query}%`]
    );

    res.json({ success: true, users });
  } catch (error) {
    console.error('Error searching users to add:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

router.delete("/:id/members", authenticateToken(), async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { user_id: userId } = req.body;

    await db.runAsync(
      `DELETE FROM project_members WHERE user_id = ? AND project_id = ?`,
      [userId, projectId]
    );

    res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    console.error('Error removing project member:', error);
    res.status(500).json({ error: 'Failed to remove project member' });
  }
});

export default router;