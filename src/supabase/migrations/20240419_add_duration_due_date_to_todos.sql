-- Add duration and due_date columns to project_todos table
ALTER TABLE project_todos
ADD COLUMN duration_minutes INTEGER,
ADD COLUMN due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN name TEXT NOT NULL DEFAULT 'Untitled Task',
ADD COLUMN description TEXT;

-- Add index for better query performance on due_date
CREATE INDEX idx_project_todos_due_date ON project_todos(due_date);

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view todos they're assigned to or todos in their projects" ON project_todos;

-- Create new policy for viewing todos
CREATE POLICY "Users can view todos they're assigned to or todos in their projects"
ON project_todos
FOR SELECT
USING (
  assigned_to = auth.uid() OR
  project_id IN (
    SELECT project_id FROM project_collaborators
    WHERE user_id = auth.uid()
  )
);

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Project editors can set task duration and due date" ON project_todos;

-- Create policy for updating duration and due_date
CREATE POLICY "Project editors can set task duration and due date"
ON project_todos
FOR UPDATE
USING (
  project_id IN (
    SELECT project_id FROM project_collaborators
    WHERE user_id = auth.uid()
    AND role IN ('editor', 'admin')
  )
)
WITH CHECK (
  project_id IN (
    SELECT project_id FROM project_collaborators
    WHERE user_id = auth.uid()
    AND role IN ('editor', 'admin')
  )
); 