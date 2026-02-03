import express from "express";
import { promisify } from 'util';
import { authenticateToken } from "../../middleware/tokens.js";
import db from "../services/db.js";
import { generateEmbedding, getEmbedding, findSimilarEntries } from "../services/embeddings.js";
import { recordAction, getActionHistory, getUserActivitySummary, getMostReusedEntries } from "../services/actions.js";
import { analyzeContent } from '../services/ai.js';

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

/**
 * CREATE ENTRY
 * POST /api/entries
 * 
 * Flow: User selects "Add Knowledge" → either:
 * 1. Simple Upload: Fill title, content, tags, type
 * 2. AI-Assisted: Provide content, receive suggestions for tags/summary/category
 * 
 * Body:
 * {
 *   title: string (required)
 *   content: string
 *   entry_type: 'report' | 'meeting_note' | 'insight' | 'decision' | 'experiment' | 'outcome' | 'proposal' | 'result'
 *   project_id: uuid (optional)
 *   status: 'active' | 'archived' | 'lesson_learned' (default: 'active')
 *   tags: string[] (optional)
 *   metadata: {
 *     ai_generated_tags?: string[],
 *     ai_summary?: string,
 *     ai_category?: string,
 *     department_suggested?: string
 *   }
 *   parent_entry_id: uuid (optional - for timeline links)
 *   link_type: 'followed_from' | 'revised_by' | 'related_to' | 'built_upon' (optional)
 * }
 */
