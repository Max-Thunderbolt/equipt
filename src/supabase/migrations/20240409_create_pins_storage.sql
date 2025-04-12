-- Create a new storage bucket for pin images
INSERT INTO storage.buckets (id, name, public)
VALUES ('pins', 'pins', true);

-- Set up storage policies
CREATE POLICY "Anyone can view pin images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'pins');

CREATE POLICY "Authenticated users can upload pin images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'pins'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their own pin images"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'pins'
        AND auth.uid() = owner
    );

CREATE POLICY "Users can delete their own pin images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'pins'
        AND auth.uid() = owner
    ); 