/*
  # Fix Avatar Storage Policies

  1. Storage Bucket Setup
    - Create avatars bucket if it doesn't exist
    - Set up proper RLS policies for avatar uploads

  2. Security Policies
    - Allow authenticated users to upload their own avatars
    - Allow public read access to avatars
    - Allow users to update/delete their own avatars
*/

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to upload avatars
CREATE POLICY "Allow authenticated users to upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy to allow public read access to avatars
CREATE POLICY "Allow public access to avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Policy to allow users to update their own avatars
CREATE POLICY "Allow users to update own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy to allow users to delete their own avatars
CREATE POLICY "Allow users to delete own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);