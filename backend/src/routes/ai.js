import express from "express";
import "dotenv/config";
import { authenticateToken } from "../../middleware/tokens.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import multer from "multer";
import * as pdfParse from "pdf-parse";
import mammoth from "mammoth";
import xlsx from "xlsx";
import db from "../services/db.js";
import { promisify } from "util";
import fs from "fs/promises";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

db.getAsync = promisify(db.get.bind(db));
db.allAsync = promisify(db.all.bind(db));

const __filepath = fileURLToPath(import.meta.url);
const __dirname = dirname(__filepath);

db.runAsync = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.3,
    maxOutputTokens: 1924,
  },
  safetySettings: [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_NONE",
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH",
      threshold: "BLOCK_NONE",
    },
  ]
});

router.post("/suggestions", authenticateToken(), async (req, res) => {
  try {
    const { title, content, entry_type } = req.body;

    if (!content && !title) {
      return res.status(400).json({ 
        error: 'Content or title is required for AI suggestions' 
      });
    }

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

      if (!fileArr || fileArr.length === 0) {
        return res.status(400).json({ error: "No files attached!" });
      }

      const analysisResults = {};
      const allInsights = [];
      let originalname;
      let mimetype;
      let buffer;
      let type;
      let size;

      const analysisPromises = fileArr.map(async (file) => {
        originalname = file.originalname;
        mimetype = file.mimetype;
        buffer = file.buffer;
        size = file.size;
        type = file.mimetype;

        console.log(mimetype, size, type);
        
        try {
          const aiResponse = await processFileAI(originalname, mimetype, buffer, size);
          
          analysisResults[originalname] = {
            type: mimetype,
            size: size,
            ...aiResponse 
          };

          if (aiResponse.key_points) {
            allInsights.push(...aiResponse.key_points);
          }
        } catch (fileError) {
          console.error(`Error processing ${originalname}:`, fileError);
          analysisResults[originalname] = {
            type: mimetype,
            size: size,
            error: fileError.message,
            suggestions: generateFallbackSuggestions(originalname, "Analysis failed", mimetype)
          };
        }
      });

      await Promise.all(analysisPromises);

      const uploadDir = path.join(__dirname, "../uploads/analyzed_files");
      await fs.mkdir(uploadDir, { recursive: true });

      const timestamp = Date.now();
      const safeName = `${timestamp}-${originalname.replace(/\s+/g, '_')}`;
      const filePath = path.join(uploadDir, safeName);

      try {
        await fs.writeFile(filePath, buffer);

        console.log(`Successfully saved: ${safeName}`);
      } catch (error) {
        console.error(`Failed to write file ${originalname} to disk:`, error);
        throw new Error(`File system error: ${error.message}`);
      }

      res.status(200).json({
        success: true,
        analysis: analysisResults,
        insights: allInsights,
        filePath: filePath,
        model: 'gemini-2.5-flash-file-mode',
      });

    } catch (globalError) {
      console.error(`Critical file route error:`, globalError);
      res.status(500).json({ error: "Internal server error during analysis" });
    }
  });

