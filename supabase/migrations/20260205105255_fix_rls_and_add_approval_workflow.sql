/*
  # Fix RLS and Add Approval Workflow

  ## Overview
  This migration fixes RLS policies to allow hiring managers to create requisitions
  and implements a complete approval workflow from Hiring Manager → Finance → Recruiter.

  ## Changes

  ### 1. Fix Jobs Table RLS Policies
  - Allow hiring managers to INSERT jobs with draft/pending_approval status
  - Allow hiring managers to view their own requisitions
  - Allow finance role to view and update pending requisitions
  - Allow recruiters to view approved requisitions

  ### 2. New Tables
  - approvals: Track approval workflow for requisitions
    - id: Unique identifier
    - job_id: Reference to jobs table
    - approver_id: Reference to profiles (finance user)
    - status: pending, approved, rejected
    - comments: Optional approval comments
    - approved_at: Timestamp of approval/rejection
    - created_at: When approval request was created

  ### 3. Security
  - Enable RLS on approvals table
  - Policies for viewing and updating approvals based on role
*/

-- Drop existing job policies to recreate them
DROP POLICY IF EXISTS "Users can view jobs" ON jobs;
DROP POLICY IF EXISTS "Users can create jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update jobs" ON jobs;

-- Allow hiring managers to insert jobs with draft status
CREATE POLICY "Hiring managers can create requisitions"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'hiring_manager'
    )
  );

-- Allow hiring managers to view their own requisitions
CREATE POLICY "Hiring managers can view own requisitions"
  ON jobs FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'hiring_manager'
    )
  );

-- Allow hiring managers to update their own draft requisitions
CREATE POLICY "Hiring managers can update own draft requisitions"
  ON jobs FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() AND
    status = 'draft' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'hiring_manager'
    )
  )
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'hiring_manager'
    )
  );

-- Allow finance to view pending requisitions
CREATE POLICY "Finance can view pending requisitions"
  ON jobs FOR SELECT
  TO authenticated
  USING (
    status = 'pending_approval' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'finance'
    )
  );

-- Allow finance to update pending requisitions
CREATE POLICY "Finance can update pending requisitions"
  ON jobs FOR UPDATE
  TO authenticated
  USING (
    status = 'pending_approval' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'finance'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'finance'
    )
  );

-- Allow recruiters and admins to view all jobs
CREATE POLICY "Recruiters and admins can view all jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('recruiter', 'admin')
    )
  );

-- Allow recruiters and admins to update jobs
CREATE POLICY "Recruiters and admins can update jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('recruiter', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('recruiter', 'admin')
    )
  );

-- Allow admins and recruiters to create jobs
CREATE POLICY "Admins and recruiters can create jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('recruiter', 'admin')
    )
  );

-- Create approvals table
CREATE TABLE IF NOT EXISTS approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  approver_id uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comments text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on approvals
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- Allow finance to view all approval requests
CREATE POLICY "Finance can view approval requests"
  ON approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'finance'
    )
  );

-- Allow finance to update approval requests
CREATE POLICY "Finance can update approval requests"
  ON approvals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'finance'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'finance'
    )
  );

-- Allow hiring managers to view their approval requests
CREATE POLICY "Hiring managers can view own approval requests"
  ON approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = approvals.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

-- Allow system to create approval requests
CREATE POLICY "Authenticated users can create approvals"
  ON approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

-- Allow recruiters and admins to view all approvals
CREATE POLICY "Recruiters and admins can view all approvals"
  ON approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('recruiter', 'admin')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_approvals_job_id ON approvals(job_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_approver_id ON approvals(approver_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for approvals updated_at
DROP TRIGGER IF EXISTS update_approvals_updated_at ON approvals;
CREATE TRIGGER update_approvals_updated_at
  BEFORE UPDATE ON approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