router.post('/', authenticateToken(), async (req, res) => {
  try {
    const {
      title,
      content,
      entry_type = 'insight',
      project_id,
      status = 'active',
      tags = [],
      metadata = {},
      parent_entry_id,
      link_type = 'followed_from'
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const org = await db.getAsync(`
      SELECT organization_id FROM projects WHERE id = ?
    `, [project_id])

    const user = req.user;
    const tagsArray = Array.isArray(tags) ? tags : [];

    // Insert the memory entry
    const result = await db.runAsync(
      `INSERT INTO memory_entries 
      (title, content, entry_type, project_id, author_id, status, department, tags, metadata, created_at, updated_at, organization_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)`,
      [
        title,
        content || null,
        entry_type,
        project_id || null,
        user.id,
        status,
        user.department || null,
        JSON.stringify(tagsArray),
        JSON.stringify(metadata || {}),
        org.organization_id
      ]
    );

    const entryId = result.lastID;

    // Generate embedding and AI analysis asynchronously (don't block response too long)
    (async () => {
      try {
        const textToEmbed = `${title}\n\n${content || ''}`;
        await generateEmbedding(entryId, textToEmbed);

        // Run AI analysis to populate metadata (summary, tags, category)
        try {
          const aiMeta = await analyzeContent(textToEmbed);
          const mergedMeta = Object.assign({}, metadata || {}, aiMeta);
          await db.runAsync(
            `UPDATE memory_entries SET metadata = ? WHERE id = ?`,
            [JSON.stringify(mergedMeta), entryId]
          );
        } catch (aiErr) {
          console.warn('AI analysis failed for entry', entryId, aiErr);
        }
      } catch (err) {
        console.warn('Embedding generation failed for entry', entryId, err);
      }
    })();

    if (parent_entry_id) {
      try {
        await db.runAsync(
          `INSERT INTO entry_links (parent_entry_id, child_entry_id, link_type, created_at)
           VALUES (?, ?, ?, datetime('now'))`,
          [parent_entry_id, entryId, link_type]
        );
      } catch (linkError) {
        console.warn('Failed to create timeline link:', linkError);
        // Don't fail the entry creation if link fails
      }
    }

    // Fetch the created entry with author details embedding
    const entry = await db.getAsync(
      `SELECT me.*, p.full_name as author_name, p.department as author_department
       FROM memory_entries me
       JOIN profiles p ON p.id = me.author_id
       WHERE me.id = ?`,
      [entryId]
    );

    res.status(201).json({
      message: 'Entry created successfully',
      entry: {
        id: entry.id,
        title: entry.title,
        content: entry.content,
        entry_type: entry.entry_type,
        project_id: entry.project_id,
        author_id: entry.author_id,
        author_name: entry.author_name,
        status: entry.status,
        department: entry.department,
        tags: JSON.parse(entry.tags || '[]'),
        metadata: JSON.parse(entry.metadata || '{}'),
        created_at: entry.created_at,
        updated_at: entry.updated_at
      }
    });
  } catch (error) {
    console.error('Entry creation error:', error);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

/**
 * SEARCH & BROWSE ENTRIES
 * GET /api/entries
 * 
 * Flow: User wants to find knowledge via:
 * 1. Browse Timeline: See history visually, sorted by creation date
 * 2. Smart Search: Filter by text, department, status, person, tags
 * 
 * Query params:
 * - q: search query (searches title and content)
 * - entry_type: filter by type
 * - status: filter by status
 * - department: filter by department
 * - project_id: filter by project
 * - tags: comma-separated tags to filter
 * - author_id: filter by specific author
 * - sort: 'created_at' (default), 'updated_at', 'title'
 * - order: 'desc' (default), 'asc'
 * - limit: items per page (default: 20, max: 100)
 * - offset: pagination offset (default: 0)
 */
router.get('/', authenticateToken(), async (req, res) => {
  try {
    const {
      q = '',
      entry_type,
      status,
      department,
      project_id,
      tags,
      author_id,
      sort = 'created_at',
      order = 'desc',
      limit = 20,
      offset = 0
    } = req.query;

    const parsedLimit = Math.min(parseInt(limit) || 20, 100);
    const parsedOffset = parseInt(offset) || 0;

    let query = `
      SELECT me.*, 
             p.full_name as author_name,
             p.department as author_department,
             p.organization,
             COUNT(*) OVER() as total_count
      FROM memory_entries me
      JOIN profiles p ON p.id = me.author_id
      WHERE p.organization = ?
    `;

    const params = [req.user.organization];

    // Full text search on title and content
    if (q) {
      query += ` AND (me.title LIKE ? OR me.content LIKE ?)`;
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm);
    }

    // Filter by entry type
    if (entry_type) {
      query += ` AND me.entry_type = ?`;
      params.push(entry_type);
    }

    // Filter by status
    if (status) {
      query += ` AND me.status = ?`;
      params.push(status);
    }

    // Filter by department
    if (department) {
      query += ` AND me.department = ?`;
      params.push(department);
    }

    // Filter by project
    if (project_id) {
      query += ` AND me.project_id = ?`;
      params.push(project_id);
    }

    // Filter by author
    if (author_id) {
      query += ` AND me.author_id = ?`;
      params.push(author_id);
    }

    // Filter by tags (JSON array in SQLite)
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      tagArray.forEach((tag) => {
        query += ` AND me.tags LIKE ?`;
        params.push(`%"${tag}"%`);
      });
    }

    // Order
    const validSortFields = ['created_at', 'updated_at', 'title'];
    const validOrder = order === 'asc' ? 'ASC' : 'DESC';
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    query += ` ORDER BY me.${sortField} ${validOrder}`;

    // Pagination
    query += ` LIMIT ? OFFSET ?`;
    params.push(parsedLimit, parsedOffset);

    const entries = await db.allAsync(query, params);

    const totalCount = entries.length > 0 ? entries[0].total_count : 0;

    const formattedEntries = entries.map(entry => ({
      id: entry.id,
      title: entry.title,
      content: entry.content,
      entry_type: entry.entry_type,
      project_id: entry.project_id,
      author_id: entry.author_id,
      author_name: entry.author_name,
      author_department: entry.author_department,
      status: entry.status,
      department: entry.department,
      tags: JSON.parse(entry.tags || '[]'),
      metadata: JSON.parse(entry.metadata || '{}'),
      created_at: entry.created_at,
      updated_at: entry.updated_at
    }));

    res.json({
      entries: formattedEntries,
      pagination: {
        total: totalCount,
        limit: parsedLimit,
        offset: parsedOffset,
        returned: formattedEntries.length
      }
    });
  } catch (error) {
    console.error('Entry search error:', error);
    res.status(500).json({ error: 'Failed to search entries' });
  }
});

/**
 * GET SINGLE ENTRY WITH CONTEXT
 * GET /api/entries/:id
 * 
 * Flow: User clicks on entry to "View Context"
 * Returns: Full entry + linked entries (parent/child for timeline story)
 */
router.get('/:id', authenticateToken(), async (req, res) => {
  try {
    const { id } = req.params;

    // Get main entry
    const entry = await db.getAsync(
      `SELECT me.*, 
              p.full_name as author_name,
              p.department as author_department,
              p.organization
       FROM memory_entries me
       JOIN profiles p ON p.id = me.author_id
       WHERE me.id = ? AND p.organization = ?`,
      [id, req.user.organization]
    );

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Get related entries through timeline links
    const relatedEntries = await db.allAsync(
      `SELECT tl.link_type,
              CASE 
                WHEN tl.parent_entry_id = ? THEN tl.child_entry_id
                ELSE tl.parent_entry_id
              END as related_id,
              me.title,
              me.entry_type,
              me.status,
              me.created_at,
              p.full_name as author_name
       FROM timeline_links tl
       JOIN memory_entries me ON (
         (tl.parent_entry_id = me.id AND tl.child_entry_id = ?) OR
         (tl.child_entry_id = me.id AND tl.parent_entry_id = ?)
       )
       JOIN profiles p ON p.id = me.author_id
       WHERE p.organization = ?`,
      [id, id, id, req.user.organization]
    );

    res.json({
      entry: {
        id: entry.id,
        title: entry.title,
        content: entry.content,
        entry_type: entry.entry_type,
        project_id: entry.project_id,
        author_id: entry.author_id,
        author_name: entry.author_name,
        author_department: entry.author_department,
        status: entry.status,
        department: entry.department,
        tags: JSON.parse(entry.tags || '[]'),
        metadata: JSON.parse(entry.metadata || '{}'),
        created_at: entry.created_at,
        updated_at: entry.updated_at
      },
      connections: relatedEntries.map(rel => ({
        id: rel.related_id,
        title: rel.title,
        entry_type: rel.entry_type,
        status: rel.status,
        author_name: rel.author_name,
        link_type: rel.link_type,
        created_at: rel.created_at
      }))
    });
  } catch (error) {
    console.error('Entry fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch entry' });
  }
});

/**
 * UPDATE ENTRY
 * PUT /api/entries/:id
 * 
 * Flow: User "Adds to Knowledge" by:
 * - Linking new insights
 * - Updating status (e.g., to 'lesson_learned')
 * - Adding tags/metadata
 * 
 * Body: Any combination of:
 * {
 *   title?: string,
 *   content?: string,
 *   status?: 'active' | 'archived' | 'lesson_learned',
 *   tags?: string[],
 *   metadata?: object
 * }
 */
router.put('/:id', authenticateToken(), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, status, tags, metadata } = req.body;

    // Verify ownership
    const entry = await db.getAsync(
      'SELECT * FROM memory_entries WHERE id = ?',
      [id]
    );

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (entry.author_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your own entries' });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(tags));
    }
    if (metadata !== undefined) {
      updates.push('metadata = ?');
      values.push(JSON.stringify(metadata));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push('updated_at = datetime("now")');
    values.push(id);

    const updateQuery = `UPDATE memory_entries SET ${updates.join(', ')} WHERE id = ?`;

    await db.runAsync(updateQuery, values);

    // Fetch updated entry
    const updatedEntry = await db.getAsync(
      `SELECT me.*, 
              p.full_name as author_name
       FROM memory_entries me
       JOIN profiles p ON p.id = me.author_id
       WHERE me.id = ?`,
      [id]
    );

    res.json({
      message: 'Entry updated successfully',
      entry: {
        id: updatedEntry.id,
        title: updatedEntry.title,
        content: updatedEntry.content,
        entry_type: updatedEntry.entry_type,
        status: updatedEntry.status,
        department: updatedEntry.department,
        tags: JSON.parse(updatedEntry.tags || '[]'),
        metadata: JSON.parse(updatedEntry.metadata || '{}'),
        created_at: updatedEntry.created_at,
        updated_at: updatedEntry.updated_at
      }
    });
  } catch (error) {
    console.error('Entry update error:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

/**
 * DELETE ENTRY
 * DELETE /api/entries/:id
 */
router.delete('/:id', authenticateToken(), async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const entry = await db.getAsync(
      'SELECT * FROM memory_entries WHERE id = ?',
      [id]
    );

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (entry.author_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own entries' });
    }

    await db.runAsync('DELETE FROM memory_entries WHERE id = ?', [id]);

    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Entry delete error:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

/**
 * CREATE TIMELINE LINK
 * POST /api/entries/:id/links
 * 
 * Flow: User "Links new insights" - creates connections between entries
 * 
 * Body:
 * {
 *   related_entry_id: uuid (required),
 *   link_type: 'followed_from' | 'revised_by' | 'related_to' | 'built_upon' (required)
 * }
 */
router.post('/:id/links', authenticateToken(), async (req, res) => {
  try {
    const { id: parentId } = req.params;
    const { related_entry_id: childId, link_type = 'related_to' } = req.body;

    if (!childId) {
      return res.status(400).json({ error: 'related_entry_id is required' });
    }

    // Verify both entries exist and user has access
    const parentEntry = await db.getAsync(
      `SELECT me.* FROM memory_entries me
       JOIN profiles p ON p.id = me.author_id
       WHERE me.id = ? AND p.organization = ?`,
      [parentId, req.user.organization]
    );

    const childEntry = await db.getAsync(
      `SELECT me.* FROM memory_entries me
       JOIN profiles p ON p.id = me.author_id
       WHERE me.id = ? AND p.organization = ?`,
      [childId, req.user.organization]
    );

    if (!parentEntry || !childEntry) {
      return res.status(404).json({ error: 'One or both entries not found' });
    }

    // Create the link
    try {
      await db.runAsync(
        `INSERT INTO timeline_links (parent_entry_id, child_entry_id, link_type, created_at)
         VALUES (?, ?, ?, datetime('now'))`,
        [parentId, childId, link_type]
      );

      res.status(201).json({
        message: 'Link created successfully',
        link: {
          parent_entry_id: parentId,
          child_entry_id: childId,
          link_type: link_type
        }
      });
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Link already exists' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Link creation error:', error);
    res.status(500).json({ error: 'Failed to create link' });
  }
});

/**
 * GET TIMELINE FOR PROJECT
 * GET /api/entries/timeline/:projectId
 * 
 * Flow: User "Sees history visually" - gets full timeline tree for a project
 * Returns entries organized with their connections
 */
router.get('/timeline/:projectId', authenticateToken(), async (req, res) => {
  try {
    const { projectId } = req.params;

    const org = await db.getAsync(
      'SELECT organization_id FROM user_organizations WHERE user_id = ?',
      [req.user.id]
    );

    // Get all entries for the project
    const entries = await db.allAsync(
      `SELECT me.*, 
              p.full_name as author_name,
              p.department as author_department,
              pr.title as project_title,
              me.metadata as metadata
      FROM memory_entries me
      JOIN profiles p ON p.id = me.author_id
      JOIN projects pr ON pr.id = me.project_id
      WHERE me.project_id = ? 
        AND pr.organization_id = ?
      ORDER BY me.created_at ASC`,
      [projectId, org.organization_id]
    );

    if (entries.length === 0) {
      return res.json({ entries: [] });
    }

    // Get all links
    const links = await db.allAsync(
      `SELECT tl.* FROM entry_links tl
       JOIN memory_entries parent ON parent.id = tl.parent_entry_id
       JOIN memory_entries child ON child.id = tl.child_entry_id
       WHERE parent.project_id = ? AND child.project_id = ?`,
      [projectId, projectId]
    );

    // Build maps for relationships
    const parentToChildren = new Map();
    const childToParent = new Map();
    
    // Populate relationship maps
    links.forEach(link => {
      // Parent -> Children mapping
      if (!parentToChildren.has(link.parent_entry_id)) {
        parentToChildren.set(link.parent_entry_id, []);
      }
      parentToChildren.get(link.parent_entry_id).push({
        childId: link.child_entry_id,
        linkType: link.link_type
      });
      
      // Child -> Parent mapping
      childToParent.set(link.child_entry_id, {
        parentId: link.parent_entry_id,
        linkType: link.link_type
      });
    });

    // Enhance entries with relationship info
    const enhancedEntries = entries.map(entry => {
      const enhanced = {
        id: entry.id,
        title: entry.title,
        content: entry.content,
        entry_type: entry.entry_type,
        metadata: JSON.parse(entry.metadata),
        status: entry.status,
        author_name: entry.author_name,
        author_department: entry.author_department,
        created_at: entry.created_at,
        project_title: entry.project_title,
        isRoot: !childToParent.has(entry.id), // No parent = root entry
        isParent: parentToChildren.has(entry.id), // Has children = parent
        isChild: childToParent.has(entry.id), // Has parent = child
        parentId: childToParent.has(entry.id) ? childToParent.get(entry.id).parentId : null,
        parentLinkType: childToParent.has(entry.id) ? childToParent.get(entry.id).linkType : null,
        children: parentToChildren.has(entry.id) 
          ? parentToChildren.get(entry.id).map(link => ({
              id: link.childId,
              link_type: link.linkType
            }))
          : [],
        childrenCount: parentToChildren.has(entry.id) ? parentToChildren.get(entry.id).length : 0
      };
      
      return enhanced;
    });

    // Build hierarchical structure for the frontend
    const buildHierarchicalEntries = () => {
      const entryMap = new Map();
      
      // First pass: create basic entry objects
      enhancedEntries.forEach(entry => {
        entryMap.set(entry.id, {
          ...entry,
          children: [] // Will populate with actual child objects
        });
      });
      
      // Second pass: build parent-child relationships
      enhancedEntries.forEach(entry => {
        if (entry.parentId && entryMap.has(entry.parentId)) {
          const parentEntry = entryMap.get(entry.parentId);
          const childEntry = entryMap.get(entry.id);
          
          // Add child to parent's children array
          parentEntry.children.push(childEntry);
          
          // Mark child as having a parent reference
          childEntry.parent = {
            id: parentEntry.id,
            title: parentEntry.title,
            link_type: entry.parentLinkType
          };
        }
      });
      
      // Get root entries (entries without parents)
      const rootEntries = Array.from(entryMap.values())
        .filter(entry => !entry.parentId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      return rootEntries;
    };

    // Alternative: Flat array with relationship info (for simpler frontend handling)
    const flatEntriesWithRelationships = enhancedEntries.map(entry => {
      const flatEntry = { ...entry };
      
      // Get parent title if exists
      if (entry.parentId) {
        const parentEntry = enhancedEntries.find(e => e.id === entry.parentId);
        if (parentEntry) {
          flatEntry.parent = {
            id: parentEntry.id,
            title: parentEntry.title,
            link_type: entry.parentLinkType
          };
        }
      }
      
      // Get child titles if exists
      if (entry.children && entry.children.length > 0) {
        flatEntry.children = entry.children.map(childLink => {
          const childEntry = enhancedEntries.find(e => e.id === childLink.id);
          return childEntry ? {
            id: childEntry.id,
            title: childEntry.title,
            link_type: childLink.link_type
          } : childLink;
        });
      }
      
      return flatEntry;
    });

    // Return both formats for flexibility
    res.json({ 
      entries: flatEntriesWithRelationships,
      hierarchy: buildHierarchicalEntries(),
      // For backwards compatibility
      timeline: buildHierarchicalEntries()
    });
    
  } catch (error) {
    console.error('Timeline fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

/**
 * GET STATISTICS
 * GET /api/entries/stats
 * 
 * Flow: Leaders see dashboard with:
 * - Knowledge health (active vs archived/lesson_learned)
 * - Team engagement (contributors, average entries per user)
 * - Risk areas (incomplete entries, outdated knowledge)
 */
router.get('/stats/dashboard', authenticateToken(), async (req, res) => {
  try {
    // Total entries
    const totalResult = await db.getAsync(
      `SELECT COUNT(*) as count FROM memory_entries me
       JOIN profiles p ON p.id = me.author_id
       WHERE p.organization = ?`,
      [req.user.organization]
    );

    // Entries by status
    const statusResult = await db.allAsync(
      `SELECT status, COUNT(*) as count FROM memory_entries me
       JOIN profiles p ON p.id = me.author_id
       WHERE p.organization = ?
       GROUP BY status`,
      [req.user.organization]
    );

    // Unique contributors
    const contributorsResult = await db.getAsync(
      `SELECT COUNT(DISTINCT author_id) as count FROM memory_entries me
       JOIN profiles p ON p.id = me.author_id
       WHERE p.organization = ?`,
      [req.user.organization]
    );

    // Entries by type
    const typeResult = await db.allAsync(
      `SELECT entry_type, COUNT(*) as count FROM memory_entries me
       JOIN profiles p ON p.id = me.author_id
       WHERE p.organization = ?
       GROUP BY entry_type`,
      [req.user.organization]
    );

    // Recent entries (last 7 days)
    const recentResult = await db.getAsync(
      `SELECT COUNT(*) as count FROM memory_entries me
       JOIN profiles p ON p.id = me.author_id
       WHERE p.organization = ? AND me.created_at > datetime('now', '-7 days')`,
      [req.user.organization]
    );

    res.json({
      stats: {
        totalEntries: totalResult.count,
        activeContributors: contributorsResult.count,
        recentEntries: recentResult.count,
        byStatus: Object.fromEntries(statusResult.map(s => [s.status, s.count])),
        byType: Object.fromEntries(typeResult.map(t => [t.entry_type, t.count]))
      }
    });
    } catch (error) {
      console.error('Stats fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  });

/**
 * SEMANTIC SEARCH
 * POST /api/entries/search/semantic
 * 
 * Search using vector embeddings (cosine similarity)
 * Body: { query: string, limit?: number, minSimilarity?: number (0-1) }
 */
router.post('/search/semantic', authenticateToken(), async (req, res) => {
  try {
    const { query, limit = 10, minSimilarity = 0.3 } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query text is required' });
    }
    
    // Get user's organization
    const user = await db.getAsync(
      'SELECT organization FROM profiles WHERE id = ?',
      [req.user.id]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate embedding for query
    const { generateMockEmbedding } = await import('../services/embeddings.js');
    const queryEmbedding = (await import('../services/embeddings.js')).cosineSimilarity;
    const embedding = (await import('../services/embeddings.js')).generateMockEmbedding || 
      ((text) => {
        const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 0);
        const emb = new Array(384).fill(0);
        words.forEach((word, idx) => {
          let hash = 0;
          for (let i = 0; i < word.length; i++) {
            hash = ((hash << 5) - hash) + word.charCodeAt(i);
            hash = hash & hash;
          }
          emb[idx % 384] += (hash / 2147483647);
        });
        const mag = Math.sqrt(emb.reduce((sum, x) => sum + x * x, 0));
        if (mag > 0) {
          for (let i = 0; i < emb.length; i++) {
            emb[i] /= mag;
          }
        }
        return emb;
      });
    
    const queryVector = embedding(query);
    
    // Find similar entries
    const results = await findSimilarEntries(queryVector, user.organization, limit, minSimilarity);
    
    res.json({
      query,
      results,
      count: results.length
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({ error: 'Semantic search failed' });
  }
});

/**
 * RECORD USER ACTION
 * POST /api/entries/:id/action
 * 
 * Track user interactions: reuse, share, edit, rate, view
 * Body: { action_type: 'reuse'|'share'|'edit'|'rate'|'view', rating?: 1-5 }
 */
router.post('/:id/action', authenticateToken(), async (req, res) => {
  try {
    const { id } = req.params;
    const { action_type, rating } = req.body;
    
    if (!action_type) {
      return res.status(400).json({ error: 'action_type is required' });
    }
    
    // Validate action type
    const validActions = ['reuse', 'share', 'edit', 'rate', 'view'];
    if (!validActions.includes(action_type)) {
      return res.status(400).json({ error: `Invalid action_type. Must be one of: ${validActions.join(', ')}` });
    }
    
    // Verify entry exists and user has access
    const entry = await db.getAsync(
      `SELECT me.id FROM memory_entries me
       JOIN profiles p ON me.author_id = p.id
       WHERE me.id = ? AND p.organization = (SELECT organization FROM profiles WHERE id = ?)`,
      [id, req.user.id]
    );
    
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found or not accessible' });
    }
    
    // Record action
    const action = await recordAction(req.user.id, id, action_type, {
      rating: action_type === 'rate' ? rating : null
    });
    
    res.json({
      success: true,
      action
    });
  } catch (error) {
    console.error('Record action error:', error);
    res.status(500).json({ error: 'Failed to record action' });
  }
});

/**
 * GET ACTION HISTORY
 * GET /api/entries/:id/actions
 * 
 * Retrieve all actions recorded for an entry
 * Query: ?limit=100&actionType=reuse
 */
router.get('/:id/actions', authenticateToken(), async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100, actionType } = req.query;
    
    // Verify entry exists and user has access
    const entry = await db.getAsync(
      `SELECT me.id FROM memory_entries me
       JOIN profiles p ON me.author_id = p.id
       WHERE me.id = ? AND p.organization = (SELECT organization FROM profiles WHERE id = ?)`,
      [id, req.user.id]
    );
    
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found or not accessible' });
    }
    
    // Get action history
    const actions = await getActionHistory(id, {
      actionType,
      limit: Math.min(parseInt(limit) || 100, 1000)
    });
    
    res.json({
      memory_entry_id: id,
      actions,
      count: actions.length
    });
  } catch (error) {
    console.error('Get actions error:', error);
    res.status(500).json({ error: 'Failed to fetch action history' });
  }
});

/**
 * GET USER ACTIVITY SUMMARY
 * GET /api/entries/user/activity
 * 
 * Get user's activity metrics and top entries
 */
router.get('/user/activity', authenticateToken(), async (req, res) => {
  try {
    const user = await db.getAsync(
      'SELECT organization FROM profiles WHERE id = ?',
      [req.user.id]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const summary = await getUserActivitySummary(req.user.id, user.organization);
    
    res.json(summary);
  } catch (error) {
    console.error('Activity summary error:', error);
    res.status(500).json({ error: 'Failed to fetch activity summary' });
  }
});

/**
 * GET SIMILARITY GRAPH
 * GET /api/entries/:id/graph
 * 
 * Get related entries, analytics, and recommendation data
 * Returns: { entry, related_entries, analytics, recommendations }
 */
router.get('/:id/graph', authenticateToken(), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the entry with full details
    const entry = await db.getAsync(
      `SELECT me.* FROM memory_entries me
       JOIN profiles p ON me.author_id = p.id
       WHERE me.id = ? AND p.organization = (SELECT organization FROM profiles WHERE id = ?)`,
      [id, req.user.id]
    );
    
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found or not accessible' });
    }
    
    // Get related entries via timeline links
    const related = await db.allAsync(
      `SELECT me.id, me.title, me.entry_type, me.created_at, tl.link_type
       FROM memory_entries me
       JOIN timeline_links tl ON (
         (tl.parent_entry_id = ? AND tl.child_entry_id = me.id) OR
         (tl.child_entry_id = ? AND tl.parent_entry_id = me.id)
       )
       WHERE me.status = 'active'
       ORDER BY me.created_at DESC
       LIMIT 20`,
      [id, id]
    );
    
    // Get action analytics
    const actions = await db.getAsync(
      `SELECT 
        COUNT(CASE WHEN action_type = 'reuse' THEN 1 END) as reuse_count,
        COUNT(CASE WHEN action_type = 'share' THEN 1 END) as share_count,
        COUNT(CASE WHEN action_type = 'view' THEN 1 END) as view_count,
        AVG(CASE WHEN action_type = 'rate' THEN rating END) as avg_rating,
        COUNT(DISTINCT CASE WHEN action_type = 'rate' THEN 1 END) as rating_count
       FROM user_memory_actions
       WHERE memory_entry_id = ?`,
      [id]
    );
    
    res.json({
      entry,
      related_entries: related || [],
      analytics: {
        reuse_count: actions?.reuse_count || 0,
        share_count: actions?.share_count || 0,
        view_count: actions?.view_count || 0,
        avg_rating: actions?.avg_rating || null,
        rating_count: actions?.rating_count || 0
      }
    });
  } catch (error) {
    console.error('Graph fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch similarity graph' });
  }
});

/**
 * GET ORGANIZATION INSIGHTS
 * GET /api/entries/insights/organization
 * 
 * Returns org-level analytics: most reused, low-rated, trending entries
 */
router.get('/insights/organization', authenticateToken(), async (req, res) => {
  try {
    const user = await db.getAsync(
      'SELECT organization FROM profiles WHERE id = ?',
      [req.user.id]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get most reused entries
    const mostReused = await getMostReusedEntries(user.organization, 10);
    
    // Get trending (recently created, high engagement)
    const trending = await db.allAsync(
      `SELECT 
        me.id, me.title, me.created_at,
        COUNT(CASE WHEN uma.action_type = 'reuse' THEN 1 END) as reuse_count,
        COUNT(CASE WHEN uma.action_type = 'share' THEN 1 END) as share_count
       FROM memory_entries me
       LEFT JOIN user_memory_actions uma ON me.id = uma.memory_entry_id
       WHERE EXISTS (
         SELECT 1 FROM profiles p
         WHERE p.id = me.author_id AND p.organization = ?
       )
       AND me.created_at > datetime('now', '-7 days')
       GROUP BY me.id
       ORDER BY (reuse_count + share_count) DESC
       LIMIT 10`,
      [user.organization]
    );
    
    res.json({
      organization: user.organization,
      most_reused: mostReused || [],
      trending: trending || []
    });
  } catch (error) {
    console.error('Organization insights error:', error);
    res.status(500).json({ error: 'Failed to fetch organization insights' });
  }
});

export default router;