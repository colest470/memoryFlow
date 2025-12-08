/**
 * User Memory Actions Service
 * Tracks user interactions (reuse, share, edit, rate, view) for ranking and feedback loop
 */

import db from './db.js';

/**
 * Record a user action on a memory entry
 * @param {string} userId - UUID of the user
 * @param {string} memoryEntryId - UUID of the memory entry
 * @param {string} actionType - Type of action: 'reuse', 'share', 'edit', 'rate', 'view'
 * @param {Object} options - Additional options (rating, actionValue, etc.)
 * @returns {Promise<Object>} Action record
 */
export async function recordAction(userId, memoryEntryId, actionType, options = {}) {
  try {
    const { rating = null, actionValue = null } = options;
    
    const result = await db.runAsync(
      `INSERT INTO user_memory_actions (user_id, memory_entry_id, action_type, rating, action_value)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, memoryEntryId, actionType, rating, actionValue]
    );
    
    // Update memory_entries metadata with action count
    await updateEntryActionMetadata(memoryEntryId, actionType);
    
    return {
      id: result.lastID,
      user_id: userId,
      memory_entry_id: memoryEntryId,
      action_type: actionType,
      rating,
      created_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error recording action:', error);
    throw error;
  }
}

/**
 * Update memory entry metadata with action counts
 * Increments reuse count, share count, rating average, etc.
 */
async function updateEntryActionMetadata(memoryEntryId, actionType) {
  try {
    const entry = await db.getAsync(
      `SELECT metadata FROM memory_entries WHERE id = ?`,
      [memoryEntryId]
    );
    
    if (!entry) return;
    
    let metadata = {};
    if (entry.metadata) {
      try {
        metadata = JSON.parse(entry.metadata);
      } catch (e) {
        // Handle invalid JSON
      }
    }
    
    // Initialize or increment counters
    if (!metadata.actionCounts) {
      metadata.actionCounts = {
        reuse: 0,
        share: 0,
        edit: 0,
        view: 0
      };
    }
    
    if (actionType === 'reuse') {
      metadata.actionCounts.reuse = (metadata.actionCounts.reuse || 0) + 1;
    } else if (actionType === 'share') {
      metadata.actionCounts.share = (metadata.actionCounts.share || 0) + 1;
    } else if (actionType === 'edit') {
      metadata.actionCounts.edit = (metadata.actionCounts.edit || 0) + 1;
    } else if (actionType === 'view') {
      metadata.actionCounts.view = (metadata.actionCounts.view || 0) + 1;
    }
    
    // Update last action time
    metadata.lastActionAt = new Date().toISOString();
    
    await db.runAsync(
      `UPDATE memory_entries SET metadata = ?, updated_at = datetime('now') WHERE id = ?`,
      [JSON.stringify(metadata), memoryEntryId]
    );
  } catch (error) {
    console.error('Error updating entry metadata:', error);
    // Don't throw - metadata update is non-critical
  }
}

/**
 * Get action history for an entry
 * @param {string} memoryEntryId - UUID of the memory entry
 * @param {Object} filters - Filter options (userId, actionType, limit)
 * @returns {Promise<Array>} Action records
 */
export async function getActionHistory(memoryEntryId, filters = {}) {
  try {
    const { userId = null, actionType = null, limit = 100 } = filters;
    
    let query = `
      SELECT id, user_id, action_type, rating, action_value, created_at
      FROM user_memory_actions
      WHERE memory_entry_id = ?
    `;
    const params = [memoryEntryId];
    
    if (userId) {
      query += ` AND user_id = ?`;
      params.push(userId);
    }
    
    if (actionType) {
      query += ` AND action_type = ?`;
      params.push(actionType);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);
    
    return await db.allAsync(query, params);
  } catch (error) {
    console.error('Error fetching action history:', error);
    throw error;
  }
}

/**
 * Get user activity summary
 * @param {string} userId - UUID of the user
 * @param {string} organizationId - Organization UUID for scoping
 * @returns {Promise<Object>} Activity summary
 */
export async function getUserActivitySummary(userId, organizationId) {
  try {
    // Get action counts by type
    const actionCounts = await db.getAsync(
      `SELECT 
        action_type,
        COUNT(*) as count
       FROM user_memory_actions
       WHERE user_id = ? AND memory_entry_id IN (
         SELECT me.id FROM memory_entries me
         JOIN profiles p ON me.author_id = p.id
         WHERE p.organization = ?
       )
       GROUP BY action_type`,
      [userId, organizationId]
    );
    
    // Get entries with highest engagement (reuse + share counts)
    const topEntries = await db.allAsync(
      `SELECT 
        me.id,
        me.title,
        COUNT(CASE WHEN uma.action_type = 'reuse' THEN 1 END) as reuse_count,
        COUNT(CASE WHEN uma.action_type = 'share' THEN 1 END) as share_count,
        AVG(CASE WHEN uma.action_type = 'rate' THEN uma.rating END) as avg_rating
       FROM memory_entries me
       LEFT JOIN user_memory_actions uma ON me.id = uma.memory_entry_id
       WHERE me.author_id = ? AND 
             EXISTS (
               SELECT 1 FROM profiles p 
               WHERE p.id = me.author_id AND p.organization = ?
             )
       GROUP BY me.id
       ORDER BY (reuse_count + share_count) DESC
       LIMIT 10`,
      [userId, organizationId]
    );
    
    return {
      user_id: userId,
      action_counts: actionCounts || {},
      top_entries: topEntries || [],
      last_activity: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error computing activity summary:', error);
    throw error;
  }
}

/**
 * Get most reused entries in organization
 * @param {string} organizationId - Organization UUID
 * @param {number} limit - Number of entries to return
 * @returns {Promise<Array>} Most reused entries
 */
export async function getMostReusedEntries(organizationId, limit = 10) {
  try {
    return await db.allAsync(
      `SELECT 
        me.id,
        me.title,
        me.author_id,
        me.created_at,
        COUNT(CASE WHEN uma.action_type = 'reuse' THEN 1 END) as reuse_count,
        COUNT(CASE WHEN uma.action_type = 'share' THEN 1 END) as share_count,
        AVG(CASE WHEN uma.action_type = 'rate' THEN uma.rating END) as avg_rating
       FROM memory_entries me
       LEFT JOIN user_memory_actions uma ON me.id = uma.memory_entry_id
       WHERE EXISTS (
         SELECT 1 FROM profiles p
         WHERE p.id = me.author_id AND p.organization = ?
       )
       GROUP BY me.id
       ORDER BY reuse_count DESC
       LIMIT ?`,
      [organizationId, limit]
    );
  } catch (error) {
    console.error('Error fetching most reused entries:', error);
    throw error;
  }
}

/**
 * Get entries with lowest ratings (potential improvement opportunities)
 * @param {string} organizationId - Organization UUID
 * @param {number} limit - Number of entries to return
 * @returns {Promise<Array>} Low-rated entries
 */
export async function getLowRatedEntries(organizationId, limit = 10) {
  try {
    return await db.allAsync(
      `SELECT 
        me.id,
        me.title,
        me.author_id,
        AVG(CASE WHEN uma.action_type = 'rate' THEN uma.rating END) as avg_rating,
        COUNT(CASE WHEN uma.action_type = 'rate' THEN 1 END) as rating_count
       FROM memory_entries me
       LEFT JOIN user_memory_actions uma ON me.id = uma.memory_entry_id
       WHERE EXISTS (
         SELECT 1 FROM profiles p
         WHERE p.id = me.author_id AND p.organization = ?
       )
       AND uma.action_type = 'rate'
       GROUP BY me.id
       HAVING rating_count > 0
       ORDER BY avg_rating ASC
       LIMIT ?`,
      [organizationId, limit]
    );
  } catch (error) {
    console.error('Error fetching low-rated entries:', error);
    throw error;
  }
}

export default {
  recordAction,
  getActionHistory,
  getUserActivitySummary,
  getMostReusedEntries,
  getLowRatedEntries
};
