import express from 'express';
import { promisify } from 'util';
import { AnalyzeProject } from '../services/ai.js';
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
    console.log('User ID from token:', req.user.id); // Debug log
    
    // Get user's organization - use user_id to match
    const user = await db.getAsync(
      'SELECT user_id, role, organization_id FROM user_organizations WHERE user_id = ?',
      [req.user.id]
    );

    console.log('Found user in organization:', user); // Debug log

    if (!user) {
      console.error('User organization not found for user ID:', req.user.id);
      return res.status(404).json({ 
        error: 'Organization not found or user not assigned to any organization' 
      });
    }

    console.log('Fetching projects for organization ID:', user.organization_id);

    // Check user role to determine what projects they can access
    let projectsQuery;
    let queryParams;
    
    if (user.role === 'admin') {
      // Admins can see all projects in their organization
      projectsQuery = `
        SELECT p.*, 
          (SELECT COUNT(*) FROM memory_entries WHERE project_id = p.id AND status = 'active') as entry_count,
          (SELECT full_name FROM profiles WHERE id = p.created_by) as owner_name,
          'admin' as user_role_in_project
        FROM projects p
        WHERE p.organization_id = ?
        ORDER BY p.created_at DESC`;
      queryParams = [user.organization_id];
    } else {
      // Regular users (including editors/viewers) can only see projects they're members of
      // Note: project_members doesn't have a status column, so we don't filter by it
      projectsQuery = `
        SELECT p.*, 
          (SELECT COUNT(*) FROM memory_entries WHERE project_id = p.id AND status = 'active') as entry_count,
          (SELECT full_name FROM profiles WHERE id = p.created_by) as owner_name,
          pm.role as user_role_in_project
        FROM projects p
        INNER JOIN project_members pm ON p.id = pm.project_id
        WHERE p.organization_id = ?
          AND pm.user_id = ?
        ORDER BY p.created_at DESC`;
      queryParams = [user.organization_id, req.user.id];
    }

    const projects = await db.allAsync(projectsQuery, queryParams);
    
    console.log(`Found ${projects?.length || 0} projects for user ${req.user.id} with role ${user.role}`);

    res.json({
      success: true,
      projects: projects || [],
      userRole: user.role // Include user role in response for frontend
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch projects',
      details: error.message 
    });
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
    // const user = await db.getAsync(
    //   'SELECT organization_id FROM projects WHERE created_by = ?',
    //   [req.user.id]
    // );

    if (!orgId.organization_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const project = await db.getAsync(
      `SELECT p.*, 
        (SELECT COUNT(*) FROM memory_entries WHERE project_id = p.id AND status = 'active') as entry_count,
        (SELECT full_name FROM profiles WHERE id = p.created_by) as owner_name
       FROM projects p
       WHERE p.id = ? AND p.organization_id = ?`,
      [id, orgId.organization_id]
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
 * ENHANCED PROJECT ANALYSIS
 * POST /api/projects/:id/analyze
 * Provides comprehensive project-level insights
 */
router.post('/:id/analyze', authenticateToken(), async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { analysisType } = req.body; // 'comprehensive', 'quick', 'thematic'

    // Verify project exists and user has access
    const project = await db.getAsync(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM memory_entries WHERE project_id = p.id AND status = 'active') as entry_count
      FROM projects p
      WHERE p.id = ?`,
      [projectId]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get all entries with their existing embeddings/metadata
    const entries = await db.allAsync(`
      SELECT me.*, 
        json_extract(me.metadata, '$.topics') as existing_topics,
        json_extract(me.metadata, '$.summary') as existing_summary
      FROM memory_entries me
      WHERE me.project_id = ? AND me.status = 'active'
      ORDER BY me.created_at`,
      [projectId]
    );

    if (entries.length === 0) {
      return res.json({
        success: true,
        message: 'No entries to analyze',
        analysis: {}
      });
    }

    let analysis;
    
    switch (analysisType) {
      case 'quick':
        analysis = await quickAnalyzeProject(entries);
        break;
      case 'thematic':
        analysis = await thematicAnalyzeProject(entries);
        break;
      default:
        analysis = await comprehensiveAnalyzeProject(entries);
    }

    // Save analysis results to project_analyses table
    await db.runAsync(`
      INSERT INTO project_analyses (project_id, analysis_type, analysis_data, created_by)
      VALUES (?, ?, ?, ?)`,
      [projectId, analysisType, JSON.stringify(analysis), req.user.id]
    );

    // Update project metadata with latest analysis
    await db.runAsync(`
      UPDATE projects 
      SET metadata = json_patch(COALESCE(metadata, '{}'), ?),
          last_analyzed_at = datetime('now')
      WHERE id = ?`,
      [JSON.stringify({
        last_analysis: analysisType,
        last_analyzed: new Date().toISOString(),
        key_themes: analysis.key_themes?.slice(0, 5)
      }), projectId]
    );

    res.json({
      success: true,
      project: {
        id: project.id,
        title: project.title,
        entry_count: project.entry_count
      },
      analysis_type: analysisType,
      entries_analyzed: entries.length,
      analysis
    });

  } catch (error) {
    console.error('Project analyze error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze project',
      details: error.message 
    });
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

    await db.runAsync(
      `INSERT INTO user_organizations (user_id, organization_id, role)
       SELECT ?, p.organization_id, ?
       FROM projects p
       WHERE p.id = ?`,
      [userId, role === "viewer" ? "viewer" : "member", projectId]
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


/**
 * GET ANALYSIS HISTORY
 * GET /api/projects/:id/analyses
 */
router.get('/:id/analyses', authenticateToken(), async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { limit = 10 } = req.query;

    const analyses = await db.allAsync(`
      SELECT pa.*, p.full_name as analyst_name
      FROM project_analyses pa
      LEFT JOIN profiles p ON pa.created_by = p.id
      WHERE pa.project_id = ?
      ORDER BY pa.created_at DESC
      LIMIT ?`,
      [projectId, parseInt(limit)]
    );

    res.json({
      success: true,
      analyses: analyses.map(a => ({
        ...a,
        analysis_data: JSON.parse(a.analysis_data)
      }))
    });
  } catch (error) {
    console.error('Get analyses error:', error);
    res.status(500).json({ error: 'Failed to fetch analyses' });
  }
});

/**
 * COMPARE PROJECTS
 * POST /api/projects/compare
 */
router.post('/compare', authenticateToken(), async (req, res) => {
  try {
    const { projectIds } = req.body;

    if (!Array.isArray(projectIds) || projectIds.length < 2) {
      return res.status(400).json({ error: 'Provide at least 2 project IDs' });
    }

    // Get user's organization for access control
    const userOrg = await db.getAsync(
      'SELECT organization_id FROM user_organizations WHERE user_id = ?',
      [req.user.id]
    );

    // Fetch all projects with their entries
    const placeholders = projectIds.map(() => '?').join(',');
    const projects = await db.allAsync(`
      SELECT p.id, p.title, p.description,
        (SELECT GROUP_CONCAT(json_object('id', me.id, 'title', me.title, 'content', me.content))
         FROM memory_entries me
         WHERE me.project_id = p.id AND me.status = 'active'
         LIMIT 50) as entries_json
      FROM projects p
      WHERE p.id IN (${placeholders}) 
        AND p.organization_id = ?`,
      [...projectIds, userOrg.organization_id]
    );

    if (projects.length < 2) {
      return res.status(404).json({ error: 'Projects not found or access denied' });
    }

    // Parse entries
    projects.forEach(p => {
      p.entries = p.entries_json 
        ? JSON.parse(`[${p.entries_json}]`)
        : [];
      delete p.entries_json;
    });

    // Use AI to compare
    const comparison = await CompareProjects(projects[0].entries, projects[1].entries);

    res.json({
      success: true,
      projects: projects.map(p => ({
        id: p.id,
        title: p.title,
        entry_count: p.entries.length
      })),
      comparison
    });

  } catch (error) {
    console.error('Compare projects error:', error);
    res.status(500).json({ error: 'Failed to compare projects' });
  }
});

/**
 * GET PROJECT INSIGHTS (Non-AI, statistical)
 */
router.get('/:id/insights', authenticateToken(), async (req, res) => {
  try {
    const { id: projectId } = req.params;

    const stats = await db.getAsync(`
      SELECT 
        COUNT(*) as total_entries,
        COUNT(CASE WHEN LENGTH(content) > 500 THEN 1 END) as detailed_entries,
        COUNT(DISTINCT json_extract(metadata, '$.topics')) as unique_topics,
        MIN(created_at) as first_entry_date,
        MAX(created_at) as last_entry_date,
        COUNT(DISTINCT created_by) as unique_contributors,
        AVG(LENGTH(content)) as avg_content_length
      FROM memory_entries
      WHERE project_id = ? AND status = 'active'`,
      [projectId]
    );

    // Get entry timeline
    const timeline = await db.allAsync(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as entry_count
      FROM memory_entries
      WHERE project_id = ? AND status = 'active'
      GROUP BY DATE(created_at)
      ORDER BY date`,
      [projectId]
    );

    // Get top topics from existing metadata
    const topics = await db.allAsync(`
      SELECT 
        json_each.value as topic,
        COUNT(*) as frequency
      FROM memory_entries,
        json_each(json_extract(metadata, '$.topics'))
      WHERE project_id = ? AND status = 'active'
      GROUP BY topic
      ORDER BY frequency DESC
      LIMIT 10`,
      [projectId]
    );

    res.json({
      success: true,
      stats,
      timeline,
      topics,
      activity_score: calculateActivityScore(timeline, stats)
    });

  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

// Helper functions
async function comprehensiveAnalyzeProject(entries) {
  const analysis = await AnalyzeProject(entries);
  
  // Add statistical data
  analysis.statistical_insights = {
    total_entries: entries.length,
    avg_entry_length: Math.round(entries.reduce((sum, e) => sum + (e.content?.length || 0), 0) / entries.length),
    date_range: {
      start: entries.reduce((min, e) => e.created_at < min ? e.created_at : min, entries[0].created_at),
      end: entries.reduce((max, e) => e.created_at > max ? e.created_at : max, entries[0].created_at)
    }
  };

  return analysis;
}

async function quickAnalyzeProject(entries) {
  // Use existing metadata for quick analysis
  const allTopics = entries.flatMap(e => 
    e.existing_topics ? JSON.parse(e.existing_topics) : []
  );
  
  const topicFrequency = {};
  allTopics.forEach(topic => {
    topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;
  });

  return {
    key_topics: Object.entries(topicFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count })),
    entry_count: entries.length,
    quick_summary: `Project contains ${entries.length} entries with ${Object.keys(topicFrequency).length} distinct topics.`
  };
}

async function thematicAnalyzeProject(entries) {
  // Group entries by existing topics
  const thematicGroups = {};
  
  entries.forEach(entry => {
    const topics = entry.existing_topics ? JSON.parse(entry.existing_topics) : ['uncategorized'];
    topics.forEach(topic => {
      if (!thematicGroups[topic]) {
        thematicGroups[topic] = [];
      }
      thematicGroups[topic].push({
        id: entry.id,
        title: entry.title,
        summary: entry.existing_summary || ''
      });
    });
  });

  return {
    thematic_groups: Object.entries(thematicGroups).map(([theme, entries]) => ({
      theme,
      entry_count: entries.length,
      entries: entries.slice(0, 5) // Show top 5 entries per theme
    })),
    total_themes: Object.keys(thematicGroups).length
  };
}

function calculateActivityScore(timeline, stats) {
  if (!timeline.length) return 0;
  
  const days = timeline.length;
  const totalEntries = stats.total_entries;
  const avgPerDay = totalEntries / days;
  
  // Simple scoring: more entries and consistent activity = higher score
  let score = Math.min(avgPerDay * 10, 50); // Max 50 from frequency
  score += Math.min(totalEntries / 5, 50); // Max 50 from volume
  
  return Math.round(score);
}
export default router;