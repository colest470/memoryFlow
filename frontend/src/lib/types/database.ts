export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          department: string | null
          organization: string
          role: 'student' | 'researcher' | 'faculty' | 'employee' | 'manager' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          department?: string | null
          organization: string
          role: 'student' | 'researcher' | 'faculty' | 'employee' | 'manager' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          department?: string | null
          organization?: string
          role?: 'student' | 'researcher' | 'faculty' | 'employee' | 'manager' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          title: string
          description: string | null
          department: string | null
          organization: string
          status: 'active' | 'completed' | 'archived'
          owner_id: string
          created_at: string
          updated_at: string
          metadata: Json
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          department?: string | null
          organization: string
          status?: 'active' | 'completed' | 'archived'
          owner_id: string
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          department?: string | null
          organization?: string
          status?: 'active' | 'completed' | 'archived'
          owner_id?: string
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
      }
      memory_entries: {
        Row: {
          id: string
          title: string
          content: string | null
          entry_type: 'report' | 'meeting_note' | 'insight' | 'decision' | 'experiment' | 'outcome' | 'proposal' | 'result'
          project_id: string | null
          author_id: string
          status: 'active' | 'archived' | 'lesson_learned'
          department: string | null
          tags: string[]
          created_at: string
          updated_at: string
          metadata: Json
        }
        Insert: {
          id?: string
          title: string
          content?: string | null
          entry_type: 'report' | 'meeting_note' | 'insight' | 'decision' | 'experiment' | 'outcome' | 'proposal' | 'result'
          project_id?: string | null
          author_id: string
          status?: 'active' | 'archived' | 'lesson_learned'
          department?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
        Update: {
          id?: string
          title?: string
          content?: string | null
          entry_type?: 'report' | 'meeting_note' | 'insight' | 'decision' | 'experiment' | 'outcome' | 'proposal' | 'result'
          project_id?: string | null
          author_id?: string
          status?: 'active' | 'archived' | 'lesson_learned'
          department?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
      }
      timeline_links: {
        Row: {
          id: string
          parent_entry_id: string
          child_entry_id: string
          link_type: 'followed_from' | 'revised_by' | 'related_to' | 'built_upon'
          created_at: string
        }
        Insert: {
          id?: string
          parent_entry_id: string
          child_entry_id: string
          link_type: 'followed_from' | 'revised_by' | 'related_to' | 'built_upon'
          created_at?: string
        }
        Update: {
          id?: string
          parent_entry_id?: string
          child_entry_id?: string
          link_type?: 'followed_from' | 'revised_by' | 'related_to' | 'built_upon'
          created_at?: string
        }
      }
    }
  }
}
