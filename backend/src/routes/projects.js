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
    const user = await db.getAsync(
      'SELECT organization FROM profiles WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const org = await db.runAsync(`
      INSERT INTO organizations (name, description, created_by)
       VALUES (?, ?)`,
      [req.user.organization, description || null, req.user.department, req.user.id]
    ); 

    const userOrg = await db.runAsync(`
      INSERT INTO user_organizations (user_id, organization_id, role, department)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, org.lastID, "admin", department || null]
    ); 

    const result = await db.runAsync(
      `INSERT INTO projects (title, description, department, organization_id, status)
       VALUES (?, ?, ?, ?, ?)`,
      [title, description || null, department || null, org.lastID, status]
    ); // organization_id is null because there are no such entries

    const project = await db.getAsync(
      'SELECT * FROM projects WHERE id = ?',
      [result.lastID]
    );

    console.log(project);

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
      'SELECT organization FROM profiles WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const projects = await db.allAsync(
      `SELECT p.*, 
        (SELECT COUNT(*) FROM memory_entries WHERE project_id = p.id AND status = 'active') as entry_count,
        (SELECT full_name FROM profiles WHERE id = p.created_by ) as owner_name
       FROM projects p
       WHERE p.organization_id  = ?
       ORDER BY p.created_at DESC`,
      [user.organization]
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

    // Verify user has access to this project's organization
    const user = await db.getAsync(
      'SELECT organization FROM profiles WHERE id = ?',
      [req.user.id]
    );

    const project = await db.getAsync(
      `SELECT p.*, 
        (SELECT COUNT(*) FROM memory_entries WHERE project_id = p.id AND status = 'active') as entry_count,
        (SELECT full_name FROM profiles WHERE id = p.owner_id) as owner_name
       FROM projects p
       WHERE p.id = ? AND p.organization = ?`,
      [id, user.organization]
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

export default router;
