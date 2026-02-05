/*
  # Add Candidate Application Fields and Multi-Stage Interview Support

  ## Overview
  This migration adds comprehensive fields for candidate applications and multi-stage interview tracking.

  ## Changes

  ### 1. New Columns in `candidates` table
    - `current_ctc` (numeric) - Current Cost to Company
    - `expected_ctc` (numeric) - Expected Cost to Company
    - `notice_period_days` (integer) - Notice period in days
    - `preferred_location` (text) - Candidate's preferred work location

  ### 2. New Columns in `job_applications` table
    - `viewed_at` (timestamptz) - When recruiter first viewed the application
    - `viewed_by` (uuid) - Which recruiter viewed the application
    - `status_history` (jsonb) - Track all status changes with timestamps
    - `current_interview_round` (integer) - Current round number (1, 2, 3, etc.)

  ### 3. New Table: `interview_schedules`
    This table manages multiple interview rounds with different interviewers
    - `id` (uuid, primary key)
    - `job_application_id` (uuid) - Links to job_applications
    - `candidate_id` (uuid) - Links to candidates
    - `job_id` (uuid) - Links to jobs
    - `round_number` (integer) - Interview round (1, 2, 3, etc.)
    - `interviewer_id` (uuid) - Which user is interviewing
    - `scheduled_at` (timestamptz) - Interview date/time
    - `duration_minutes` (integer) - Interview duration
    - `status` (text) - scheduled, completed, cancelled, no_show
    - `feedback` (text) - Interview feedback
    - `rating` (integer) - Rating 1-5
    - `result` (text) - passed, rejected, on_hold
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 4. Security
    - Enable RLS on `interview_schedules`
    - Add policies for authenticated users
    - Add policies for candidates to view their own schedules
    - Add policy for job_applications viewed tracking
*/

-- Add new columns to candidates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'current_ctc'
  ) THEN
    ALTER TABLE candidates ADD COLUMN current_ctc NUMERIC(12,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'expected_ctc'
  ) THEN
    ALTER TABLE candidates ADD COLUMN expected_ctc NUMERIC(12,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'notice_period_days'
  ) THEN
    ALTER TABLE candidates ADD COLUMN notice_period_days INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'preferred_location'
  ) THEN
    ALTER TABLE candidates ADD COLUMN preferred_location TEXT;
  END IF;
END $$;

-- Add new columns to job_applications table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_applications' AND column_name = 'viewed_at'
  ) THEN
    ALTER TABLE job_applications ADD COLUMN viewed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_applications' AND column_name = 'viewed_by'
  ) THEN
    ALTER TABLE job_applications ADD COLUMN viewed_by UUID REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_applications' AND column_name = 'status_history'
  ) THEN
    ALTER TABLE job_applications ADD COLUMN status_history JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_applications' AND column_name = 'current_interview_round'
  ) THEN
    ALTER TABLE job_applications ADD COLUMN current_interview_round INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create interview_schedules table
CREATE TABLE IF NOT EXISTS interview_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  interviewer_id UUID REFERENCES profiles(id),
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  feedback TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  result TEXT CHECK (result IN ('passed', 'rejected', 'on_hold')),
  meeting_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on interview_schedules
ALTER TABLE interview_schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all interview schedules
CREATE POLICY "Authenticated users can view interview schedules"
  ON interview_schedules FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Candidates can view their own interview schedules
CREATE POLICY "Candidates can view own interview schedules"
  ON interview_schedules FOR SELECT
  TO authenticated
  USING (
    candidate_id IN (
      SELECT id FROM candidates WHERE user_id = auth.uid()
    )
  );

-- Policy: Recruiters and admins can insert interview schedules
CREATE POLICY "Recruiters can create interview schedules"
  ON interview_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('recruiter', 'admin')
    )
  );

-- Policy: Recruiters and admins can update interview schedules
CREATE POLICY "Recruiters can update interview schedules"
  ON interview_schedules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('recruiter', 'admin')
    )
  );

-- Policy: Interviewers can update their assigned interview schedules
CREATE POLICY "Interviewers can update assigned schedules"
  ON interview_schedules FOR UPDATE
  TO authenticated
  USING (interviewer_id = auth.uid());

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_interview_schedules_candidate ON interview_schedules(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interview_schedules_job_app ON interview_schedules(job_application_id);
CREATE INDEX IF NOT EXISTS idx_interview_schedules_interviewer ON interview_schedules(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interview_schedules_scheduled_at ON interview_schedules(scheduled_at);

-- Update job_applications RLS to allow candidates to view their applications
CREATE POLICY "Candidates can view own applications"
  ON job_applications FOR SELECT
  TO authenticated
  USING (
    candidate_id IN (
      SELECT id FROM candidates WHERE user_id = auth.uid()
    )
  );

-- Function to update viewed_at when recruiter views application
CREATE OR REPLACE FUNCTION mark_application_viewed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.viewed_at IS NULL AND OLD.viewed_at IS NULL THEN
    NEW.viewed_at := now();
    NEW.viewed_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for marking applications as viewed
DROP TRIGGER IF EXISTS trigger_mark_application_viewed ON job_applications;
CREATE TRIGGER trigger_mark_application_viewed
  BEFORE UPDATE ON job_applications
  FOR EACH ROW
  EXECUTE FUNCTION mark_application_viewed();