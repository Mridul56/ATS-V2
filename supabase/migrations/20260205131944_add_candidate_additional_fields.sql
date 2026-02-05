/*
  # Add Additional Candidate Fields

  1. New Columns
    - current_company: Current employer of the candidate
    - linkedin_url: LinkedIn profile URL
    - years_of_experience: Calculated years of experience

  2. Changes
    - Add new fields to candidates table to support auto-parsing from resume
    - These fields will be populated by the resume parser edge function
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'current_company'
  ) THEN
    ALTER TABLE candidates ADD COLUMN current_company text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'linkedin_url'
  ) THEN
    ALTER TABLE candidates ADD COLUMN linkedin_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'years_of_experience'
  ) THEN
    ALTER TABLE candidates ADD COLUMN years_of_experience numeric(4,1);
  END IF;
END $$;

-- Add indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_candidates_current_company ON candidates(current_company);
CREATE INDEX IF NOT EXISTS idx_candidates_years_of_experience ON candidates(years_of_experience);
