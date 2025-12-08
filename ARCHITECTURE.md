# MemoryFlow Architecture - Updated (Dec 8, 2025)

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MEMORYFLOW SYSTEM                             │
└─────────────────────────────────────────────────────────────────────┘

┌─ FRONTEND LAYER ────────────────────────────────────────────────────┐
│                                                                      │
│  ┌─ Pages ─────────────┐                                            │
│  │ • Dashboard         │  → Shows DashboardStats + OrganizationInsights
│  │ • ProjectView       │  → Shows TimelineView + EntryForm
│  │ • SearchPage        │  → Shows SemanticSearchBar + SearchResults
│  └─────────────────────┘                                            │
│                                                                      │
│  ┌─ Components ────────────────────────────────────────────────┐   │
│  │ Auth Layer:                                                 │   │
│  │  • LogIn / Signup ──────────────→ [AuthContext]             │   │
│  │                                                             │   │
│  │ Memory Management:                                          │   │
│  │  • EntryForm ──→ POST /api/entries                          │   │
│  │  • EntryDetail ──→ View + EntryFeedback                     │   │
│  │  • EntryFeedback ──→ POST /api/entries/:id/action           │   │
│  │                                                             │   │
│  │ Search & Discovery:                                         │   │
│  │  • SemanticSearchBar ──→ POST /api/entries/search/semantic  │   │
│  │  • SearchResults ──→ Display keyword + semantic results     │   │
│  │                                                             │   │
│  │ Analytics & Insights:                                       │   │
│  │  • SimilarityGraph ──→ GET /api/entries/:id/graph           │   │
│  │  • OrganizationInsights ──→ GET /api/entries/insights/*     │   │
│  │  • DashboardStats ──→ GET /api/entries/stats/*              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ API Helper (entriesAPI) ──────────────────────────────────┐    │
│  │ • createEntry / searchEntries / getEntry / updateEntry     │    │
│  │ • semanticSearch / recordAction / getActionHistory         │    │
│  │ • getUserActivity / getEntryGraph / getOrganizationInsights│    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                 ↓
                         [HTTP / REST API]
                                 ↓
┌─ BACKEND LAYER ─────────────────────────────────────────────────────┐
│                                                                      │
│  ┌─ Routes ───────────────────────────────────────────────────┐    │
│  │ /api/entries (CRUD):                                       │    │
│  │  • POST /     ──→ Create entry + generate embedding        │    │
│  │  • GET /      ──→ Search with filters (keyword)            │    │
│  │  • GET /:id   ──→ Get single entry + connections           │    │
│  │  • PUT /:id   ──→ Update entry                             │    │
│  │  • DELETE /:id ──→ Delete entry                            │    │
│  │                                                            │    │
│  │ /api/entries/search/semantic ──────────────→ [Embeddings] │    │
│  │ /api/entries/:id/action      ──────────────→ [Actions]    │    │
│  │ /api/entries/:id/actions     ──────────────→ [Actions]    │    │
│  │ /api/entries/user/activity   ──────────────→ [Actions]    │    │
│  │ /api/entries/:id/graph       ──────────────→ [Graph+Stats]│    │
│  │ /api/entries/insights/*      ──────────────→ [Analytics]  │    │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ Services ─────────────────────────────────────────────────┐    │
│  │                                                            │    │
│  │ [db.js] ────────────────────→ SQLite DB management        │    │
│  │                                                            │    │
│  │ [embeddings.js] ────────────→ Vector generation & search  │    │
│  │  • generateEmbedding()                                     │    │
│  │  • getEmbedding()                                          │    │
│  │  • findSimilarEntries()  [cosine similarity O(n)]          │    │
│  │  • cosineSimilarity()                                      │    │
│  │                                                            │    │
│  │ [actions.js] ───────────────→ User feedback tracking       │    │
│  │  • recordAction()                                          │    │
│  │  • getActionHistory()                                      │    │
│  │  • getUserActivitySummary()                                │    │
│  │  • getMostReusedEntries()                                  │    │
│  │  • getLowRatedEntries()                                    │    │
│  │                                                            │    │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ Middleware ───────────────────────────────────────────────┐    │
│  │ [tokens.js]                                                │    │
│  │  • authenticateToken() ──→ JWT verification + refresh      │    │
│  │  • generateTokens() ────→ Access + Refresh token creation  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─ DATA LAYER ────────────────────────────────────────────────────────┐
│                                                                      │
│  ┌─ Core Tables ──────────────────────────────────────────────┐    │
│  │ • profiles          [users + roles + organization]         │    │
│  │ • projects          [containers for related entries]       │    │
│  │ • memory_entries    [core knowledge units]                 │    │
│  │ • timeline_links    [relationships between entries]        │    │
│  │ • refresh_tokens    [session management]                   │    │
│  │ • user_organizations [multi-tenancy]                       │    │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ NEW: Vector & Analytics Tables ────────────────────────────┐   │
│  │ • embeddings                                               │   │
│  │   ├─ memory_entry_id (foreign key)                         │   │
│  │   ├─ embedding (bytea, 384-dim vector)                     │   │
│  │   ├─ model (e.g., "sentence-transformers/all-MiniLM")      │   │
│  │   └─ created_at / updated_at                               │   │
│  │                                                            │   │
│  │ • user_memory_actions                                      │   │
│  │   ├─ user_id (foreign key)                                 │   │
│  │   ├─ memory_entry_id (foreign key)                         │   │
│  │   ├─ action_type ('reuse'|'share'|'edit'|'rate'|'view')   │   │
│  │   ├─ rating (1-5 for 'rate' action)                        │   │
│  │   └─ created_at                                            │   │
│  │                                                            │   │
│  │ [Indexes on all FK + action_type for performance]          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ SQLite Database ──────────────────────────────────────────┐    │
│  │ File: memoryflow.db (or configured location)               │    │
│  │ Size: Depends on entries + embeddings (each is ~3KB)       │    │
│  │ Backups: Regular snapshots recommended                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Data Flow: Creating an Entry

```
User fills EntryForm (title, content, tags, type)
    ↓
[Frontend] POST /api/entries
    ↓
[Backend] Create entry + generate embedding
    ├─ INSERT INTO memory_entries (...)
    └─ generateEmbedding(entryId, title + content)
       └─ INSERT INTO embeddings (...)
    ↓
Response: { entry_id, created_at, ... }
    ↓
[Frontend] Refresh TimelineView
    └─ Load updated project timeline
```

## Data Flow: Semantic Search

```
User searches "user authentication best practices"
    ↓
[Frontend] SemanticSearchBar → POST /api/entries/search/semantic
    ↓
[Backend] Route handler
    ├─ Generate embedding for query
    ├─ Fetch all embeddings for org
    ├─ Compute cosine similarity (O(n))
    └─ Sort by similarity descending
    ↓
Response: [
  { entry_id: ..., title: ..., similarity: 0.87 },
  { entry_id: ..., title: ..., similarity: 0.75 },
  ...
]
    ↓
[Frontend] Display results with % match bar
```

## Data Flow: User Feedback & Learning

```
User views entry → EntryFeedback component
    ↓
Auto-record 'view' action
    ↓
User clicks "Mark as Reused" + "Rate: 5 stars"
    ↓
[Frontend] POST /api/entries/{id}/action
    ├─ { action_type: 'reuse' }
    └─ { action_type: 'rate', rating: 5 }
    ↓
[Backend] recordAction()
    ├─ INSERT INTO user_memory_actions (...)
    ├─ UPDATE memory_entries.metadata
    │  └─ Increment actionCounts.reuse, actionCounts.rate
    └─ Response: { success: true }
    ↓
[Backend] Next search can now re-rank using:
    • Embedding similarity: 0.85
    • Reuse count: 15
    • Avg rating: 4.8
    → Composite score = similarity * 0.6 + engagement * 0.4
```

## Data Flow: Organization Insights

```
Organization members view Dashboard
    ↓
[Frontend] OrganizationInsights → GET /api/entries/insights/organization
    ↓
[Backend] Route handler
    ├─ Query most reused:
    │  SELECT me.id, me.title, COUNT(reuse_actions), COUNT(share_actions), AVG(rating)
    │  FROM memory_entries
    │  LEFT JOIN user_memory_actions ON type='reuse'|'share'|'rate'
    │  WHERE org_match
    │  ORDER BY reuse_count DESC
    │
    └─ Query trending (last 7 days):
       SELECT ... WHERE created_at > NOW() - 7d
       ORDER BY (reuse + share) DESC
    ↓
Response: {
  most_reused: [ {...}, {...} ],
  trending: [ {...}, {...} ]
}
    ↓
[Frontend] Display ranked lists with metrics
```

## New Capabilities (Dec 8, 2025)

### Semantic Search
- ✅ Vector-based search (cosine similarity)
- ✅ Meaning-aware (not just keywords)
- ✅ Similarity scoring (0-1)
- ⏳ Production: Replace mock embeddings with real API

### User Feedback Loop
- ✅ Track: view, reuse, share, edit, rate
- ✅ Automatic metadata updates
- ✅ Enable ranking improvements

### Analytics
- ✅ Entry engagement metrics (views, reuses, shares, rating)
- ✅ User activity summary (what they authored, how it's used)
- ✅ Organization insights (most reused, trending, low-rated)
- ✅ Entry similarity graph (related entries + link types)

### Components
- ✅ SemanticSearchBar (search UI)
- ✅ EntryFeedback (action recording UI)
- ✅ SimilarityGraph (entry analytics)
- ✅ OrganizationInsights (org-wide metrics)

---

## Key Technologies

| Layer | Tech | Purpose |
|-------|------|---------|
| Frontend | React + Vite | UI framework + build tool |
| Frontend | Tailwind | Styling |
| Frontend | Lucide | Icons |
| Backend | Express | REST API framework |
| Backend | Node.js | Runtime |
| Database | SQLite | File-based SQL DB |
| Auth | JWT | Stateless authentication |
| Tokens | httpOnly cookies | Secure refresh token storage |
| Vectors | JS math | Cosine similarity (dev); upgradeable to real embeddings |
| Deployment | Docker (optional) | Containerization |

---

## Deployment Checklist

- [ ] Database initialized (schema.sql applied)
- [ ] Backend started: `npm start` in `backend/`
- [ ] Frontend dev server: `npm run dev` in `frontend/`
- [ ] Test auth flow (login → create entry → search)
- [ ] Verify embeddings generated (check DB)
- [ ] Test semantic search (POST /api/entries/search/semantic)
- [ ] Record actions (POST /api/entries/:id/action)
- [ ] View insights (GET /api/entries/insights/organization)

---

## Documentation Files

1. **QUICK_START.md** - Get running in 5 minutes
2. **API_GUIDE.md** - All endpoints + examples
3. **IMPLEMENTATION.md** - Architecture & design decisions
4. **SEMANTIC_SEARCH.md** - Vector search + analytics deep dive
5. **SEMANTIC_IMPLEMENTATION.md** - This sprint's summary
6. **FEATURES.md** - User-facing capabilities
7. **TROUBLESHOOTING.md** - Common issues & solutions

---

**Last Updated**: December 8, 2025
**Status**: ✅ Complete, committed to git
**Next Phase**: Production embeddings integration + ANN optimization

