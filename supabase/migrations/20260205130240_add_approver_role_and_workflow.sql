/*
  # Add Approver Role and Enhanced Workflow

  1. Changes
    - Add 'approver' to user_role enum
    - Add approver_type and approver_email columns to approvals table
    - Add notification_sent column to track email notifications
  
  2. New Fields
    - approver_type: Type of approver (CHRO or CFO)
    - approver_email: Email address for notification
    - notification_sent: Track if notification was sent
  
  3. Security
    - Maintains existing RLS policies
    - Adds indexes for better performance
*/

-- Add 'approver' to the user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'approver';

-- Add approver type and email to approvals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'approvals' AND column_name = 'approver_type'
  ) THEN
    ALTER TABLE approvals ADD COLUMN approver_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'approvals' AND column_name = 'approver_email'
  ) THEN
    ALTER TABLE approvals ADD COLUMN approver_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'approvals' AND column_name = 'notification_sent'
  ) THEN
    ALTER TABLE approvals ADD COLUMN notification_sent boolean DEFAULT false;
  END IF;
END $$;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_approvals_approver_email ON approvals(approver_email);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_approver_type ON approvals(approver_type);
