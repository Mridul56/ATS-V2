/*
  # Add Interviewers List to Jobs Table

  1. Changes
    - Add `interviewers` JSONB column to `jobs` table to store list of interviewers
    - Each interviewer object contains: name, email, role/designation
  
  2. Notes
    - Using JSONB for flexibility in storing interviewer details
    - This list will be used as a dropdown when scheduling interviews
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'interviewers'
  ) THEN
    ALTER TABLE jobs ADD COLUMN interviewers JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;
