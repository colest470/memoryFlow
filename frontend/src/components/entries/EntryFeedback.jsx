import { useState, useEffect } from 'react';
import { Share2, ThumbsUp, Repeat2, Eye, Star } from 'lucide-react';
import { entriesAPI } from '../../lib/api/entries';

export default function EntryFeedback({ entryId, onActionRecorded }) {
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [recordedActions, setRecordedActions] = useState({
    view: false,
    reuse: false,
    share: false,
    rate: false
  });

  // Record view action on mount
  useEffect(() => {
    recordViewAction();
  }, [entryId]);

  async function recordViewAction() {
    try {
      await entriesAPI.recordAction(entryId, 'view');
      setRecordedActions(prev => ({ ...prev, view: true }));
    } catch (error) {
      console.error('Failed to record view:', error);
    }
  }

  async function recordAction(actionType, rating = null) {
    setLoading(true);
    try {
      const options = {};
      if (rating) options.rating = rating;
      
      await entriesAPI.recordAction(entryId, actionType, options);
      
      setRecordedActions(prev => ({ ...prev, [actionType]: true }));
      if (onActionRecorded) {
        onActionRecorded({ action_type: actionType, rating });
      }
    } catch (error) {
      console.error(`Failed to record ${actionType}:`, error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRating(value) {
    setRating(value);
    await recordAction('rate', value);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Feedback & Actions</h3>
      
      {/* Action Buttons */}
      <div className="space-y-2 mb-4">
        <button
          onClick={() => recordAction('reuse')}
          disabled={loading || recordedActions.reuse}
          className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Repeat2 className="w-4 h-4" />
          {recordedActions.reuse ? 'Marked as Reused' : 'Mark as Reused'}
        </button>
        
        <button
          onClick={() => recordAction('share')}
          disabled={loading || recordedActions.share}
          className="w-full flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded border border-green-200 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Share2 className="w-4 h-4" />
          {recordedActions.share ? 'Marked as Shared' : 'Mark as Shared'}
        </button>
      </div>

      {/* Rating */}
      <div className="border-t border-slate-200 pt-4">
        <p className="text-sm text-slate-600 mb-2">How useful was this entry?</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => handleRating(value)}
              onMouseEnter={() => setHoverRating(value)}
              onMouseLeave={() => setHoverRating(0)}
              disabled={loading}
              className="transition-transform hover:scale-110 disabled:cursor-not-allowed"
            >
              <Star
                className={`w-6 h-6 ${
                  value <= (hoverRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-slate-300'
                }`}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="mt-2 text-xs text-slate-600">
            You rated this entry {rating} out of 5 stars
          </p>
        )}
      </div>

      {/* Action Summary */}
      <div className="border-t border-slate-200 mt-4 pt-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {recordedActions.view && (
            <div className="flex items-center gap-1 text-slate-600">
              <Eye className="w-3 h-3" />
              View recorded
            </div>
          )}
          {recordedActions.reuse && (
            <div className="flex items-center gap-1 text-blue-600">
              <Repeat2 className="w-3 h-3" />
              Reuse recorded
            </div>
          )}
          {recordedActions.share && (
            <div className="flex items-center gap-1 text-green-600">
              <Share2 className="w-3 h-3" />
              Share recorded
            </div>
          )}
          {recordedActions.rate && (
            <div className="flex items-center gap-1 text-yellow-600">
              <Star className="w-3 h-3" />
              Rating recorded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
