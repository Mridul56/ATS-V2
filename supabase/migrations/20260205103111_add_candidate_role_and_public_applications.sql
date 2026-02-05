/*
  # Add Candidate Role and Public Job Applications

  ## Overview
  This migration adds support for candidates to:
  - Register as candidates via the public career site
  - View published jobs without authentication
  - Apply to jobs directly through the career site
  - View their own application status

  ## Changes

  ### 1. Role System
  - Add 'candidate' to user_role enum
  - Update profile defaults to support candidate role

  ### 2. Jobs Table Enhancements
  - Add is_published boolean field for public visibility
  - Published jobs can be viewed by anyone (even unauthenticated)

  ### 3. Candidates Table Updates
  - Allow candidates to create their own profile
  - Link candidates to auth users via user_id field
  - Support both recruiter-created and self-registered candidates

  ### 4. Public Access Policies
  - Anonymous users can view published jobs
  - Candidates can create their own candidate record
  - Candidates can submit applications for themselves
  - Candidates can view only their own applications

  ## Security
  - Maintain strict RLS for internal recruiting data
  - Allow public read access only to published jobs
  - Ensure candidates only see their own data
  - Prevent unauthorized access to other candidates' information
*/

-- Add 'candidate' to user_role enum
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    WHERE t.typname = 'user_role' AND e.enumlabel = 'candidate'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'candidate';
  END IF;
END $$;

-- Add is_published column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;

-- Add user_id to candidates table (link to auth.users for self-registered candidates)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add cover_letter to job_applications
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS cover_letter text;

-- Create index for published jobs
CREATE INDEX IF NOT EXISTS idx_jobs_published ON jobs(is_published) WHERE is_published = true;

-- Create index for candidate user_id
CREATE INDEX IF NOT EXISTS idx_candidates_user_id ON candidates(user_id);

-- Drop existing restrictive policies for candidates table
DROP POLICY IF EXISTS "Recruiters and admins can create candidates" ON candidates;
DROP POLICY IF EXISTS "Authenticated users can view candidates" ON candidates;

-- New RLS Policies for Public Job Viewing
DROP POLICY IF EXISTS "Authenticated users can view jobs" ON jobs;

CREATE POLICY "Anyone can view published jobs"
  ON jobs FOR SELECT
  USING (is_published = true OR auth.uid() IS NOT NULL);

-- New RLS Policies for Candidates Table
CREATE POLICY "Authenticated users can view candidates"
  ON candidates FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter', 'hiring_manager')
    )
  );

CREATE POLICY "Authenticated users can create candidates"
  ON candidates FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter', 'hiring_manager')
    )
  );

CREATE POLICY "Candidates can update own record"
  ON candidates FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- New RLS Policies for Job Applications
DROP POLICY IF EXISTS "Users can view job applications" ON job_applications;
DROP POLICY IF EXISTS "Recruiters can manage applications" ON job_applications;

CREATE POLICY "Users can view relevant applications"
  ON job_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM candidates
      WHERE candidates.id = job_applications.candidate_id
      AND candidates.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter', 'hiring_manager')
    )
  );

CREATE POLICY "Users can create applications"
  ON job_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM candidates
      WHERE candidates.id = job_applications.candidate_id
      AND candidates.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter', 'hiring_manager')
    )
  );

CREATE POLICY "Recruiters can update applications"
  ON job_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter', 'hiring_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter', 'hiring_manager')
    )
  );

CREATE POLICY "Recruiters can delete applications"
  ON job_applications FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter', 'hiring_manager')
    )
  );

-- Update profile policies to allow candidate self-registration
DROP POLICY IF EXISTS "Users can create own profile on signup" ON profiles;
DROP POLICY IF EXISTS "Admins can insert any profile" ON profiles;

CREATE POLICY "Users can create own profile on signup"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can insert any profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to auto-publish approved jobs
CREATE OR REPLACE FUNCTION auto_publish_approved_jobs()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.is_published := true;
  END IF;
  IF NEW.status = 'closed' THEN
    NEW.is_published := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-publishing
DROP TRIGGER IF EXISTS trigger_auto_publish_jobs ON jobs;
CREATE TRIGGER trigger_auto_publish_jobs
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION auto_publish_approved_jobs();

-- Update existing approved jobs to be published
UPDATE jobs SET is_published = true WHERE status IN ('approved', 'published');
