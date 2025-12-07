import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function EntryForm({ projectId, parentEntryId, onSubmit, onClose }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [error, setError] = useState('');
  const [tagInput, setTagInput] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    entry_type: 'insight',
    tags: [],
    status: 'active',
    metadata: {
      ai_generated_tags: [],
      ai_summary: '',
      ai_category: ''
    },
    parent_entry_id: parentEntryId || null,
    link_type: 'followed_from'
  });

  useEffect(() => {
    if (user?.department) {
      setFormData(prev => ({
        ...prev,
        department: user.department
      }));
    }
  }, [user]);

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  // Simulate AI suggestions - in production, call your AI service
  const handleAISuggestions = async () => {
    if (!formData.content.trim()) {
      setError('Please enter content for AI suggestions');
      return;
    }

    setGeneratingAI(true);
    try {
      // Simulate AI processing (in production, call actual AI API)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock AI suggestions
      const mockSuggestions = {
        ai_generated_tags: ['important', 'follow-up', formData.entry_type],
        ai_summary: formData.content.substring(0, 100) + '...',
        ai_category: formData.entry_type
      };

      setFormData(prev => ({
        ...prev,
        metadata: mockSuggestions
      }));
    } catch (err) {
      setError('Failed to generate AI suggestions');
    } finally {
      setGeneratingAI(false);
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_BACKEND}/api/entries`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify({
            title: formData.title,
            content: formData.content,
            entry_type: formData.entry_type,
            project_id: projectId || null,
            status: formData.status,
            tags: formData.tags,
            metadata: useAI ? formData.metadata : {},
            parent_entry_id: formData.parent_entry_id,
            link_type: formData.link_type
          }),
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create entry');
      }

      const data = await response.json();
      
      if (onSubmit) {
        await onSubmit(data.entry);
      }
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create entry');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">
            {parentEntryId ? 'Add Related Entry' : 'Add Knowledge'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* AI Toggle */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="font-medium text-slate-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Use AI Assistance for suggestions
              </span>
            </label>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What is this knowledge about?"
              required
            />
          </div>

          <div>
            <label htmlFor="entry_type" className="block text-sm font-medium text-slate-700 mb-1">
              Entry Type *
            </label>
            <select
              id="entry_type"
              value={formData.entry_type}
              onChange={(e) => setFormData(prev => ({ ...prev, entry_type: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="report">Report</option>
              <option value="meeting_note">Meeting Note</option>
              <option value="insight">Insight</option>
              <option value="decision">Decision</option>
              <option value="experiment">Experiment</option>
              <option value="outcome">Outcome</option>
              <option value="proposal">Proposal</option>
              <option value="result">Result</option>
            </select>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-slate-700 mb-1">
              Content
            </label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[150px]"
              placeholder="Describe the details, findings, or insights..."
            />
            {useAI && !generatingAI && formData.content.trim() && (
              <button
                type="button"
                onClick={handleAISuggestions}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Get AI Suggestions
              </button>
            )}
            {generatingAI && (
              <p className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                <span className="animate-spin">✨</span> Generating suggestions...
              </p>
            )}
          </div>

          {useAI && formData.metadata.ai_generated_tags.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-slate-900 mb-3">AI Suggestions</h3>
              <div>
                <p className="text-sm text-slate-600 mb-2">Suggested Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.metadata.ai_generated_tags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        if (!formData.tags.includes(tag)) {
                          setFormData(prev => ({
                            ...prev,
                            tags: [...prev.tags, tag]
                          }));
                        }
                      }}
                      className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded-full text-sm hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-slate-700 mb-1">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                id="tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add tags..."
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Add
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {parentEntryId && (
            <div>
              <label htmlFor="link_type" className="block text-sm font-medium text-slate-700 mb-1">
                How is this related?
              </label>
              <select
                id="link_type"
                value={formData.link_type}
                onChange={(e) => setFormData(prev => ({ ...prev, link_type: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="followed_from">Followed from</option>
                <option value="revised_by">Revised by</option>
                <option value="related_to">Related to</option>
                <option value="built_upon">Built upon</option>
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Entry'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
