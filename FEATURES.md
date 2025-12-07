# MemoryFlow Complete Feature Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/Vite)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ AuthContext                                          │  │
│  │ - Manages authentication state                       │  │
│  │ - Auto-refreshes tokens                              │  │
│  │ - Persists user session                              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Components                                           │  │
│  │ - EntryForm (create/edit entries)                    │  │
│  │ - SmartSearch (find knowledge)                       │  │
│  │ - EntryDetail (view context)                         │  │
│  │ - DashboardStats (monitor health)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ API Layer (lib/api/entries.js)                       │  │
│  │ - Centralized API calls                              │  │
│  │ - Error handling & auth headers                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP (JWT Auth)
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Node/Express)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Routes                                               │  │
│  │ - /api/auth (login, register)                        │  │
│  │ - /api/user (profile, refresh, logout)               │  │
│  │ - /api/entries (create, search, link, stats)         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Middleware                                           │  │
│  │ - authenticateToken (JWT verification)               │  │
│  │ - generateTokens (access + refresh)                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓ SQL Queries
┌─────────────────────────────────────────────────────────────┐
│                   Database (SQLite)                         │
│  - profiles (users)                                         │
│  - memory_entries (knowledge base)                          │
│  - timeline_links (entry relationships)                     │
│  - refresh_tokens (session management)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## User Journeys

### Journey 1: Onboarding New User

```
1. User visits app
   ↓
2. AuthContext checks localStorage for token
   ├─ If token exists: verify with /api/user/profile
   ├─ If valid: load dashboard with user data
   └─ If invalid/expired: show login page
   ↓
3. User enters credentials → /api/auth/login
   ↓
4. Backend verifies password and creates tokens
   ├─ Access token → localStorage
   └─ Refresh token → httpOnly cookie
   ↓
5. Frontend stores user in AuthContext
   ↓
6. Dashboard loads with organization-scoped data
```

### Journey 2: Creating Knowledge Entry

```
User clicks "Add Knowledge"
   ↓
EntryForm modal opens with two paths:

PATH A: Simple Upload
   ├─ User fills: title, content, type, tags
   ├─ Click "Create Entry"
   ├─ POST /api/entries with data
   └─ Entry saved, modal closes, SmartSearch refreshes
   ↓
PATH B: AI-Assisted
   ├─ User enables "Use AI Assistance"
   ├─ Fills: title, content, type
   ├─ Clicks "Get AI Suggestions"
   ├─ Frontend generates suggestions (simulated)
   ├─ Displays: suggested tags, summary
   ├─ User accepts/edits suggestions
   ├─ Click "Create Entry"
   └─ POST /api/entries with metadata
   ↓
Optional: Link to existing entry
   ├─ Select parent entry
   ├─ Choose relationship type (followed_from, etc.)
   └─ Creates timeline_link in database
```

### Journey 3: Finding Knowledge

```
User searches for insights
   ↓
SmartSearch component renders
   ├─ User types search query
   ├─ Can apply filters:
   │  ├─ Entry type (report, meeting_note, etc.)
   │  ├─ Status (active, archived, lesson_learned)
   │  ├─ Sort by (created, updated, title)
   │  └─ Order (newest, oldest)
   ↓
Click "Search"
   ├─ GET /api/entries?q=query&filters
   ├─ Backend filters by organization
   ├─ Returns paginated results
   ↓
Results display with options:
   ├─ Click entry → EntryDetail modal opens
   ├─ Click "Link Entry" → EntryForm for related entry
   └─ Scroll for more results (pagination)
```

### Journey 4: Viewing Entry Context

```
User clicks on search result
   ↓
EntryDetail modal opens
   ├─ GET /api/entries/:id
   ├─ Returns: entry + connections
   ↓
Display shows:
   ├─ Title, content, metadata
   ├─ Author, department, dates
   ├─ Tags and status
   ├─ AI suggestions (if available)
   ├─ Related entries with link types
   └─ Action buttons
   ↓
User can:
   ├─ Click related entry → view it
   ├─ Click "Add Related Entry" → EntryForm with parent_id
   └─ Close modal
```

### Journey 5: Monitoring Dashboard

