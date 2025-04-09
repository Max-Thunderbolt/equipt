-- Drop the admin update policy in case it was partially applied
DROP POLICY IF EXISTS "Allow admin update" ON public.project_todos;
-- RLS Policy 1 (Attempt 2): Allow project editors/admins to update any field
CREATE POLICY "Allow admin update" ON public.project_todos
FOR UPDATE
USING (
    -- Row is eligible for update if the user is an editor/admin of the project (OLD state)
    -- Using direct subquery instead of helper function for OLD context
    EXISTS (
      SELECT 1
      FROM projects p
      LEFT JOIN project_collaborators pc ON p.id = pc.project_id
      WHERE p.id = OLD.project_id -- Explicitly check OLD project
      AND (
        p.owner_id = auth.uid() OR
        (pc.user_id = auth.uid() AND pc.role IN ('editor', 'admin'))
      )
    )
)
WITH CHECK (
    -- The update is valid if the user is still an editor/admin of the target project (NEW state)
    -- Using helper function for NEW context seems okay
    is_project_editor_or_admin(NEW.project_id, auth.uid())
);
