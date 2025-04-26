-- Create project_invites table
CREATE TABLE IF NOT EXISTS public.project_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invited_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, invited_user_id)
);

-- Create indexes for faster lookups
CREATE INDEX project_invites_project_id_idx ON public.project_invites(project_id);
CREATE INDEX project_invites_invited_user_id_idx ON public.project_invites(invited_user_id);
CREATE INDEX project_invites_invited_by_idx ON public.project_invites(invited_by);

-- Enable Row Level Security
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Project owners and admins can view project invites"
    ON public.project_invites FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_invites.project_id
            AND p.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.project_collaborators pc
            WHERE pc.project_id = project_invites.project_id
            AND pc.user_id = auth.uid()
            AND pc.role = 'admin'
        )
    );

CREATE POLICY "Invited users can view their own invites"
    ON public.project_invites FOR SELECT
    USING (invited_user_id = auth.uid());

CREATE POLICY "Project owners and admins can create invites"
    ON public.project_invites FOR INSERT
    WITH CHECK (
        auth.uid() = invited_by
        AND (
            EXISTS (
                SELECT 1 FROM public.projects p
                WHERE p.id = project_invites.project_id
                AND p.owner_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.project_collaborators pc
                WHERE pc.project_id = project_invites.project_id
                AND pc.user_id = auth.uid()
                AND pc.role = 'admin'
            )
        )
    );

CREATE POLICY "Invited users can update their own invites"
    ON public.project_invites FOR UPDATE
    USING (invited_user_id = auth.uid())
    WITH CHECK (
        invited_user_id = auth.uid()
        AND (
            status = 'accepted'
            OR status = 'declined'
        )
    );

-- Create updated_at trigger
CREATE TRIGGER handle_project_invites_updated_at
    BEFORE UPDATE ON public.project_invites
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 