```
Dashboard page loads
   ↓
DashboardStats component:
   ├─ GET /api/entries/stats/dashboard
   ├─ Calculates metrics:
   │  ├─ Total entries
   │  ├─ Active contributors
   │  ├─ Recent activity (%)
   │  └─ Knowledge health (%)
   ↓
Display sections:
   ├─ 4 metric cards at top
   ├─ Entries by type (bar chart)
   ├─ Knowledge health breakdown (progress bars)
   └─ Risk areas (if any)
   ↓
If risk areas present:
   ├─ Low health: create more active entries
   ├─ Few contributors: invite team members
   └─ Low engagement: encourage regular updates
```

---

## Feature Deep Dives

### Feature: Smart Search

**What it does:**
- Finds entries by text and metadata
- Supports advanced filtering
- Shows paginated results
- Links entries together

**Query Types:**

1. **Simple Search**
   ```
   Query: "performance"
   Results: All entries with "performance" in title/content
   ```

2. **Filtered Search**
   ```
   Type: "insight"
   Status: "active"
   Department: "Engineering"
   Results: Engineering insights marked as active
   ```

3. **Tag Search**
   ```
   Tags: "database,performance"
   Results: Entries tagged with either term
   ```

4. **Author Search**
   ```
   Author: specific user ID
   Results: All entries from that author
   ```

**Behind the scenes:**
```sql
SELECT me.* FROM memory_entries me
JOIN profiles p ON p.id = me.author_id
WHERE p.organization = ?
  AND (me.title LIKE ? OR me.content LIKE ?)
  AND me.entry_type = ?
  AND me.status = ?
  AND me.department = ?
ORDER BY me.created_at DESC
LIMIT 20 OFFSET 0
```

### Feature: Timeline Links

**What it does:**
- Creates relationships between entries
- Shows knowledge flow
- Enables context understanding
- Builds knowledge graphs

**Link Types:**

1. **followed_from**
   - Chronological sequence
   - E.g., Issue → Root Cause → Solution

2. **revised_by**
   - Updated knowledge
   - E.g., Old approach → Better approach

3. **related_to**
   - Associated but not sequential
   - E.g., Bug report ↔ Feature request

4. **built_upon**
   - Dependency/foundation
   - E.g., Research → Implementation

**Creating links:**
```javascript
// From EntryDetail
POST /api/entries/{parentId}/links
{
  "related_entry_id": "{childId}",
  "link_type": "followed_from"
}

// Creates in database
INSERT INTO timeline_links
  (parent_entry_id, child_entry_id, link_type)
VALUES (?, ?, ?)
```

### Feature: AI Suggestions

**What it does:**
- Suggests tags based on content
- Provides automatic summary
- Categorizes entries
- Enhances discoverability

**Current Implementation:**
- Frontend simulates AI (1.5s delay)
- Ready for real API integration

**Integration Steps:**
```javascript
// In EntryForm.jsx
const handleAISuggestions = async () => {
  const suggestions = await fetch('/api/ai/suggest', {
    method: 'POST',
    body: JSON.stringify({
      title: formData.title,
      content: formData.content
    })
  });
  
  const { tags, summary, category } = await suggestions.json();
  setFormData(prev => ({
    ...prev,
    metadata: { ai_generated_tags: tags, ai_summary: summary }
  }));
};
```

### Feature: Dashboard Statistics

**What it does:**
- Monitors organizational knowledge health
- Tracks team engagement
- Identifies risk areas
- Shows trends

**Metrics:**

1. **Knowledge Health (Active %)**
   - Healthy: > 80% active entries
   - Caution: 60-80% active
   - Risk: < 60% active

2. **Team Engagement (Recent %)**
   - High: > 50% entries in last 7 days
   - Medium: 30-50%
   - Low: < 30%

3. **Contributor Count**
   - Ideal: 5+ active contributors
   - Caution: 3-4 contributors
   - Risk: < 3 contributors

4. **Entry Distribution**
   - Shows balance across entry types
   - Helps identify blind spots

**Risk Detection:**
```javascript
const riskAreas = [];
if (knowledgeHealth < 60) {
  riskAreas.push('Many archived entries - knowledge may be outdated');
}
if (activeContributors < 3) {
  riskAreas.push('Low contributor count - limited knowledge sharing');
}
if (engagementRate < 30) {
  riskAreas.push('Low recent activity - knowledge not being updated');
}
```

---

## Data Flow Examples

### Example 1: Create Entry Flow

