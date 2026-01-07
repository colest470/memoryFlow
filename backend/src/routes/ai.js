import express from "express";
import "dotenv/config";
import { authenticateToken } from "../../middleware/tokens.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import multer from "multer";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  files: 10,
  fileSize: 10 * 1024 * 1024,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Initialize Google Gemini with corrected model and higher token limit
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.3,
    maxOutputTokens: 1024,
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

router.post("/analyze-files",
  authenticateToken(),
  upload.array("files", 10), 
  async (req, res) => {
  try {
    const fileArr = req.files;
    console.log("Received files: ", fileArr);

    if (!fileArr || fileArr.length === 0) {
      return res.status(404).json({ error: "No files attached!" });
    }

    const analysisResults = {};
    const insights = [];

    for (const file of fileArr) {
      // CORRECTED: Use originalname (lowercase), not originalName
      const { originalname, mimetype, buffer, size } = file;
      console.log(`Processing file: ${originalname}, type: ${mimetype}, size: ${size}`);

      try {
        const base64Data = buffer.toString("base64");

        // CORRECTED: Pass parameters correctly
        const aiResponse = await processFileAI(originalname, mimetype, base64Data, size);

        analysisResults[originalname] = {
          type: mimetype,
          size: size,
          analysis: aiResponse.analysis,
          summary: aiResponse.summary
        };

        if (aiResponse.insights) {
          insights.push(...aiResponse.insights);
        }
      } catch (fileError) {
        console.error(`Error processing file ${originalname}:`, fileError);
        analysisResults[originalname] = {
          type: mimetype,
          size: size,
          error: 'Failed to analyze file',
          analysis: null
        };
      }
    }

    res.status(200).json({
      success: true,
      analysis: analysisResults,
      insights: insights,
      message: `Analyzed ${fileArr.length} file(s)`
    });

  } catch (error) {
    console.error(`Error in analyze-files route:`, error);
    return res.status(500).json({ 
      error: 'Failed to analyze files',
      details: error.message 
    });
  }
});

// CORRECTED: Function should accept parameters individually, not as an object
async function processFileAI(name, type, data, size) {
  try {
    const prompt = `Analyze this file named "${name}" which is a ${type} file with size ${size} bytes. The file content is provided in base64 format. Please analyze the content and provide:
    1. A brief summary of what this file is about
    2. Key insights or important information found in the file
    3. File type-specific analysis (e.g., if it's a PDF, mention pages, if it's an image, describe what you can see)
    
    Base64 data: ${data.substring(0, 1000)}... [truncated]`;

    console.log("Sending to AI model...");
    
    // Assuming you have a model configured
    const aiResponse = await model.generateContent(prompt);
    const responseText = aiResponse.response.text();
    
    console.log("AI response: ", responseText);

    // Parse the AI response to extract structured data
    return {
      analysis: {
        fileType: type,
        fileName: name,
        fileSize: size,
        contentSummary: responseText
      },
      summary: responseText.substring(0, 200) + "...", // First 200 chars as summary
      insights: [
        `File: ${name}`,
        `Type: ${type}`,
        `Size: ${size} bytes`,
        `Analysis completed successfully`
      ]
    };

  } catch (error) {
    console.error(`Error in AI processing for file ${name}:`, error);
    
    // Return fallback analysis
    return {
      analysis: {
        fileType: type,
        fileName: name,
        fileSize: size,
        error: error.message
      },
      summary: `Basic analysis of ${name} (${type})`,
      insights: [
        `File: ${name}`,
        `Type: ${type}`,
        `Size: ${size} bytes`,
        `Note: AI analysis failed, using basic metadata`
      ]
    };
  }
}

export default router;