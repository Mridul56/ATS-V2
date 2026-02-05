/*
  # Add Interview Rounds and Panelist Management

  ## Overview
  This migration adds support for configurable interview rounds and panelist management
  to enable the complete hiring workflow from recruiter to hiring manager.

  ## Changes

  ### 1. Update Jobs Table
  - Add number_of_interview_rounds: Number of interview rounds defined by hiring manager

  ### 2. New Interview Rounds Table
  - interview_rounds: Track each round of interviews for a candidate
    - id: Unique identifier
    - application_id: Reference to job_applications
    - round_number: Which round (1, 2, 3, etc.)
    - status: scheduled, completed, cancelled
    - scheduled_at: When the interview is scheduled
    - feedback: Interview feedback
    - result: passed, failed, pending
    - created_by: Who created this round
    - created_at: Timestamp

  ### 3. Interview Round Panelists Table
  - interview_round_panelists: Track panelists for each interview round
    - id: Unique identifier
    - interview_round_id: Reference to interview_rounds
    - panelist_name: Name of the panelist
    - panelist_email: Email of the panelist
    - panelist_role: Role/designation of panelist
    - feedback: Panelist's feedback
    - rating: Rating given by panelist
    - created_at: Timestamp

  ### 4. Security
  - Enable RLS on all new tables
  - Add appropriate policies for recruiters, hiring managers, and admins
*/

-- Add interview rounds column to jobs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'number_of_interview_rounds'
  ) THEN
    ALTER TABLE jobs ADD COLUMN number_of_interview_rounds integer DEFAULT 3;
  END IF;
END $$;

-- Create interview_rounds table
CREATE TABLE IF NOT EXISTS interview_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  round_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  scheduled_at timestamptz,
  completed_at timestamptz,
  feedback text,
  result text CHECK (result IN ('passed', 'failed', 'pending')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(application_id, round_number)
);

-- Create interview_round_panelists table
CREATE TABLE IF NOT EXISTS interview_round_panelists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_round_id uuid NOT NULL REFERENCES interview_rounds(id) ON DELETE CASCADE,
  panelist_name text NOT NULL,
  panelist_email text NOT NULL,
  panelist_role text,
  feedback text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  recommendation text CHECK (recommendation IN ('strong_yes', 'yes', 'maybe', 'no', 'strong_no')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE interview_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_round_panelists ENABLE ROW LEVEL SECURITY;

-- Policies for interview_rounds

-- Recruiters and admins can view all interview rounds
CREATE POLICY "Recruiters and admins can view all interview rounds"
  ON interview_rounds FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('recruiter', 'admin')
    )
  );

-- Hiring managers can view interview rounds for their jobs
CREATE POLICY "Hiring managers can view interview rounds for their jobs"
  ON interview_rounds FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      WHERE ja.id = interview_rounds.application_id
      AND j.hiring_manager_id = auth.uid()
    )
  );

-- Recruiters and admins can create interview rounds
CREATE POLICY "Recruiters and admins can create interview rounds"
  ON interview_rounds FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('recruiter', 'admin')
    )
  );

-- Hiring managers can create interview rounds for their jobs
CREATE POLICY "Hiring managers can create interview rounds for their jobs"
  ON interview_rounds FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      WHERE ja.id = interview_rounds.application_id
      AND j.hiring_manager_id = auth.uid()
    )
  );

-- Recruiters, admins, and hiring managers can update interview rounds
CREATE POLICY "Authorized users can update interview rounds"
  ON interview_rounds FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('recruiter', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      WHERE ja.id = interview_rounds.application_id
      AND j.hiring_manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('recruiter', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      WHERE ja.id = interview_rounds.application_id
      AND j.hiring_manager_id = auth.uid()
    )
  );

-- Policies for interview_round_panelists

-- Recruiters, admins, and hiring managers can view panelists
CREATE POLICY "Authorized users can view panelists"
  ON interview_round_panelists FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('recruiter', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM interview_rounds ir
      JOIN job_applications ja ON ir.application_id = ja.id
      JOIN jobs j ON ja.job_id = j.id
      WHERE ir.id = interview_round_panelists.interview_round_id
      AND j.hiring_manager_id = auth.uid()
    )
  );

-- Recruiters, admins, and hiring managers can create panelists
CREATE POLICY "Authorized users can create panelists"
  ON interview_round_panelists FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('recruiter', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM interview_rounds ir
      JOIN job_applications ja ON ir.application_id = ja.id
      JOIN jobs j ON ja.job_id = j.id
      WHERE ir.id = interview_round_panelists.interview_round_id
      AND j.hiring_manager_id = auth.uid()
    )
  );

-- Recruiters, admins, and hiring managers can update panelists
CREATE POLICY "Authorized users can update panelists"
  ON interview_round_panelists FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('recruiter', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM interview_rounds ir
      JOIN job_applications ja ON ir.application_id = ja.id
      JOIN jobs j ON ja.job_id = j.id
      WHERE ir.id = interview_round_panelists.interview_round_id
      AND j.hiring_manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('recruiter', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM interview_rounds ir
      JOIN job_applications ja ON ir.application_id = ja.id
      JOIN jobs j ON ja.job_id = j.id
      WHERE ir.id = interview_round_panelists.interview_round_id
      AND j.hiring_manager_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_interview_rounds_application_id ON interview_rounds(application_id);
CREATE INDEX IF NOT EXISTS idx_interview_rounds_status ON interview_rounds(status);
CREATE INDEX IF NOT EXISTS idx_interview_round_panelists_round_id ON interview_round_panelists(interview_round_id);

-- Add trigger for interview_rounds updated_at
DROP TRIGGER IF EXISTS update_interview_rounds_updated_at ON interview_rounds;
CREATE TRIGGER update_interview_rounds_updated_at
  BEFORE UPDATE ON interview_rounds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for interview_round_panelists updated_at
DROP TRIGGER IF EXISTS update_interview_round_panelists_updated_at ON interview_round_panelists;
CREATE TRIGGER update_interview_round_panelists_updated_at
  BEFORE UPDATE ON interview_round_panelists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
