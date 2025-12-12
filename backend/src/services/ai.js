/**
 * AI Analysis Service
 * Provides mock AI analysis for entry content
 * For production: integrate with real AI service (OpenAI, Gemini, etc.)
 */

/**
 * Analyze entry content and generate metadata
 * Mock implementation for development
 * @param {string} title - Entry title
 * @param {string} content - Entry content
 * @returns {Promise<Object>} Analysis results with tags, summary, category
 */
export async function analyzeContent(title, content) {
  try {
    // Simple mock analysis - extract keywords, create summary
    const text = `${title} ${content}`.toLowerCase();
    
    // Extract tags from content (simple word-frequency approach)
    const tags = extractTagsFromText(text);
    
    // Create simple summary (first 2 sentences or first 150 chars)
    const summary = extractSummary(content);
    
    // Categorize based on keywords
    const category = categorizeContent(text);
    
    return {
      tags,
      summary,
      category,
      confidence: 'medium',
      analyzed_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error analyzing content:', error);
    throw error;
  }
}

/**
 * Extract tags from text using simple word frequency
 */
function extractTagsFromText(text) {
  // Common stop words to exclude
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
    'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how'
  ]);
  
  const words = text
    .split(/\W+/)
    .filter(w => w.length > 3 && !stopWords.has(w.toLowerCase()))
    .slice(0, 20);
  
  // Count word frequencies
  const freq = {};
  words.forEach(word => {
    freq[word] = (freq[word] || 0) + 1;
  });
  
  // Get top tags
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

/**
 * Extract summary from content
 */
function extractSummary(content) {
  if (!content) return '';
  
  // Get first 2 sentences or 150 characters
  const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s);
  const summary = sentences.slice(0, 2).join('. ');
  
  return summary.length > 150 ? summary.substring(0, 150) + '...' : summary;
}

/**
 * Categorize content based on keywords
 */
function categorizeContent(text) {
  const categories = {
    technical: ['code', 'api', 'database', 'server', 'client', 'function', 'class', 'bug', 'error', 'debug'],
    business: ['revenue', 'sales', 'market', 'product', 'customer', 'business', 'strategy', 'roi', 'budget'],
    process: ['workflow', 'process', 'procedure', 'step', 'instruction', 'guide', 'plan', 'schedule'],
    team: ['team', 'meeting', 'collaboration', 'communication', 'feedback', 'review', 'discussion'],
    research: ['research', 'study', 'analysis', 'data', 'findings', 'conclusion', 'hypothesis']
  };
  
  let bestCategory = 'other';
  let bestScore = 0;
  
  for (const [category, keywords] of Object.entries(categories)) {
    const score = keywords.filter(keyword => text.includes(keyword)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }
  
  return bestCategory;
}

export default {
  analyzeContent
};
