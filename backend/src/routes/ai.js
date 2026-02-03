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
    maxOutputTokens: 1024,
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
      return res.status(404).json({ error: "No files attached!" });
    }

    const analysisResults = {};
    const insights = [];

    for (const file of fileArr) {
      const { originalname, mimetype, buffer, size } = file;
      console.log(`Processing file: ${originalname}, type: ${mimetype}, size: ${size}`);

      try {
        const aiResponse = await processFileAI(originalname, mimetype, buffer, size);

        if (aiResponse) {
          analysisResults[originalname] = {
            type: mimetype,
            size: size,
            analysis: aiResponse.analysis || null,
            summary: aiResponse.summary || null
          };

          if (aiResponse.insights && Array.isArray(aiResponse.insights)) {
            insights.push(...aiResponse.insights);
          }
        } else {
          analysisResults[originalname] = {
            type: mimetype,
            size: size,
            error: 'No response from AI processor',
            analysis: null
          };
        }

        console.log(`AI response for ${originalname}:`, aiResponse);
      } catch (fileError) {
        console.error(`Error processing file ${originalname}:`, fileError.message || fileError);
        analysisResults[originalname] = {
          type: mimetype,
          size: size,
          error: fileError.message || 'Failed to analyze file',
          analysis: null
        };

        res.status(500).json({ error: fileError });
      }
    }

    res.status(200).json({
      success: true,
      analysis: analysisResults,
      insights: insights,
      message: `Analyzed ${fileArr.length} file(s)`
    });

  } catch (fileError) {
    console.error(`Error processing file:`, fileError.message);
    analysisResults[originalname] = {
      error: fileError.message || 'Failed to analyze file',
      success: false
    };
  }
});

async function processFileAI(name, type, buffer, size) {
  try {
    let parts = [];
    let extractedText = "";

    const basePrompt = `
You are analyzing the file "${name}".

Your task is to clearly explain what this file contains and what is happening inside it.

Provide:
- A brief high-level summary of the file’s purpose
- A clear explanation of the main logic, structure, or workflow
- Important components, functions, or sections and what each one does
- Key insights, assumptions, or notable design decisions
- Any potential issues, limitations, or improvements (if applicable)

Write in clear, simple language suitable for someone who did not create the file.
and finish with the confidence as (low, medium, high) in your prompt, just one word in the brackets
`;

    if (type.startsWith("image/")) {
      parts = [
        { text: basePrompt },
        {
          inlineData: {
            data: buffer.toString("base64"),
            mimeType: type,
          },
        },
      ];
    }

    else if (type === "application/pdf") {
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    }

    // 📘 WORD (.docx)
    else if (
      type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const doc = await mammoth.extractRawText({ buffer });
      extractedText = doc.value;
    }

    // 📊 EXCEL
    else if (
      type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      const workbook = xlsx.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      extractedText = xlsx.utils.sheet_to_csv(sheet);
    }

    // 🧠 CODE + TEXT FILES
    else if (
      type.startsWith("text/") ||
      name.endsWith(".js") ||
      name.endsWith(".ts") ||
      name.endsWith(".json")
    ) {
      extractedText = buffer.toString("utf-8");
    }
    else {
      throw new Error("Unsupported file type for AI analysis");
      // return {
      //   analysis: null,
      //   summary: null,
      //   insights: [`${name}: Unsupported file type (${type})`],
      // };
    }

    if (!parts.length && extractedText) {
      const safeText = extractedText.slice(0, 12000);

      parts = [
        {
          text: `${basePrompt}\n\nFile content:\n${safeText}`,
        },
      ];
    }
    const result = await model.generateContent(parts);
    const responseText = result.response.text();

    console.log(responseText);

    return {
      analysis: {
        fileType: type,
        fileName: name,
        fileSize: size,
        confidence: result.split(" ").length-1,
      },
      summary: responseText,
      insights: [`Analysis of ${name} completed.`],
    };
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

    const entries = await db.allAsync(`SELECT * FROM memory_entries WHERE project_id = ?`, [projectId]);

    if (!entries || entries.length === 0) {
      return res.status(404).json({ error: "No entries found for this project" });
    }

    const entriesString = JSON.stringify(entries);

    const prompt = `I will provide you with a list of entries from a 'memory_entries' database.
    
    ### Database Entries to Analyze:
    ${entriesString}

    ### Analysis Framework:
    1. **The Narrative Thread:** How do these entries evolve over time? (e.g., did an 'experiment' lead to a 'decision'?)
    2. **Thematic Connections:** Identify recurring themes or keywords across 'content' and 'tags'.
    3. **Sentiment & Momentum:** Are projects gaining positive momentum or hitting roadblocks?
    4. **Knowledge Silos:** Are specific departments focusing on certain types of memory while ignoring others?
    5. **Anomalies:** Highlight entries that seem disconnected or status changes like 'lesson_learned'.

    ### Output Format:
    - **Executive Summary:** A 3-sentence overview.
    - **Key Findings:** Bullet points for similarities and differences.
    - **The "Missing Link":** What is NOT being recorded?
    - **Actionable Recommendations:** Next steps based on these memories.
    
    Provide a highly detailed, long-form response for each section of the analysis framework`;

    try {
      const result = await model.generateContent(prompt);
      const aiResponse = result.response.text();

      console.log("Project analyzed as: ", aiResponse);

      res.status(200).json({ success: aiResponse });
    } catch (error) {
      console.error("Error analyzing project!", error);
      res.status(error.status).json({ error: error.statusText});
    }
  } catch (error) {
    console.error("Error analyzing entries:", error);
    res.status(500).json({ error: "Internal server error during analysis" });
  }
});

export default router;