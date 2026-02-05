/*
  # Add panelist names to jobs table

  1. Changes
    - Add `panelist_names` column to `jobs` table
      - Type: text (nullable)
      - Purpose: Store comma-separated list of default panelists for the position
  
  2. Notes
    - This field stores suggested panelists that can be assigned to interview rounds
    - When interview rounds are scheduled, panelists can be assigned from this list
*/

-- Add panelist_names column to jobs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'panelist_names'
  ) THEN
    ALTER TABLE jobs ADD COLUMN panelist_names text;
  END IF;
END $$;
