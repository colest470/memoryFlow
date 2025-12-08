# Semantic Search & Analytics System

## Overview

MemoryFlow now includes a complete semantic search and user feedback loop system that enables:

- **Vector-based semantic search** using cosine similarity embeddings
- **User action tracking** (reuse, share, edit, rate, view) for relevance ranking
- **Similarity graph visualization** showing related entries and engagement metrics
- **Organization-wide insights** revealing most reused and trending knowledge

## Architecture

### Database Layer

#### embeddings table
Stores vector embeddings for semantic search using cosine similarity.

```sql
CREATE TABLE embeddings (
  id uuid PRIMARY KEY,
  memory_entry_id uuid REFERENCES memory_entries(id),
  embedding bytea,              -- JSON-encoded vector
  model text,                   -- e.g., "sentence-transformers/all-MiniLM-L6-v2"
  created_at, updated_at timestamptz
);
```

**Purpose**: Enable semantic (meaning-based) search rather than keyword matching.

**Embedding Generation**: 
- **Current**: JavaScript-based mock embeddings (deterministic, development-ready)
- **Production**: Replace with real API (OpenAI embeddings, HuggingFace, Cohere, or local sentence-transformers)

#### user_memory_actions table
Tracks all user interactions for feedback loop and ranking improvements.

```sql
CREATE TABLE user_memory_actions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  memory_entry_id uuid REFERENCES memory_entries(id),
  action_type text,   -- 'reuse', 'share', 'edit', 'rate', 'view'
  rating integer,      -- 1-5 for 'rate' actions
  created_at timestamptz
);
```

**Purpose**: Build user feedback loop that improves search ranking and identifies high-value knowledge.

---

## Backend Services

### 1. Embeddings Service (`backend/src/services/embeddings.js`)

**Key Functions**:

```javascript
// Generate embedding for a memory entry
generateEmbedding(memoryEntryId, text)
  → stores in embeddings table
  → called after entry creation

// Retrieve stored embedding
getEmbedding(memoryEntryId)
  → returns parsed embedding vector

// Find similar entries
findSimilarEntries(queryEmbedding, organizationId, limit=10, minSimilarity=0.3)
  → computes cosine similarity against all org entries
  → returns sorted results with similarity scores

// Cosine similarity computation
cosineSimilarity(vec1, vec2)
  → returns score between 0 and 1
  → 1.0 = identical, 0.0 = orthogonal
```

**Embedding Format**:
- **Size**: 384-dimensional vector (matches MiniLM-L6-v2)
- **Storage**: JSON-encoded string → bytea in SQLite
- **Similarity**: Cosine distance (dot product / magnitudes)

**Workflow**:
```
User adds entry → Generate embedding → Store in embeddings table
                ↓
User searches  → Generate query embedding → Compare against all stored embeddings
                ↓
              Return sorted results with similarity scores
```

### 2. Actions Service (`backend/src/services/actions.js`)

**Key Functions**:

```javascript
// Record user action
recordAction(userId, memoryEntryId, actionType, options)
  → actionType: 'reuse' | 'share' | 'edit' | 'rate' | 'view'
  → options: { rating: 1-5 }
  → auto-updates memory_entries metadata with action counts

// Get action history
getActionHistory(memoryEntryId, filters)
  → filters: { userId, actionType, limit }
  → returns chronological action records

// User activity summary
getUserActivitySummary(userId, organizationId)
  → action counts by type
  → top entries authored by user
  → last activity timestamp

// Organization analytics
getMostReusedEntries(organizationId, limit)
  → sorted by reuse count descending
  → includes share count and avg rating

getLowRatedEntries(organizationId, limit)
  → entries with avg rating < X
  → identifies improvement opportunities
```

**Action Recording Flow**:
```
User clicks "Mark as Reused" → recordAction() called
                ↓
          Insert into user_memory_actions
                ↓
      Update memory_entries.metadata with incremented count
                ↓
      Response: { success: true, action: {...} }
```

---

## API Endpoints

### 1. Semantic Search
**POST** `/api/entries/search/semantic`

```bash
curl -X POST http://localhost:3001/api/entries/search/semantic \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "user authentication patterns",
    "limit": 10,
    "minSimilarity": 0.3
  }'
```

**Response**:
```json
{
  "query": "user authentication patterns",
  "results": [
    {
      "memory_entry_id": "uuid-1",
      "title": "OAuth2 Implementation",
      "similarity": 0.87,
      "created_at": "2025-01-15T10:30:00Z"
    },
    {
      "memory_entry_id": "uuid-2",
      "title": "JWT Token Strategy",
      "similarity": 0.75,
      "created_at": "2025-01-14T14:20:00Z"
    }
  ],
  "count": 2
}
```

### 2. Record User Action
**POST** `/api/entries/:id/action`

```bash
curl -X POST http://localhost:3001/api/entries/e47ac10b-58cc-4372-a567-0e02b2c3d479/action \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "action_type": "rate",
    "rating": 5
  }'
```

**Valid action_type values**: `reuse`, `share`, `edit`, `rate`, `view`

