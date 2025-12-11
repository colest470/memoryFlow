import express from "express";
import "dotenv/config";
import { authenticateToken } from "../../middleware/tokens.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

// Initialize Google Gemini with corrected model and higher token limit
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash", // Updated from gemini-pro for better stability
  generationConfig: {
    temperature: 0.3,
    maxOutputTokens: 1024, // Increased to prevent 'Unexpected end of JSON input'
  }
});

router.post("/suggestions", authenticateToken(), async (req, res) => {
  try {
    const { title, content, entry_type } = req.body;

    if (!content && !title) {
      return res.status(400).json({ 
        error: 'Content or title is required for AI suggestions' 
      });
    }

    // Prepare the prompt for Gemini
    const prompt = `Analyze this knowledge entry and provide suggestions in valid JSON format.

CONTEXT:
You are a knowledge management assistant. Analyze content and provide structured suggestions.

ENTRY DETAILS:
Title: ${title || 'No title'}
Entry Type: ${entry_type}
Content: ${content || 'No content provided'}

INSTRUCTIONS:
1. Provide 3-5 relevant tags/keywords
2. Create a concise 1-2 sentence summary
3. Categorize as: technical, business, process, team, or other
4. List 3-5 key points
5. Suggest any follow-up action items
6. Rate confidence as: high, medium, or low

RESPONSE FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "Brief summary here",
  "category": "technical|business|process|team|other",
  "key_points": ["Point 1", "Point 2", "Point 3"],
  "action_items": ["Action 1", "Action 2"],
  "confidence": "high|medium|low"
}

IMPORTANT: Do not include any additional text or markdown. Only the JSON object.`;

    try {
      const result = await model.generateContent(prompt);
      const aiResponse = result.response.text();
      
      console.log("Gemini raw response:", aiResponse);

      let suggestions;
      
      try {
        // Clean the response: remove markdown code blocks and excess whitespace
        const cleanedResponse = aiResponse
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        
        // Parse JSON
        suggestions = JSON.parse(cleanedResponse);
        
        // Validate and sanitize required fields
        suggestions.tags = Array.isArray(suggestions.tags) ? suggestions.tags.slice(0, 5) : [];
        suggestions.summary = suggestions.summary || extractFirstSentence(content);
        suggestions.category = ['technical', 'business', 'process', 'team', 'other'].includes(suggestions.category) 
          ? suggestions.category 
          : 'other';
        suggestions.key_points = Array.isArray(suggestions.key_points) ? suggestions.key_points : [];
        suggestions.action_items = Array.isArray(suggestions.action_items) ? suggestions.action_items : [];
        suggestions.confidence = ['high', 'medium', 'low'].includes(suggestions.confidence) 
          ? suggestions.confidence 
          : 'medium';

      } catch (parseError) {
        console.error('Failed to parse Gemini JSON. Falling back to text extraction:', parseError);
        
        suggestions = {
          tags: extractTagsFromText(aiResponse + ' ' + (content || '')),
          summary: extractFirstSentence(aiResponse) || extractFirstSentence(content),
          category: 'other',
          key_points: extractKeyPoints(aiResponse) || [],
          action_items: [],
          confidence: 'low',
          note: 'parsed_from_raw_text'
        };
      }

      res.json({
        success: true,
        suggestions,
        model: 'gemini-2.5-flash'
      });

    } catch (geminiError) {
      console.error('Gemini API communication error:', geminiError);
      
      res.json({
        success: true,
        suggestions: generateFallbackSuggestions(title, content, entry_type),
        model: 'fallback',
        note: 'Gemini service error, using local logic'
      });
    }

  } catch (error) {
    console.error('Critical route error:', error);
    res.json({
      success: true,
      suggestions: generateFallbackSuggestions(req.body.title, req.body.content, req.body.entry_type),
      model: 'fallback',
      note: 'Server error'
    });
  }
});

// Helper functions (remain unchanged)
function extractTagsFromText(text) {
  if (!text) return [];
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const commonWords = new Set(['the', 'and', 'for', 'this', 'that', 'with', 'from', 'have']);
  const uniqueWords = [...new Set(words.filter(w => w.length > 3 && !commonWords.has(w)))];
  return uniqueWords.slice(0, 5);
}

function extractFirstSentence(text) {
  if (!text) return '';
  const sentence = text.match(/[^.!?]+[.!?]/);
  return sentence ? sentence[0].trim() : text.substring(0, 120).trim() + '...';
}

function extractKeyPoints(text) {
  if (!text) return [];
  return text.split(/[.!?]+/)
    .filter(s => s.trim().length > 20 && s.trim().length < 200)
    .slice(0, 3)
    .map(s => s.trim());
}

function generateFallbackSuggestions(title, content, entry_type) {
  const allText = (title || '') + ' ' + (content || '');
  const baseTags = ['documented', 'knowledge'];
  const uniqueTags = [...new Set([...baseTags, ...extractTagsFromText(allText)])].slice(0, 5);
  
  return {
    tags: uniqueTags,
    summary: extractFirstSentence(content) || title || 'No summary available',
    category: 'other',
    key_points: extractKeyPoints(content),
    action_items: [],
    confidence: 'low'
  };
}

// Health check endpoint with corrected model
router.get("/health", async (req, res) => {
  try {
    const healthModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await healthModel.generateContent("Respond with 'healthy'");
    const response = result.response;
    
    res.json({
      status: "healthy",
      model: "gemini-2.5-flash",
      response: response.text().trim()
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      error: error.message
    });
  }
});

export default router;