```
Frontend (EntryForm)
  │
  └─ User submits form
      │
      ├─ Validate (title required)
      │
      ├─ POST /api/entries
      │   Headers: Authorization: Bearer TOKEN
      │   Body: {
      │     title, content, entry_type,
      │     tags, metadata,
      │     parent_entry_id, link_type
      │   }
      │
Backend (/api/entries POST)
  │
  ├─ Authenticate token
  ├─ Extract user from JWT (user.id, user.organization)
  │
  ├─ Validate input
  │   ├─ title required
  │   ├─ entry_type valid
  │   └─ JSON parse tags/metadata
  │
  ├─ INSERT INTO memory_entries
  │   VALUES (user.id, user.organization, ...)
  │   → Returns entry.id
  │
  ├─ If parent_entry_id:
  │   └─ INSERT INTO timeline_links
  │       VALUES (parent_entry_id, entry.id, link_type)
  │
  ├─ SELECT entry with author details
  │
  └─ Response: { entry }

Frontend (EntryForm)
  │
  └─ Store in state
      └─ Update SmartSearch results
```

### Example 2: Search Entry Flow

```
Frontend (SmartSearch)
  │
  ├─ User types query: "database"
  ├─ User selects filters: type=insight, status=active
  │
  └─ GET /api/entries?q=database&entry_type=insight&status=active
      Headers: Authorization: Bearer TOKEN

Backend (/api/entries GET)
  │
  ├─ Authenticate token
  ├─ Extract organization from user
  │
  ├─ Build SQL:
  │   SELECT me.* FROM memory_entries me
  │   JOIN profiles p ON p.id = me.author_id
  │   WHERE p.organization = 'UserOrg'
  │     AND (me.title LIKE '%database%'
  │       OR me.content LIKE '%database%')
  │     AND me.entry_type = 'insight'
  │     AND me.status = 'active'
  │   ORDER BY me.created_at DESC
  │   LIMIT 20 OFFSET 0
  │
  ├─ Execute query
  ├─ Format results (parse JSON fields)
  │
  └─ Response: { entries, pagination }

Frontend (SmartSearch)
  │
  └─ Render results with:
      ├─ Title, preview
      ├─ Type badge, status badge
      ├─ Tags
      └─ Author, date
```

### Example 3: Session Refresh Flow

```
Frontend: User is idle
  │
  ├─ Access token expires (15 min)
  │
  └─ Next API call receives 401
      │
API Call with expired token
  │
  └─ GET /api/entries
      Headers: Authorization: Bearer EXPIRED_TOKEN
      │
Backend
  │
  ├─ JWT verification fails
  └─ Response: 401 Unauthorized

Frontend (AuthContext apiRequest)
  │
  ├─ Catch 401 response
  ├─ Check if refreshToken exists in cookie
  │
  └─ POST /api/user/refresh
      Credentials: include (sends refreshToken cookie)

Backend (/api/user/refresh POST)
  │
  ├─ Get refreshToken from cookie
  ├─ Query: SELECT * FROM refresh_tokens WHERE token = ?
  │
  ├─ If valid and not expired:
  │   ├─ Generate new access token
  │   ├─ Generate new refresh token
  │   ├─ DELETE old refresh_token
  │   ├─ INSERT new refresh_token
  │   └─ Set new refreshToken cookie
  │
  └─ Response: { accessToken, user }

Frontend (AuthContext)
  │
  ├─ Store new accessToken in localStorage
  ├─ Retry original request with new token
  │
  └─ GET /api/entries
      Headers: Authorization: Bearer NEW_TOKEN
      │
  └─ Response: 200 OK ✓
```

---

## Configuration

### Backend .env
```
NODE_ENV=development
PORT=4000
JWT_SECRET_KEY=your-secret-key-here
CLIENT_URL=http://localhost:5173
DATABASE_PATH=./memory.db
```

### Frontend .env
```
VITE_API_BACKEND=http://localhost:4000
```

### Database Setup
```bash
# Initialize SQLite with schema
sqlite3 memory.db < schema.sql

# Verify tables
sqlite3 memory.db ".tables"
```

---

## Scaling Considerations

### Current Limitations
- Single SQLite database (file-based)
- No distributed caching
- Synchronous database queries
- Organization-based data isolation (no user-level)

### For Production Scale

**Database:**
- Migrate to PostgreSQL
- Add read replicas
- Implement connection pooling

**Caching:**
- Add Redis for stats caching
- Cache search results
- Session caching

**Performance:**
- Async database operations
- Query optimization
- Index tuning
- Pagination mandatory

**Security:**
- Rate limiting per user
- Request validation
- SQL injection prevention (use parameterized queries)
- CSRF protection

**Monitoring:**
- Log all API calls
- Monitor error rates
- Track response times
- Alert on failures