**Response**:
```json
{
  "success": true,
  "action": {
    "id": "uuid",
    "user_id": "uuid",
    "memory_entry_id": "uuid",
    "action_type": "rate",
    "rating": 5,
    "created_at": "2025-01-16T09:45:00Z"
  }
}
```

### 3. Get Action History
**GET** `/api/entries/:id/actions?limit=50&actionType=reuse`

Returns all actions recorded on an entry, filterable by user action type.

```json
{
  "memory_entry_id": "uuid",
  "actions": [
    { "action_type": "view", "created_at": "..." },
    { "action_type": "reuse", "created_at": "..." },
    { "action_type": "rate", "rating": 5, "created_at": "..." }
  ],
  "count": 3
}
```

### 4. User Activity Summary
**GET** `/api/entries/user/activity`

```json
{
  "user_id": "uuid",
  "action_counts": {
    "view": 42,
    "reuse": 15,
    "share": 8,
    "rate": 5
  },
  "top_entries": [
    {
      "id": "uuid",
      "title": "API Design Patterns",
      "reuse_count": 12,
      "share_count": 5,
      "avg_rating": 4.8
    }
  ],
  "last_activity": "2025-01-16T14:30:00Z"
}
```

### 5. Entry Similarity Graph
**GET** `/api/entries/:id/graph`

Returns entry details, related entries, and engagement analytics.

```json
{
  "entry": { /* full entry object */ },
  "related_entries": [
    {
      "id": "uuid",
      "title": "Related Entry",
      "entry_type": "insight",
      "link_type": "related_to",
      "created_at": "..."
    }
  ],
  "analytics": {
    "reuse_count": 5,
    "share_count": 3,
    "view_count": 42,
    "avg_rating": 4.6,
    "rating_count": 5
  }
}
```

### 6. Organization Insights
**GET** `/api/entries/insights/organization`

Organization-wide analytics and trending entries.

```json
{
  "organization": "acme-corp",
  "most_reused": [
    {
      "id": "uuid",
      "title": "Best Practices",
      "reuse_count": 47,
      "share_count": 23,
      "avg_rating": 4.7
    }
  ],
  "trending": [
    {
      "id": "uuid",
      "title": "New Framework Review",
      "reuse_count": 5,
      "share_count": 2,
      "created_at": "2025-01-14T10:00:00Z"
    }
  ]
}
```

---

## Frontend Components

### 1. SemanticSearchBar (`components/search/SemanticSearchBar.jsx`)
Advanced search input with real-time semantic similarity visualization.

**Props**:
- `onResultsFound` (callback): Called when search completes

**Features**:
- Vector-based search via `/api/entries/search/semantic`
- Similarity score visualization (0-100%)
- Result ranking by relevance

**Usage**:
```jsx
<SemanticSearchBar 
  onResultsFound={(results) => console.log(results)}
/>
```

### 2. EntryFeedback (`components/entries/EntryFeedback.jsx`)
User feedback UI for recording actions and ratings on entries.

**Props**:
- `entryId`: Memory entry UUID
- `onActionRecorded` (callback): Called when action recorded

**Features**:
- Mark as reused / shared buttons
- 5-star rating system
- Visual feedback for recorded actions

**Usage**:
```jsx
<EntryFeedback 
  entryId={entryId}
  onActionRecorded={(action) => refreshGraph()}
/>
```

### 3. SimilarityGraph (`components/entries/SimilarityGraph.jsx`)
Visualizes entry relationships and engagement metrics.

**Props**:
- `entryId`: Memory entry UUID

**Displays**:
- View, reuse, share, and rating counts
- Related entries from timeline_links
- Link types (followed_from, revised_by, related_to, built_upon)

**Usage**:
```jsx
<SimilarityGraph entryId={entryId} />
```

### 4. OrganizationInsights (`components/dashboard/OrganizationInsights.jsx`)
Dashboard component showing org-wide knowledge insights.

**Displays**:
- Top 5 most reused entries
- Top 5 trending entries (last 7 days)
- Engagement metrics and author info

**Usage**:
```jsx
<OrganizationInsights />
```

---

## API Helper Methods

All new endpoints are exposed via `entriesAPI` in `frontend/src/lib/api/entries.js`:

```javascript
// Semantic search
entriesAPI.semanticSearch(query, options)
  → options: { limit, minSimilarity }

// Record action
entriesAPI.recordAction(entryId, actionType, options)
  → options: { rating }

// Get action history
entriesAPI.getActionHistory(entryId, filters)
  → filters: { limit, actionType }

// Get user activity
entriesAPI.getUserActivity()

// Get entry graph
entriesAPI.getEntryGraph(entryId)

// Get org insights
entriesAPI.getOrganizationInsights()
```

---

## System Learning Loop

The feedback system implements continuous improvement:

```
User adds entry
    ↓
Entry is created + embedding generated
    ↓
User searches (semantic) ← uses embedding to rank by similarity
    ↓
User views, reuses, shares, rates entry
    ↓
Actions recorded in user_memory_actions table
    ↓
Entry metadata updated with engagement counts
    ↓
Next search uses updated metadata to re-rank results
    ↓
Organization insights reflect most valuable knowledge
```

