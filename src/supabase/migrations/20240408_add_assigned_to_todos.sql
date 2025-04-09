-- Add assigned_to column to project_todos table
ALTER TABLE project_todos
ADD COLUMN assigned_to UUID REFERENCES auth.users(id);

-- Add index for better query performance
CREATE INDEX idx_project_todos_assigned_to ON project_todos(assigned_to);

-- Add RLS policies for assigned_to column
ALTER TABLE project_todos ENABLE ROW LEVEL SECURITY;

-- Policy for viewing todos (users can see todos they're assigned to or todos in projects they're members of)
CREATE POLICY "Users can view todos they're assigned to or todos in their projects"
ON project_todos FOR SELECT
USING (
  assigned_to = auth.uid() OR
  project_id IN (
    SELECT project_id FROM project_members
    WHERE user_id = auth.uid()
  )
);

-- Policy for updating assigned_to (only project editors/admins can assign tasks)
CREATE POLICY "Project editors can assign tasks"
ON project_todos FOR UPDATE
USING (
  project_id IN (
    SELECT project_id FROM project_members
    WHERE user_id = auth.uid()
    AND role IN ('editor', 'admin')
  )
)
WITH CHECK (
  project_id IN (
    SELECT project_id FROM project_members
    WHERE user_id = auth.uid()
    AND role IN ('editor', 'admin')
  )
);

-- Policy for users to claim unassigned tasks
CREATE POLICY "Users can claim unassigned tasks"
ON project_todos FOR UPDATE
USING (
  assigned_to IS NULL AND
  project_id IN (
    SELECT project_id FROM project_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  assigned_to = auth.uid() AND
  project_id IN (
    SELECT project_id FROM project_members
    WHERE user_id = auth.uid()
  )
); 