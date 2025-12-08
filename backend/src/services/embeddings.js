/**
 * Embeddings Service
 * Generates and stores vector embeddings for memory entries using a simple approach.
 * For production: integrate with real embedding service (OpenAI, HuggingFace, etc.)
 */

import db from './db.js';

/**
 * Simple mock embedding generator for development
 * In production, replace with actual embedding service (OpenAI, sentence-transformers, etc.)
 */
function generateMockEmbedding(text) {
  // Create a deterministic embedding based on text content
  // This is NOT a real embedding - just a placeholder
  // Real implementation would call an actual embedding API
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 0);
  const embedding = new Array(384).fill(0); // 384-dim vector (MiniLM-L6-v2 size)
  
  // Hash words into embedding dimensions
  words.forEach((word, idx) => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash) + word.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    embedding[idx % 384] += (hash / 2147483647); // Normalize
  });
  
  // Normalize the vector
  const magnitude = Math.sqrt(embedding.reduce((sum, x) => sum + x * x, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }
  
  return embedding;
}

/**
 * Compute cosine similarity between two embedding vectors
 */
export function cosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same dimension');
  }
  
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }
  
  const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
  if (magnitude === 0) return 0;
  
  return dotProduct / magnitude;
}

/**
 * Generate and store embedding for a memory entry
 * @param {string} memoryEntryId - UUID of the memory entry
 * @param {string} text - Text content to embed (title + content)
 * @returns {Promise<Object>} Embedding record
 */
export async function generateEmbedding(memoryEntryId, text) {
  try {
    // Generate embedding vector
    const embedding = generateMockEmbedding(text);
    
    // Convert to JSON string for storage
    const embeddingJson = JSON.stringify(embedding);
    const buffer = Buffer.from(embeddingJson);
    
    // Store in database
    const result = await db.runAsync(
      `INSERT OR REPLACE INTO embeddings (memory_entry_id, embedding, model, updated_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [memoryEntryId, buffer, 'sentence-transformers/all-MiniLM-L6-v2']
    );
    
    return {
      id: result.lastID,
      memory_entry_id: memoryEntryId,
      embedding_size: embedding.length,
      model: 'sentence-transformers/all-MiniLM-L6-v2'
    };
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Retrieve embedding for a memory entry
 * @param {string} memoryEntryId - UUID of the memory entry
 * @returns {Promise<Array>} Embedding vector
 */
export async function getEmbedding(memoryEntryId) {
  try {
    const row = await db.getAsync(
      `SELECT embedding FROM embeddings WHERE memory_entry_id = ?`,
      [memoryEntryId]
    );
    
    if (!row) return null;
    
    // Parse embedding from buffer
    const embeddingJson = row.embedding.toString('utf8');
    return JSON.parse(embeddingJson);
  } catch (error) {
    console.error('Error retrieving embedding:', error);
    throw error;
  }
}

/**
 * Find similar entries using cosine similarity
 * @param {Array} queryEmbedding - Query embedding vector
 * @param {string} organizationId - Filter by organization
 * @param {number} limit - Number of results (default 10)
 * @param {number} minSimilarity - Minimum similarity threshold (0-1, default 0.3)
 * @returns {Promise<Array>} Similar entries with similarity scores
 */
export async function findSimilarEntries(queryEmbedding, organizationId, limit = 10, minSimilarity = 0.3) {
  try {
    // Get all embeddings for the organization
    const rows = await db.allAsync(
      `SELECT e.id, e.memory_entry_id, e.embedding, me.title, me.content, me.created_at
       FROM embeddings e
       JOIN memory_entries me ON e.memory_entry_id = me.id
       JOIN profiles p ON me.author_id = p.id
       WHERE p.organization = ?
       AND me.status = 'active'`,
      [organizationId]
    );
    
    // Compute similarity scores
    const similarities = rows.map(row => {
      const embeddingJson = row.embedding.toString('utf8');
      const storedEmbedding = JSON.parse(embeddingJson);
      const similarity = cosineSimilarity(queryEmbedding, storedEmbedding);
      
      return {
        memory_entry_id: row.memory_entry_id,
        title: row.title,
        similarity,
        created_at: row.created_at
      };
    });
    
    // Filter by threshold, sort by similarity, limit results
    return similarities
      .filter(s => s.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  } catch (error) {
    console.error('Error finding similar entries:', error);
    throw error;
  }
}

/**
 * Batch generate embeddings for multiple entries (e.g., for backfill)
 * @param {Array<{id, text}>} entries - Array of entries with id and text to embed
 * @returns {Promise<Array>} Generated embeddings
 */
export async function batchGenerateEmbeddings(entries) {
  const results = [];
  
  for (const entry of entries) {
    try {
      const result = await generateEmbedding(entry.id, entry.text);
      results.push({ ...result, success: true });
    } catch (error) {
      results.push({ memory_entry_id: entry.id, success: false, error: error.message });
    }
  }
  
  return results;
}

export default {
  generateEmbedding,
  getEmbedding,
  findSimilarEntries,
  cosineSimilarity,
  batchGenerateEmbeddings
};
