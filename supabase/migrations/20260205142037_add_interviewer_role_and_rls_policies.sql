/*
  # Add Interviewer Role and RLS Policies

  1. Changes
    - Add RLS policies to allow interviewers to view their scheduled interviews
    - Interviewers can view and update interview rounds where they are assigned
    - Interviewers can view candidate and job details for their interviews
  
  2. Security
    - Interviewers can only view/update interviews where their email matches panelist_email
    - Interviewers can view candidate information only for their assigned interviews
    - Interviewers can submit feedback and ratings for their interviews
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Interviewers can view their assigned interview rounds" ON interview_rounds;
DROP POLICY IF EXISTS "Interviewers can update their assigned interview rounds" ON interview_rounds;
DROP POLICY IF EXISTS "Interviewers can view candidates for their interviews" ON candidates;
DROP POLICY IF EXISTS "Interviewers can view job applications for their interviews" ON job_applications;
DROP POLICY IF EXISTS "Interviewers can view jobs for their interviews" ON jobs;
DROP POLICY IF EXISTS "Interviewers can view panelist records" ON interview_round_panelists;

-- Add RLS policies for interviewers to view their assigned interview rounds
CREATE POLICY "Interviewers can view their assigned interview rounds"
  ON interview_rounds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interview_round_panelists
      WHERE interview_round_panelists.interview_round_id = interview_rounds.id
      AND interview_round_panelists.panelist_email = (
        SELECT email FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Allow interviewers to update their assigned interview rounds (feedback, rating, result)
CREATE POLICY "Interviewers can update their assigned interview rounds"
  ON interview_rounds
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interview_round_panelists
      WHERE interview_round_panelists.interview_round_id = interview_rounds.id
      AND interview_round_panelists.panelist_email = (
        SELECT email FROM profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interview_round_panelists
      WHERE interview_round_panelists.interview_round_id = interview_rounds.id
      AND interview_round_panelists.panelist_email = (
        SELECT email FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Allow interviewers to view candidate details for their interviews
CREATE POLICY "Interviewers can view candidates for their interviews"
  ON candidates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interview_rounds ir
      JOIN interview_round_panelists irp ON ir.id = irp.interview_round_id
      JOIN job_applications ja ON ir.application_id = ja.id
      WHERE ja.candidate_id = candidates.id
      AND irp.panelist_email = (
        SELECT email FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Allow interviewers to view job applications for their interviews
CREATE POLICY "Interviewers can view job applications for their interviews"
  ON job_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interview_rounds ir
      JOIN interview_round_panelists irp ON ir.id = irp.interview_round_id
      WHERE ir.application_id = job_applications.id
      AND irp.panelist_email = (
        SELECT email FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Allow interviewers to view jobs for their interviews
CREATE POLICY "Interviewers can view jobs for their interviews"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interview_rounds ir
      JOIN interview_round_panelists irp ON ir.id = irp.interview_round_id
      JOIN job_applications ja ON ir.application_id = ja.id
      WHERE ja.job_id = jobs.id
      AND irp.panelist_email = (
        SELECT email FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Allow interviewers to view panelist records
CREATE POLICY "Interviewers can view panelist records"
  ON interview_round_panelists
  FOR SELECT
  TO authenticated
  USING (
    panelist_email = (
      SELECT email FROM profiles WHERE id = auth.uid()
    )
  );
