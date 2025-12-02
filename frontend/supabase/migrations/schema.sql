/*
  # MemoryFlow Core Schema

  ## Tables Created
  
  ### 1. profiles
  Extended user information linked to auth.users
  - id: UUID reference to auth.users
  - full_name: User's display name
  - department: Department/faculty affiliation
  - organization: Institution or company name
  - role: User type (student, researcher, faculty, employee, manager)
  - created_at, updated_at: Timestamps
  
  ### 2. projects
  Container for related memory entries
  - id: Primary key
  - title, description: Project details
  - department, organization: Organizational context
  - status: active, completed, or archived
  - owner_id: Creator reference
  - metadata: Flexible JSONB for custom fields
  
  ### 3. memory_entries
  Core knowledge units
  - id: Primary key
  - title, content: Entry details
  - entry_type: report, meeting_note, insight, decision, experiment, outcome
  - project_id: Parent project
  - author_id: Creator
  - status: active, archived, lesson_learned
  - department: Organizational unit
  - tags: Keyword array for categorization
  - metadata: JSONB for AI-generated tags, summaries, embeddings
  
  ### 4. timeline_links
  Creates the memory chain
  - parent_entry_id, child_entry_id: Linked entries
  - link_type: followed_from, revised_by, related_to, built_upon
  
  ## Security
  - RLS enabled on all tables
  - Organization-scoped access policies
  - User ownership checks for mutations
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  department text,
  organization text NOT NULL,
  role text NOT NULL CHECK (role IN ('student', 'researcher', 'faculty', 'employee', 'manager', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view profiles in their organization"
  ON profiles FOR SELECT
  TO authenticated
  USING (organization = (SELECT organization FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  department text,
  organization text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view projects in their organization"
  ON projects FOR SELECT
  TO authenticated
  USING (organization = (SELECT organization FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid() AND
    organization = (SELECT organization FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Project owners can update their projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Project owners can delete their projects"
  ON projects FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Create memory_entries table
CREATE TABLE IF NOT EXISTS memory_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  entry_type text NOT NULL CHECK (entry_type IN ('report', 'meeting_note', 'insight', 'decision', 'experiment', 'outcome', 'proposal', 'result')),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'lesson_learned')),
  department text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE memory_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view entries in their organization"
  ON memory_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = memory_entries.author_id
      AND profiles.organization = (SELECT organization FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can create memory entries"
  ON memory_entries FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can update their entries"
  ON memory_entries FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can delete their entries"
  ON memory_entries FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- Create timeline_links table
CREATE TABLE IF NOT EXISTS timeline_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_entry_id uuid NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
  child_entry_id uuid NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
  link_type text NOT NULL CHECK (link_type IN ('followed_from', 'revised_by', 'related_to', 'built_upon')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_entry_id, child_entry_id)
);

ALTER TABLE timeline_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view links for entries they can see"
  ON timeline_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memory_entries me
      JOIN profiles p ON p.id = me.author_id
      WHERE me.id = timeline_links.parent_entry_id
      AND p.organization = (SELECT organization FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can create links for their entries"
  ON timeline_links FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memory_entries
      WHERE id = parent_entry_id AND author_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_memory_entries_project ON memory_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_memory_entries_author ON memory_entries(author_id);
CREATE INDEX IF NOT EXISTS idx_memory_entries_created ON memory_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_entries_tags ON memory_entries USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_timeline_links_parent ON timeline_links(parent_entry_id);
CREATE INDEX IF NOT EXISTS idx_timeline_links_child ON timeline_links(child_entry_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization);