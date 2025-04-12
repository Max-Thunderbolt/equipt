-- Create pins table
CREATE TABLE IF NOT EXISTS public.pins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('note', 'image', 'link')),
    content TEXT NOT NULL,
    url TEXT,
    position_x FLOAT NOT NULL,
    position_y FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own pins"
    ON public.pins FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pins"
    ON public.pins FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pins"
    ON public.pins FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pins"
    ON public.pins FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER handle_pins_updated_at
    BEFORE UPDATE ON public.pins
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 