-- Drop existing pins table if it exists
DROP TABLE IF EXISTS public.project_pins;

-- Create project_pins table
CREATE TABLE IF NOT EXISTS public.project_pins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('note', 'file', 'link')),
    title TEXT NOT NULL,
    content TEXT,
    file_data JSONB,
    position_x FLOAT DEFAULT 0,
    position_y FLOAT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster lookups
CREATE INDEX project_pins_project_id_idx ON public.project_pins(project_id);
CREATE INDEX project_pins_user_id_idx ON public.project_pins(user_id);

-- Enable Row Level Security
ALTER TABLE public.project_pins ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Project members can view project pins"
    ON public.project_pins FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_collaborators pc
            WHERE pc.project_id = project_pins.project_id
            AND pc.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_pins.project_id
            AND (p.owner_id = auth.uid() OR p.is_public = true)
        )
    );

CREATE POLICY "Project members can insert project pins"
    ON public.project_pins FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND (
            EXISTS (
                SELECT 1 FROM public.project_collaborators pc
                WHERE pc.project_id = project_pins.project_id
                AND pc.user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.projects p
                WHERE p.id = project_pins.project_id
                AND p.owner_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update their own project pins"
    ON public.project_pins FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own project pins"
    ON public.project_pins FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER handle_project_pins_updated_at
    BEFORE UPDATE ON public.project_pins
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 