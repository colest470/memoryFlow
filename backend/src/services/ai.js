import express from "express";
import "dotenv/config"
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAi.getGenerativeModel({ 
  model: "gemini-2.5-flash", 
  generationConfig: {
    temperature: 0.3,
    maxOutputTokens: 3024,
  }
});

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


// Update your AnalyzeContent function or create a new one
export const AnalyzeProject = async (entries) => {
  try {
    const allContent = entries.map(entry => 
      `Entry: "${entry.title}"\n${entry.content || ''}`
    ).join('\n\n---\n\n');

    const entriesCount = entries.length;
    
    const prompt = `Analyze this project consisting of ${entriesCount} entries and provide comprehensive insights.

PROJECT CONTENT:
${allContent}

ANALYSIS INSTRUCTIONS:
1. Identify overarching themes and patterns across all entries
2. Extract key topics and their frequency
3. Generate a project-level summary
4. Identify potential gaps or missing information
5. Suggest connections between different entries
6. Provide actionable recommendations for the project
7. Analyze overall detailed summary of what is happening in the project entry (including files analyzed)

RESPONSE FORMAT (JSON ONLY):
{
  "overall_summary": "Comprehensive summary of the entire project",
  "key_themes": [
    {
      "theme": "theme name",
      "frequency": 5,
      "related_entries": [1, 3, 7],
      "description": "theme description"
    }
  ],
  "top_topics": ["topic1", "topic2", "topic3"],
  "identified_gaps": [
    {
      "gap": "Missing information about X",
      "recommendation": "Consider adding entry about Y",
      "priority": "high|medium|low"
    }
  ],
  "entry_connections": [
    {
      "entry1_id": 1,
      "entry2_id": 3,
      "connection_type": "contradiction|support|expansion",
      "explanation": "How these entries relate"
    }
  ],
  "actionable_recommendations": [
    "Specific action 1",
    "Specific action 2"
  ],
  "sentiment_analysis": "overall positive|negative|neutral with explanation",
  "complexity_score": 0-10
}`;

    const model = genAi.getGenerativeModel({ model: "gemini-1.5-pro" }); 
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      return JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse project analysis JSON:', parseError);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return null;
    }
  } catch (error) {
    console.error('Error in AnalyzeProject:', error);
    throw error;
  }
};

export const CompareProjects = async (projectAEntries, projectBEntries) => {
  try {
    const prompt = `Compare these two projects and provide insights.

PROJECT A ENTRIES: ${projectAEntries.length}
${projectAEntries.map(e => `- ${e.title}: ${e.content?.slice(0, 100)}...`).join('\n')}

PROJECT B ENTRIES: ${projectBEntries.length}
${projectBEntries.map(e => `- ${e.title}: ${e.content?.slice(0, 100)}...`).join('\n')}

RESPONSE FORMAT (JSON ONLY):
{
  "similarities": ["similarity1", "similarity2"],
  "differences": ["difference1", "difference2"],
  "shared_themes": ["theme1", "theme2"],
  "unique_to_project_a": ["aspect1", "aspect2"],
  "unique_to_project_b": ["aspect1", "aspect2"],
  "collaboration_opportunities": ["opportunity1", "opportunity2"]
}`;

    const model = genAi.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (error) {
    console.error('Error in CompareProjects:', error);
    throw error;
  }
};

export const AnalyzeFiles = async () => {
  try {
    // First upload the file
    const uploadResponse = await client.files.upload({
      file: './db.pdf',
      purpose: 'file-extract'
    });

    console.log('File uploaded:', uploadResponse);

    const response = await client.chat.completions.create({
      model: 'deepseek-chat', // or 'deepseek-coder'
      messages: [
        {
          role: 'user',
          content: 'Please analyze the attached file',
          file_ids: [uploadResponse.id] // Use the uploaded file ID
        }
      ],
      max_tokens: 2000
    });

    console.log('Analysis:', response.choices[0].message.content);
  } catch (error) {
    console.error('Error:', error);
  }
}

export default {
  analyzeContent,
  AnalyzeFiles
};
