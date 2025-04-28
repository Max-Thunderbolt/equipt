-- Create subtasks table if it doesn't exist
CREATE TABLE IF NOT EXISTS project_subtasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    todo_id UUID NOT NULL REFERENCES project_todos(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_project_subtasks_todo_id ON project_subtasks(todo_id);

-- Enable RLS
ALTER TABLE project_subtasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view subtasks of todos they can access" ON project_subtasks;
DROP POLICY IF EXISTS "Project editors can manage subtasks" ON project_subtasks;
DROP POLICY IF EXISTS "Assigned users can manage their subtasks" ON project_subtasks;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON project_subtasks;

-- Create a simple policy for authenticated users
CREATE POLICY "Enable all access for authenticated users"
ON project_subtasks
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated'); 