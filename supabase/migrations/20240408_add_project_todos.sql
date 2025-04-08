-- Create project_todos table
CREATE TABLE project_todos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE project_todos ENABLE ROW LEVEL SECURITY;

-- Policy to allow project owners and collaborators to view todos
CREATE POLICY "View project todos" ON project_todos
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            LEFT JOIN project_collaborators pc ON pc.project_id = p.id
            WHERE p.id = project_todos.project_id
            AND (
                p.owner_id = auth.uid() OR
                (pc.user_id = auth.uid() AND pc.role IN ('viewer', 'editor', 'admin'))
            )
        )
    );

-- Policy to allow project owners and editor/admin collaborators to insert todos
CREATE POLICY "Insert project todos" ON project_todos
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            LEFT JOIN project_collaborators pc ON pc.project_id = p.id
            WHERE p.id = project_id
            AND (
                p.owner_id = auth.uid() OR
                (pc.user_id = auth.uid() AND pc.role IN ('editor', 'admin'))
            )
        )
    );

-- Policy to allow project owners and editor/admin collaborators to update todos
CREATE POLICY "Update project todos" ON project_todos
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            LEFT JOIN project_collaborators pc ON pc.project_id = p.id
            WHERE p.id = project_todos.project_id
            AND (
                p.owner_id = auth.uid() OR
                (pc.user_id = auth.uid() AND pc.role IN ('editor', 'admin'))
            )
        )
    );

-- Policy to allow project owners and editor/admin collaborators to delete todos
CREATE POLICY "Delete project todos" ON project_todos
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            LEFT JOIN project_collaborators pc ON pc.project_id = p.id
            WHERE p.id = project_todos.project_id
            AND (
                p.owner_id = auth.uid() OR
                (pc.user_id = auth.uid() AND pc.role IN ('editor', 'admin'))
            )
        )
    );

-- Add indexes
CREATE INDEX project_todos_project_id_idx ON project_todos(project_id);
CREATE INDEX project_todos_completed_idx ON project_todos(completed); 