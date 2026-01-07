import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";
import fs from 'fs';

const genAi = new GoogleGenerativeAI("AIzaSyBhct9yNqDi38hvmOQY4y379YTi-wG2Zfo");
const model = genAi.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

const analyzeFiles = async (filePath) => {
    try {
        const file = fs.readFileSync(filePath, 'utf-8');
        const result = await model.generateContent(`Analyze the following JavaScript file and provide a summary of its functionality, key functions, and any important details:\n\n${file}`);

        console.log('AI Analysis Response:', result.response.text());
    } catch (error) {
        console.error('Error analyzing files:', error);
    }
}

analyzeFiles("./db.js");

const listModels = async () => {
  const result = await genAi.listModels();
  console.log(result.models.map(m => m.name));
}

listModels();


import { useState, useEffect } from 'react';
import { X, Sparkles, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { entriesAPI } from '../../lib/api/entries.js';

export default function EntryForm({ projectId, parentEntryId, onSubmit, onClose }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [tagInput, setTagInput] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    entry_type: 'insight',
    tags: [],
    status: 'active',
    department: '',
    metadata: {
      ai_suggestions: null
    },
    parent_entry_id: parentEntryId || null,
    link_type: 'followed_from'
  });

  // Entry type descriptions for help text
  const entryTypeDescriptions = {
    report: 'Formal report with findings and analysis',
    meeting_note: 'Notes and decisions from a meeting',
    insight: 'Key learnings or realizations',
    decision: 'Important decisions made',
    experiment: 'Documentation of tests or experiments',
    outcome: 'Results and outcomes of work',
    proposal: 'Suggestions or proposals for action',
    result: 'Final results or deliverables'
  };

  useEffect(() => {
    if (user?.department) {
      setFormData(prev => ({
        ...prev,
        department: user.department
      }));
    }
  }, [user]);

  // Handle tag addition
  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
      setTagInput('');
    }
  };

  // Handle tag removal
  const handleRemoveTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  // Enhanced AI suggestions with fallback
  const handleAISuggestions = async () => {
    if (!formData.content.trim() && !formData.title.trim()) {
      setError('Please enter content or title for AI suggestions');
      return;
    }

    setGeneratingAI(true);
    setError('');
    
    try {
      // Try to call real AI backend first
      const response = await fetch(
        `${import.meta.env.VITE_API_BACKEND}/api/ai/suggestions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify({
            title: formData.title,
            content: formData.content,
            entry_type: formData.entry_type
          })
        }
      );

      if (response.ok) {
        const data = await response.json();

        console.log(data);
        
        // Update form with AI suggestions
        setFormData(prev => ({
          ...prev,
          metadata: {
            ...prev.metadata,
            ai_suggestions: {
              ...data.suggestions,
              generated_at: new Date().toISOString(),
              ai_model: 'gpt-3.5-turbo'
            }
          }
        }));

        // Auto-add top 2 AI tags
        if (data.suggestions?.tags?.length > 0) {
          const newTags = data.suggestions.tags
            .slice(0, 2)
            .filter(tag => !formData.tags.includes(tag));
          
          if (newTags.length > 0) {
            setFormData(prev => ({
              ...prev,
              tags: [...prev.tags, ...newTags]
            }));
            setSuccessMessage(`Added ${newTags.length} AI-suggested tags`);
            setTimeout(() => setSuccessMessage(''), 3000);
          }
        }

      } else {
        throw new Error('AI service unavailable');
      }

    } catch (err) {
      console.log('Using fallback AI suggestions:', err.message);
      
      const contentWords = formData.content.toLowerCase().split(/\s+/);
      const uniqueWords = [...new Set(contentWords)]
        .filter(w => w.length > 4)
        .slice(0, 5);

      const commonTags = {
        report: ['analysis', 'findings', 'data', 'conclusion'],
        meeting_note: ['discussion', 'decision', 'action', 'minutes'],
        insight: ['learning', 'discovery', 'realization', 'pattern'],
        decision: ['resolution', 'approval', 'direction', 'choice'],
        experiment: ['test', 'trial', 'validation', 'method'],
        outcome: ['result', 'achievement', 'impact', 'deliverable'],
        proposal: ['suggestion', 'recommendation', 'plan', 'initiative'],
        result: ['output', 'conclusion', 'finding', 'delivery']
      };

      const baseTags = commonTags[formData.entry_type] || ['important', 'documented'];
      
      const smartSuggestions = {
        tags: [...baseTags, ...uniqueWords].filter((v, i, a) => a.indexOf(v) === i),
        summary: generateSmartSummary(formData.content, formData.title),
        category: formData.entry_type,
        key_points: extractKeyPoints(formData.content),
        confidence: formData.content.length > 100 ? 'high' : 
                   formData.content.length > 50 ? 'medium' : 'low',
        generated_at: new Date().toISOString(),
        ai_model: 'fallback'
      };

      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          ai_suggestions: smartSuggestions
        }
      }));

    } finally {
      setGeneratingAI(false);
    }
  };

  const analyzeFiles = async (file) => {
    const formData = new formData();

    formData.append(file); // array of files for analysis

    const response = await entriesAPI.analyzeFiles(formData);
  }

  // Helper functions for fallback AI
  const generateSmartSummary = (content, title) => {
    if (!content && !title) return '';
    
    if (content) {
      const sentences = content.split(/[.!?]+/).filter(s => s.trim());
      if (sentences.length > 0) {
        return sentences[0].trim() + (sentences.length > 1 ? '...' : '');
      }
      return content.substring(0, 120) + (content.length > 120 ? '...' : '');
    }
    
    return title;
  };

  const extractKeyPoints = (content) => {
    if (!content) return [];
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
    return sentences
      .filter(s => s.length > 20)
      .slice(0, 3)
      .map(s => s.trim());
  };

  // Apply all AI suggestions
  const applyAllSuggestions = () => {
    if (!formData.metadata.ai_suggestions) return;
    
    const suggestions = formData.metadata.ai_suggestions;
    let updates = {};
    
    // Apply tags
    if (suggestions.tags?.length > 0) {
      const newTags = suggestions.tags.filter(tag => !formData.tags.includes(tag));
      if (newTags.length > 0) {
        updates.tags = [...formData.tags, ...newTags];
      }
    }
    
    // Apply summary as content if content is empty
    if (!formData.content.trim() && suggestions.summary) {
      updates.content = suggestions.summary;
    }
    
    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
      setSuccessMessage('Applied AI suggestions');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // Form submission
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }

      // Validate entry type
      const validTypes = ['report', 'meeting_note', 'insight', 'decision', 
                         'experiment', 'outcome', 'proposal', 'result'];
      if (!validTypes.includes(formData.entry_type)) {
        throw new Error('Invalid entry type');
      }

      const payload = {
        title: formData.title,
        content: formData.content,
        entry_type: formData.entry_type,
        project_id: projectId || null,
        status: formData.status,
        department: formData.department,
        tags: formData.tags,
        metadata: useAI ? formData.metadata : {},
        parent_entry_id: formData.parent_entry_id,
        link_type: formData.link_type
      };

      console.log('Creating entry:', payload);

      const response = await fetch(
        `${import.meta.env.VITE_API_BACKEND}/api/entries`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify(payload),
          credentials: 'include'
        }
      );

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create entry');
      }

      console.log('Entry created successfully:', responseData);
      
      // Show success message
      setSuccessMessage('Entry created successfully!');
      
      // Call onSubmit callback if provided
      if (onSubmit) {
        await onSubmit(responseData.entry);
      }
      
      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Submit error:', err);
      
      // Handle specific error types
      if (err.message.includes('401') || err.message.includes('token')) {
        setError('Session expired. Please log in again.');
      } else if (err.message.includes('403')) {
        setError('You do not have permission to create entries in this project.');
      } else if (err.message.includes('network')) {
        setError('Network error. Please check your connection.');
      } else {
        setError(err.message || 'Failed to create entry. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {parentEntryId ? 'Add Related Entry' : 'Add Knowledge'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {parentEntryId ? 'Connect this to an existing entry' : 'Document new knowledge'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error and Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-start gap-3">
              <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* AI Assistance Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="pt-0.5">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900">
                      AI Assistance
                    </span>
                    
                    {/* Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={useAI}
                      onClick={() => setUseAI(!useAI)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${useAI ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useAI ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-3">
                    Get smart tag suggestions, summaries, and insights powered by AI.
                  </p>
                  
                  {/* Status indicator */}
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${useAI ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                    {useAI ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        AI assistance enabled
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                        AI assistance disabled
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Title Field */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-2">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="What is this knowledge about?"
              required
              disabled={loading}
            />
          </div>

          {/* Entry Type */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="entry_type" className="block text-sm font-medium text-slate-700">
                Entry Type *
              </label>
              <span className="text-sm text-slate-500">
                {entryTypeDescriptions[formData.entry_type]}
              </span>
            </div>
            <select
              id="entry_type"
              value={formData.entry_type}
              onChange={(e) => setFormData(prev => ({ ...prev, entry_type: e.target.value }))}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors appearance-none bg-white"
              disabled={loading}
            >
              <option value="report">📊 Report</option>
              <option value="meeting_note">📝 Meeting Note</option>
              <option value="insight">💡 Insight</option>
              <option value="decision">✅ Decision</option>
              <option value="experiment">🔬 Experiment</option>
              <option value="outcome">🎯 Outcome</option>
              <option value="proposal">📋 Proposal</option>
              <option value="result">📈 Result</option>
            </select>
          </div>

          {/* Content Field with AI */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-slate-700 mb-2">
              Content
              <span className="text-slate-400 text-sm font-normal ml-1">
                (What is the content about?)
              </span>
            </label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors min-h-[200px] resize-y"
              placeholder="Describe the details, findings, insights, or results..."
              disabled={loading}
            />
            
            {/* AI Suggestions Button */}
            {useAI && !generatingAI && (formData.content.trim() || formData.title.trim()) && (
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAISuggestions}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium text-sm"
                  disabled={loading}
                >
                  <Sparkles className="w-4 h-4" />
                  Get AI Suggestions
                </button>
                <span className="text-sm text-slate-500">
                  We'll analyze your content and suggest tags, summary, and more.
                </span>
              </div>
            )}
            
            {generatingAI && (
              <div className="mt-3 flex items-center gap-3 text-blue-600">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium">Analyzing content and generating suggestions...</span>
              </div>
            )}
          </div>

          {/* AI Suggestions Display */}
          {useAI && formData.metadata.ai_suggestions && (
            <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 border border-blue-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">AI Suggestions</h3>
                    <p className="text-xs text-slate-500">
                      Generated {new Date(formData.metadata.ai_suggestions.generated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    formData.metadata.ai_suggestions.confidence === 'high'
                      ? 'bg-green-100 text-green-800'
                      : formData.metadata.ai_suggestions.confidence === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {formData.metadata.ai_suggestions.confidence || 'medium'} confidence
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      metadata: { ...prev.metadata, ai_suggestions: null }
                    }))}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tags Section */}
              {formData.metadata.ai_suggestions.tags?.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Suggested Tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.metadata.ai_suggestions.tags.map((tag, index) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (!formData.tags.includes(tag)) {
                            setFormData(prev => ({
                              ...prev,
                              tags: [...prev.tags, tag]
                            }));
                            setSuccessMessage(`Added tag: ${tag}`);
                            setTimeout(() => setSuccessMessage(''), 2000);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                          formData.tags.includes(tag)
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-50 hover:border-blue-400'
                        }`}
                      >
                        {formData.tags.includes(tag) ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary Section */}
              {formData.metadata.ai_suggestions.summary && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Summary:</p>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {formData.metadata.ai_suggestions.summary}
                    </p>
                  </div>
                </div>
              )}

              {/* Key Points */}
              {formData.metadata.ai_suggestions.key_points?.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Key Points:</p>
                  <ul className="space-y-2">
                    {formData.metadata.ai_suggestions.key_points.map((point, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-slate-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Apply All Button */}
              <button
                type="button"
                onClick={applyAllSuggestions}
                className="w-full mt-2 px-4 py-2.5 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-lg hover:from-blue-200 hover:to-indigo-200 transition-all font-medium text-sm flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Apply All Suggestions
              </button>
            </div>
          )}

          {/* Tags Input */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-slate-700 mb-2">
              Tags
              <span className="text-slate-400 text-sm font-normal ml-1">
                (Press Enter or click Add to add tags)
              </span>
            </label>
            <div className="flex gap-2 mb-3">
              <input
                id="tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Add tags like 'api', 'integration', 'bug-fix'..."
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-5 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                disabled={loading}
              >
                Add
              </button>
            </div>
            
            {/* Tags Display */}
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium flex items-center gap-2 group"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-blue-600 hover:text-blue-900 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                      disabled={loading}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Parent Entry Link */}
          {parentEntryId && (
            <div>
              <label htmlFor="link_type" className="block text-sm font-medium text-slate-700 mb-2">
                How is this related to the parent entry?
              </label>
              <select
                id="link_type"
                value={formData.link_type}
                onChange={(e) => setFormData(prev => ({ ...prev, link_type: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                disabled={loading}
              >
                <option value="followed_from">📖 Followed from (continuation)</option>
                <option value="revised_by">✏️ Revised by (update or correction)</option>
                <option value="related_to">🔗 Related to (connected topic)</option>
                <option value="built_upon">🏗️ Built upon (based on this work)</option>
              </select>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-6 border-t border-slate-200">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creating Entry...
                </span>
              ) : (
                'Create Knowledge Entry'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-8 py-3.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} // create a drag drop system where one can upload files to the AI for analysis to the backend