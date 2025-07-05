/*
  # Fix Avatar Storage Setup

  1. Storage Bucket Setup
    - Create avatars bucket if it doesn't exist
    - Note: Storage policies must be created through Supabase dashboard

  2. Helper Functions
    - Functions to manage avatar URLs safely
    - Proper security definer functions for avatar management
*/

-- Create avatars bucket if it doesn't exist
-- Note: This may need to be done through the Supabase dashboard if it fails
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'avatars', 
    'avatars', 
    true, 
    2097152, -- 2MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  );
EXCEPTION WHEN unique_violation THEN
  -- Bucket already exists, update it
  UPDATE storage.buckets 
  SET 
    public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  WHERE id = 'avatars';
EXCEPTION WHEN OTHERS THEN
  -- If we can't create the bucket here, it needs to be done through the dashboard
  RAISE NOTICE 'Could not create avatars bucket. Please create it manually in the Supabase dashboard.';
END $$;

-- Create a function to help with avatar management
CREATE OR REPLACE FUNCTION get_avatar_url(user_uuid uuid)
RETURNS text AS $$
DECLARE
  avatar_url text;
BEGIN
  SELECT p.avatar_url INTO avatar_url
  FROM profiles p
  WHERE p.id = user_uuid;
  
  RETURN avatar_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_avatar_url(uuid) TO authenticated;

-- Create a function to update avatar URL safely
CREATE OR REPLACE FUNCTION update_avatar_url(new_avatar_url text)
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET avatar_url = new_avatar_url,
      updated_at = now()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_avatar_url(text) TO authenticated;

-- Create a function to delete avatar URL
CREATE OR REPLACE FUNCTION delete_avatar_url()
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET avatar_url = null,
      updated_at = now()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_avatar_url() TO authenticated;

/*
  IMPORTANT: Storage policies need to be created manually in the Supabase dashboard.
  
  Go to Storage > avatars bucket and create these policies:
  
  1. Policy Name: "Allow authenticated users to upload avatars"
     Operation: INSERT
     Target roles: authenticated
     Policy definition: bucket_id = 'avatars'
  
  2. Policy Name: "Allow public access to avatars" 
     Operation: SELECT
     Target roles: public
     Policy definition: bucket_id = 'avatars'
  
  3. Policy Name: "Allow users to update own avatars"
     Operation: UPDATE
     Target roles: authenticated  
     Policy definition: bucket_id = 'avatars'
  
  4. Policy Name: "Allow users to delete own avatars"
     Operation: DELETE
     Target roles: authenticated
     Policy definition: bucket_id = 'avatars'
*/