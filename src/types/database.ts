export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string // uuid, references auth.users.id
          display_name: string | null // text
          email: string | null // text
          avatar_url: string | null // text
          created_at: string | null // timestamptz
          updated_at: string | null // timestamptz
          bio: string | null // text
        }
        Insert: {
          id: string // uuid
          display_name?: string | null
          email?: string | null
          avatar_url?: string | null
          created_at?: string | null
          updated_at?: string | null
          bio?: string | null
        }
        Update: {
          id?: string
          display_name?: string | null
          email?: string | null
          avatar_url?: string | null
          created_at?: string | null
          updated_at?: string | null
          bio?: string | null
        }
      }

      projects: {
        Row: {
          id: string // uuid
          name: string // text
          description: string | null // text
          owner_id: string // uuid, references auth.users.id
          created_at: string | null // timestamptz
          updated_at: string | null // timestamptz
          is_public: boolean | null // bool
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          created_at?: string | null
          updated_at?: string | null
          is_public?: boolean | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string
          created_at?: string | null
          updated_at?: string | null
          is_public?: boolean | null
        }
      }

      project_members: { // Assuming this name based on RLS, diagram shows 'project_collaborators'
        Row: {
          project_id: string // uuid, PK, FK to projects.id
          user_id: string // uuid, PK, FK to auth.users.id
          role: string | null // text
          created_at: string | null // timestamptz
          updated_at: string | null // timestamptz
          // Note: Diagram doesn't show a separate 'id' PK column for this junction table
        }
        Insert: {
          project_id: string
          user_id: string
          role?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          project_id?: string
          user_id?: string
          role?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }

      project_todos: {
        Row: {
          id: string // uuid
          project_id: string // uuid, FK to projects.id
          description: string | null // text
          completed: boolean | null // bool
          created_at: string | null // timestamptz
          updated_at: string | null // timestamptz
          assigned_to: string | null // uuid, FK to auth.users.id (added by migration)
          // Note: Diagram doesn't show 'title', 'status', 'created_by'
        }
        Insert: {
          id?: string
          project_id: string
          description?: string | null
          completed?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          assigned_to?: string | null // added by migration
        }
        Update: {
          id?: string
          project_id?: string
          description?: string | null
          completed?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          assigned_to?: string | null // added by migration
        }
      }

      project_updates: {
        Row: {
          id: string // uuid
          project_id: string // uuid, FK to projects.id
          user_id: string // uuid, FK to auth.users.id
          description: string | null // text
          created_at: string | null // timestamptz
          updated_at: string | null // timestamptz
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }

      project_files: {
        Row: {
          id: string // uuid
          project_id: string // uuid, FK to projects.id
          name: string | null // text
          file_path: string | null // text
          file_type: string | null // text
          size_bytes: number | null // int8
          uploaded_by: string // uuid, FK to auth.users.id
          created_at: string | null // timestamptz
          updated_at: string | null // timestamptz
          url: string | null // text
          update_id: string | null // uuid
        }
        Insert: {
          id?: string
          project_id: string
          name?: string | null
          file_path?: string | null
          file_type?: string | null
          size_bytes?: number | null
          uploaded_by: string
          created_at?: string | null
          updated_at?: string | null
          url?: string | null
          update_id?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          name?: string | null
          file_path?: string | null
          file_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string
          created_at?: string | null
          updated_at?: string | null
          url?: string | null
          update_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 