async function processFileAI(name, type, buffer, size) {
  try {
    let parts = [];
    let extractedText = "";

    const jsonPrompt = `
      Analyze the file "${name}" and provide details in valid JSON format.
      CONTEXT: You are a technical file analyzer.
      
      RESPONSE FORMAT:
      Return ONLY valid JSON with this exact structure:
      {
        "summary": "1-2 sentence high level purpose",
        "explanation": "Clear explanation of logic/workflow",
        "key_points": ["point 1", "point 2", "point 3"],
        "category": "technical|business|process|team|other",
        "action_items": ["Suggested improvement or next step"],
        "confidence": "high|medium|low"
      }
      IMPORTANT: Do not include markdown code blocks or prose. Only the JSON object.`;

    if (type.startsWith("image/")) {
      parts = [{ text: jsonPrompt }, { inlineData: { data: buffer.toString("base64"), mimeType: type } }];
    } else if (type === "application/pdf") {
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    } else if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const doc = await mammoth.extractRawText({ buffer });
      extractedText = doc.value;
    } else if (type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      const workbook = xlsx.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      extractedText = xlsx.utils.sheet_to_csv(sheet);
    } else if (type.startsWith("text/") || name.match(/\.(js|ts|json|py|html|css)$/)) {
      extractedText = buffer.toString("utf-8");
    } else {
      throw new Error(`Unsupported file type: ${type}`);
    }

    if (!parts.length && extractedText) {
      parts = [{ text: `${jsonPrompt}\n\nFile Content:\n${extractedText.slice(0, 15000)}` }];
    }

    const result = await model.generateContent(parts);
    const aiResponse = result.response.text();
    
    console.log(`Raw AI response for ${name}:`, aiResponse);

    try {
      const cleanedResponse = aiResponse
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      const suggestions = JSON.parse(cleanedResponse);
      
      return {
        summary: suggestions.summary || "No summary available",
        explanation: suggestions.explanation || "No explanation provided",
        key_points: Array.isArray(suggestions.key_points) ? suggestions.key_points : [],
        category: suggestions.category || "other",
        action_items: suggestions.action_items || [],
        confidence: suggestions.confidence || "medium"
      };

    } catch (parseError) {
      console.warn("JSON Parse failed for file, using text extraction fallback");
      return {
        summary: "Text extraction fallback",
        explanation: aiResponse.slice(0, 500),
        key_points: [name],
        category: "other",
        action_items: [],
        confidence: "low",
        note: "parsed_from_raw_text"
      };
    }
  } catch (error) {
    console.error(`AI analysis failed for ${name}:`, error.message);
    throw error;
  }
}

router.get("/:id/analyze", authenticateToken(), async (req, res) => {
  try {
    const { id: projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    const entries = await db.allAsync(
      `SELECT title, content, entry_type, tags, created_at FROM memory_entries WHERE project_id = ?`, 
      [projectId]
    );

    if (!entries || entries.length === 0) {
      return res.status(404).json({ error: "No entries found for this project" });
    }

    const entriesString = JSON.stringify(entries);

    const prompt = `
      Analyze these database entries and provide a structured project health report in valid JSON format.
      
      DATASET:
      ${entriesString}

      INSTRUCTIONS:
      1. Narrative Thread: How do entries evolve over time?
      2. Themes: Recurring keywords and topics.
      3. Sentiment: Project momentum and roadblocks.
      4. Knowledge Gaps: What is missing or ignored?
      5. Actionable Recommendations: 3-5 specific next steps.

      RESPONSE FORMAT (Strict JSON ONLY):
      {
        "executive_summary": "3-sentence overview",
        "key_findings": ["Finding 1", "Finding 2"],
        "narrative": "Detailed evolution analysis",
        "sentiment_score": "positive|neutral|negative",
        "missing_links": ["Gap 1", "Gap 2"],
        "recommendations": ["Step 1", "Step 2"],
        "confidence": "high|medium|low"
      }
      IMPORTANT: No markdown, no prose, only the JSON object.`;

    try {
      const result = await model.generateContent(prompt);
      const aiResponse = result.response.text();

      console.log(aiResponse);

      let analysis;
      try {
        const cleanedResponse = aiResponse
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        
        analysis = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error("Failed to parse project analysis JSON:", parseError);
        analysis = {
          executive_summary: "Analysis completed but returned in raw format.",
          raw_text: aiResponse,
          confidence: "low",
          note: "text_fallback"
        };
      }

      res.status(200).json({ 
        success: true,
        analysis,
        entry_count: entries.length,
        model: 'gemini-2.5-flash'
      });

    } catch (geminiError) {
      console.error("Gemini service error:", geminiError);
      res.status(502).json({ error: "AI service currently unavailable" });
    }
  } catch (error) {
    console.error("Critical Analysis Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;