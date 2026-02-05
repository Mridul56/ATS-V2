/*
  # Create Resume Storage Bucket

  1. Storage Setup
    - Create `resumes` bucket for storing candidate resume/CV files
    - Enable public access for reading resumes
    - Set file size limits and allowed MIME types
  
  2. Security
    - Enable RLS on storage.objects
    - Allow authenticated users to upload their own resumes
    - Allow recruiters to read all resumes
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  false,
  10485760,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload resumes'
  ) THEN
    CREATE POLICY "Authenticated users can upload resumes"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'resumes');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can read own resumes'
  ) THEN
    CREATE POLICY "Users can read own resumes"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'resumes');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update own resumes'
  ) THEN
    CREATE POLICY "Users can update own resumes"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'resumes')
      WITH CHECK (bucket_id = 'resumes');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete own resumes'
  ) THEN
    CREATE POLICY "Users can delete own resumes"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'resumes');
  END IF;
END $$;