### Example: Improving Search Ranking

**Scenario**: Two entries about "API design" have similar embeddings (similarity: 0.85 each).

**Initial state**: Both appear equally relevant in search results.

**After feedback**:
- Entry A: 5 reuses, 3 shares, avg rating 4.8
- Entry B: 1 reuse, 0 shares, avg rating 2.1

**Next iteration**: Search results can be re-ranked using metadata weights:
```javascript
score = embedding_similarity * 0.6 + (reuse_count + share_count) * 0.3 + (avg_rating / 5) * 0.1
```

---

## Implementation Roadmap

### Phase 1: Foundation ✅
- [x] embeddings table
- [x] user_memory_actions table
- [x] Embedding service (mock implementation)
- [x] Actions service
- [x] Backend API endpoints
- [x] Frontend API helper
- [x] Basic UI components

### Phase 2: Production Embeddings
- [ ] Integrate real embedding API:
  - OpenAI embeddings (`text-embedding-3-small`)
  - or HuggingFace (`sentence-transformers/all-MiniLM-L6-v2`)
  - or local model deployment
- [ ] Background job to backfill embeddings for existing entries
- [ ] Embedding versioning (track model used)

### Phase 3: Advanced Analytics
- [ ] Advanced ranking formula (combine similarity + engagement + metadata)
- [ ] Trending detection (velocity-based, not just recency)
- [ ] Anomaly detection (unusual spike in reuses = quality indicator)
- [ ] Department-specific insights
- [ ] Time-series analytics dashboard

### Phase 4: Personalization
- [ ] User-specific ranking (user's own entries ranked higher)
- [ ] Collaborative filtering (if user A reused X and Y, suggest X users like also reused Z)
- [ ] Personalized trending (entries trending in user's department)
- [ ] Search history + suggestions

### Phase 5: Knowledge Graph
- [ ] Explicit knowledge graph UI (node-link diagram)
- [ ] Automatic community detection (clusters of related entries)
- [ ] "Knowledge gaps" identification (topics with few entries)
- [ ] Citation tracking (which entries reference which)

---

## Performance Considerations

### Semantic Search Scaling

**Current approach (SQLite + JS)**: 
- Loads all organization embeddings into memory
- Computes similarity for each (O(n) embeddings × O(d) dimensions)
- **Suitable for**: < 10,000 entries per organization

**Optimizations**:
1. **Approximate Nearest Neighbor (ANN)** using `sqlite-vss` or `faiss.wasm`
   - Reduces lookup from O(n) to O(log n)
   - Enables thousands of entries efficiently

2. **Vector index caching**
   - Store embeddings in memory after first access
   - Update on entry creation

3. **Limit search scope**
   - Filter by project_id, author_id, date range first
   - Then search within subset

### Action Tracking
- Actions table has indexes on `user_id`, `memory_entry_id`, `action_type`
- Metadata updates are batched (not per-action)
- Aggregates (counts, ratings) computed on read, not write

---

## Production Checklist

- [ ] Replace mock embeddings with real API
- [ ] Add embedding backfill migration
- [ ] Implement ANN index for vector search
- [ ] Rate limit semantic search (expensive operation)
- [ ] Add caching layer (Redis for recent searches)
- [ ] Monitor embedding API costs
- [ ] Set up analytics dashboard
- [ ] Document search ranking formula
- [ ] Test with 100K+ entries
- [ ] Load testing (concurrent searches)

---

## Troubleshooting

### "Semantic search returns no results"
- Check `minSimilarity` threshold (default 0.3)
- Verify embeddings exist: `SELECT COUNT(*) FROM embeddings`
- Try broader query terms
- Ensure entries are `status='active'`

### "Actions not appearing in history"
- Verify user has access to entry (organization match)
- Check `user_memory_actions` table for records
- Confirm action_type is valid (reuse, share, edit, rate, view)

### "Similarity graph shows no related entries"
- Entries need explicit timeline links via `/api/entries/:id/links`
- Check `timeline_links` table for parent_entry_id / child_entry_id

### "Organization insights empty"
- Requires action history (users must engage with entries)
- Run queries directly against user_memory_actions table to verify data

---

## API Reference Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/entries/search/semantic` | POST | Vector-based semantic search |
| `/api/entries/:id/action` | POST | Record user action (reuse, share, rate, etc.) |
| `/api/entries/:id/actions` | GET | Retrieve action history for entry |
| `/api/entries/user/activity` | GET | Get user's activity summary |
| `/api/entries/:id/graph` | GET | Get entry + related entries + analytics |
| `/api/entries/insights/organization` | GET | Org-wide insights (most reused, trending) |

---

## Questions & Next Steps

For questions or to contribute:
1. Check `/TROUBLESHOOTING.md` for common issues
2. Review service code in `backend/src/services/`
3. See component usage in `frontend/src/components/`
4. Refer to API guide in `/API_GUIDE.md`
