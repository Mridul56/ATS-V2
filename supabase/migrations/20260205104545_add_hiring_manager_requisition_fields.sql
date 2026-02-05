/*
  # Add Hiring Manager Requisition Fields

  ## Overview
  This migration adds fields required for hiring managers to create detailed requisitions:
  - Role type tracking (new role vs backfill)
  - Replacement employee information
  - Detailed role requirements
  - Priority levels
  - Timeline information

  ## Changes

  ### 1. New Enums
  - role_type enum: new_role, backfill
  - priority_level enum: high, medium, low

  ### 2. Jobs Table Additions
  - role_type: Track if position is new or a backfill
  - replacement_employee: Name of employee being replaced (for backfills)
  - top_skills: Key skills required for the role
  - tools_required: Tools and technologies needed
  - role_objective: Main objective/purpose of the role
  - target_joining_timeline: Expected joining timeline
  - priority: Urgency level of the requisition

  ## Security
  - No RLS changes needed
  - Existing policies apply to new fields
*/

-- Create enums for role type and priority
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
    CREATE TYPE role_type AS ENUM ('new_role', 'backfill');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
    CREATE TYPE priority_level AS ENUM ('high', 'medium', 'low');
  END IF;
END $$;

-- Add new fields to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS role_type role_type DEFAULT 'new_role';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS replacement_employee text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS top_skills text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tools_required text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS role_objective text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS target_joining_timeline text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS priority priority_level DEFAULT 'medium';

-- Create index for priority filtering
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority);

-- Create index for role_type
CREATE INDEX IF NOT EXISTS idx_jobs_role_type ON jobs(role_type);
