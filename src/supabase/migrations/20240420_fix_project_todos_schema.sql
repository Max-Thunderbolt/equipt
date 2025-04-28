-- Drop the existing tables if they exist
DROP TABLE IF EXISTS project_subtasks CASCADE;
DROP TABLE IF EXISTS project_todos CASCADE;

-- Recreate the project_todos table with the correct schema
CREATE TABLE project_todos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Untitled Task',
    description TEXT,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_to UUID REFERENCES auth.users(id),
    duration_minutes INTEGER,
    due_date TIMESTAMPTZ
);

-- Create the project_subtasks table
CREATE TABLE project_subtasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    todo_id UUID NOT NULL REFERENCES project_todos(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_project_todos_project_id ON project_todos(project_id);
CREATE INDEX idx_project_todos_assigned_to ON project_todos(assigned_to);
CREATE INDEX idx_project_todos_due_date ON project_todos(due_date);
CREATE INDEX idx_project_subtasks_todo_id ON project_subtasks(todo_id);

-- Enable RLS
ALTER TABLE project_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_subtasks ENABLE ROW LEVEL SECURITY;

-- Create a simple policy for project_todos
CREATE POLICY "Enable all access for authenticated users"
ON project_todos
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Create a simple policy for project_subtasks
CREATE POLICY "Enable all access for authenticated users"
ON project_subtasks
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated'); 