/*
  # Applicant Tracking System - Complete Database Schema

  ## Overview
  This migration creates a complete ATS database with support for:
  - Job requisitions with approval workflows
  - Candidate management with pipeline stages
  - Interview scheduling and feedback
  - Offer management with approval chains
  - User roles and permissions
  - Activity logging and audit trails
  - Email automation
  - Analytics and reporting

  ## New Tables

  ### 1. profiles
  Extended user profile linked to auth.users
  - `id` (uuid, FK to auth.users)
  - `email` (text)
  - `full_name` (text)
  - `role` (enum: admin, recruiter, hiring_manager, interviewer, finance)
  - `avatar_url` (text)
  - `department` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. jobs
  Job requisitions and postings
  - `id` (uuid)
  - `title` (text)
  - `requisition_id` (text, auto-generated)
  - `department` (text)
  - `location` (text)
  - `job_type` (enum: full_time, part_time, contract, internship)
  - `description` (text)
  - `requirements` (text)
  - `salary_min` (numeric)
  - `salary_max` (numeric)
  - `status` (enum: draft, pending_approval, approved, published, closed)
  - `hiring_manager_id` (uuid, FK to profiles)
  - `recruiter_id` (uuid, FK to profiles)
  - `created_by` (uuid, FK to profiles)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. job_approvals
  Approval workflow for job requisitions
  - `id` (uuid)
  - `job_id` (uuid, FK to jobs)
  - `approver_id` (uuid, FK to profiles)
  - `approver_role` (text: hiring_manager, finance, hrbp)
  - `status` (enum: pending, approved, rejected)
  - `comments` (text)
  - `order` (int)
  - `approved_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 4. candidates
  Candidate records
  - `id` (uuid)
  - `email` (text, unique)
  - `full_name` (text)
  - `phone` (text)
  - `resume_url` (text)
  - `linkedin_url` (text)
  - `current_company` (text)
  - `current_title` (text)
  - `years_of_experience` (int)
  - `skills` (text[])
  - `source` (text: referral, linkedin, job_board, website, etc.)
  - `current_stage` (enum: applied, screening, interview, offer, hired, rejected)
  - `tags` (text[])
  - `created_by` (uuid, FK to profiles)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. job_applications
  Links candidates to specific jobs
  - `id` (uuid)
  - `job_id` (uuid, FK to jobs)
  - `candidate_id` (uuid, FK to candidates)
  - `stage` (enum: applied, screening, interview, offer, hired, rejected)
  - `stage_order` (int)
  - `applied_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 6. interviews
  Interview scheduling and tracking
  - `id` (uuid)
  - `application_id` (uuid, FK to job_applications)
  - `title` (text)
  - `interview_type` (text: phone_screen, technical, behavioral, final, etc.)
  - `scheduled_at` (timestamptz)
  - `duration_minutes` (int)
  - `location` (text)
  - `meeting_link` (text)
  - `status` (enum: scheduled, completed, cancelled, rescheduled)
  - `created_by` (uuid, FK to profiles)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. interview_panelists
  Interviewers assigned to interviews
  - `id` (uuid)
  - `interview_id` (uuid, FK to interviews)
  - `panelist_id` (uuid, FK to profiles)
  - `is_required` (boolean)
  - `created_at` (timestamptz)

  ### 8. interview_feedback
  Feedback and scorecards from interviewers
  - `id` (uuid)
  - `interview_id` (uuid, FK to interviews)
  - `panelist_id` (uuid, FK to profiles)
  - `overall_rating` (int: 1-5)
  - `technical_skills` (int: 1-5)
  - `communication` (int: 1-5)
  - `culture_fit` (int: 1-5)
  - `recommendation` (enum: strong_yes, yes, maybe, no, strong_no)
  - `comments` (text)
  - `submitted_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 9. offers
  Job offers
  - `id` (uuid)
  - `application_id` (uuid, FK to job_applications)
  - `offer_letter_url` (text)
  - `fixed_ctc` (numeric)
  - `variable_ctc` (numeric)
  - `joining_bonus` (numeric)
  - `equity` (text)
  - `start_date` (date)
  - `status` (enum: draft, pending_approval, approved, sent, accepted, rejected, expired)
  - `version` (int)
  - `created_by` (uuid, FK to profiles)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 10. offer_approvals
  Approval chain for offers
  - `id` (uuid)
  - `offer_id` (uuid, FK to offers)
  - `approver_id` (uuid, FK to profiles)
  - `approver_role` (text)
  - `status` (enum: pending, approved, rejected)
  - `comments` (text)
  - `order` (int)
  - `approved_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 11. activity_logs
  Audit trail for all actions
  - `id` (uuid)
  - `entity_type` (text: job, candidate, interview, offer)
  - `entity_id` (uuid)
  - `action` (text)
  - `description` (text)
  - `metadata` (jsonb)
  - `performed_by` (uuid, FK to profiles)
  - `created_at` (timestamptz)

  ### 12. candidate_notes
  Notes and mentions on candidates
  - `id` (uuid)
  - `candidate_id` (uuid, FK to candidates)
  - `application_id` (uuid, FK to job_applications)
  - `content` (text)
  - `mentions` (uuid[])
  - `created_by` (uuid, FK to profiles)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 13. email_templates
  Templates for automated emails
  - `id` (uuid)
  - `name` (text)
  - `subject` (text)
  - `body` (text)
  - `trigger_event` (text)
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 14. email_logs
  Track sent emails
  - `id` (uuid)
  - `to_email` (text)
  - `template_id` (uuid, FK to email_templates)
  - `subject` (text)
  - `body` (text)
  - `sent_at` (timestamptz)
  - `status` (text)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Create policies based on user roles
  - Audit logs are append-only for authenticated users
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'recruiter', 'hiring_manager', 'interviewer', 'finance');
CREATE TYPE job_status AS ENUM ('draft', 'pending_approval', 'approved', 'published', 'closed');
CREATE TYPE job_type AS ENUM ('full_time', 'part_time', 'contract', 'internship');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE candidate_stage AS ENUM ('applied', 'screening', 'interview', 'offer', 'hired', 'rejected');
CREATE TYPE interview_status AS ENUM ('scheduled', 'completed', 'cancelled', 'rescheduled');
CREATE TYPE recommendation_type AS ENUM ('strong_yes', 'yes', 'maybe', 'no', 'strong_no');
CREATE TYPE offer_status AS ENUM ('draft', 'pending_approval', 'approved', 'sent', 'accepted', 'rejected', 'expired');

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'interviewer',
  avatar_url text,
  department text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  requisition_id text UNIQUE NOT NULL,
  department text NOT NULL,
  location text NOT NULL,
  job_type job_type NOT NULL DEFAULT 'full_time',
  description text NOT NULL,
  requirements text,
  salary_min numeric,
  salary_max numeric,
  status job_status NOT NULL DEFAULT 'draft',
  hiring_manager_id uuid REFERENCES profiles(id),
  recruiter_id uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Job approvals table
CREATE TABLE IF NOT EXISTS job_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  approver_id uuid REFERENCES profiles(id) NOT NULL,
  approver_role text NOT NULL,
  status approval_status NOT NULL DEFAULT 'pending',
  comments text,
  order_num int NOT NULL,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  resume_url text,
  linkedin_url text,
  current_company text,
  current_title text,
  years_of_experience int,
  skills text[] DEFAULT '{}',
  source text,
  current_stage candidate_stage NOT NULL DEFAULT 'applied',
  tags text[] DEFAULT '{}',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Job applications table
CREATE TABLE IF NOT EXISTS job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
  stage candidate_stage NOT NULL DEFAULT 'applied',
  stage_order int NOT NULL DEFAULT 1,
  applied_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_id, candidate_id)
);

-- Interviews table
CREATE TABLE IF NOT EXISTS interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES job_applications(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  interview_type text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  location text,
  meeting_link text,
  status interview_status NOT NULL DEFAULT 'scheduled',
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Interview panelists table
CREATE TABLE IF NOT EXISTS interview_panelists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid REFERENCES interviews(id) ON DELETE CASCADE NOT NULL,
  panelist_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(interview_id, panelist_id)
);

-- Interview feedback table
CREATE TABLE IF NOT EXISTS interview_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid REFERENCES interviews(id) ON DELETE CASCADE NOT NULL,
  panelist_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  overall_rating int CHECK (overall_rating >= 1 AND overall_rating <= 5),
  technical_skills int CHECK (technical_skills >= 1 AND technical_skills <= 5),
  communication int CHECK (communication >= 1 AND communication <= 5),
  culture_fit int CHECK (culture_fit >= 1 AND culture_fit <= 5),
  recommendation recommendation_type,
  comments text,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(interview_id, panelist_id)
);

-- Offers table
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES job_applications(id) ON DELETE CASCADE NOT NULL,
  offer_letter_url text,
  fixed_ctc numeric NOT NULL,
  variable_ctc numeric DEFAULT 0,
  joining_bonus numeric DEFAULT 0,
  equity text,
  start_date date,
  status offer_status NOT NULL DEFAULT 'draft',
  version int NOT NULL DEFAULT 1,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Offer approvals table
CREATE TABLE IF NOT EXISTS offer_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid REFERENCES offers(id) ON DELETE CASCADE NOT NULL,
  approver_id uuid REFERENCES profiles(id) NOT NULL,
  approver_role text NOT NULL,
  status approval_status NOT NULL DEFAULT 'pending',
  comments text,
  order_num int NOT NULL,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  performed_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Candidate notes table
CREATE TABLE IF NOT EXISTS candidate_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
  application_id uuid REFERENCES job_applications(id) ON DELETE CASCADE,
  content text NOT NULL,
  mentions uuid[] DEFAULT '{}',
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  trigger_event text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  template_id uuid REFERENCES email_templates(id),
  subject text NOT NULL,
  body text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_stage ON candidates(current_stage);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_candidate ON job_applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled ON interviews(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

-- Create function to auto-generate requisition IDs
CREATE OR REPLACE FUNCTION generate_requisition_id()
RETURNS text AS $$
DECLARE
  new_id text;
  counter int;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(requisition_id FROM 5)::int), 0) + 1 INTO counter FROM jobs;
  new_id := 'REQ-' || LPAD(counter::text, 5, '0');
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate requisition ID
CREATE OR REPLACE FUNCTION set_requisition_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.requisition_id IS NULL OR NEW.requisition_id = '' THEN
    NEW.requisition_id := generate_requisition_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_requisition_id
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_requisition_id();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_candidates_updated_at BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_job_applications_updated_at BEFORE UPDATE ON job_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_interviews_updated_at BEFORE UPDATE ON interviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_offers_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_candidate_notes_updated_at BEFORE UPDATE ON candidate_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_panelists ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for jobs
CREATE POLICY "Authenticated users can view jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Recruiters and admins can create jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter')
    )
  );

CREATE POLICY "Creators and admins can update jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for job_approvals
CREATE POLICY "Users can view job approvals"
  ON job_approvals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert job approvals"
  ON job_approvals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Approvers can update their approvals"
  ON job_approvals FOR UPDATE
  TO authenticated
  USING (approver_id = auth.uid())
  WITH CHECK (approver_id = auth.uid());

-- RLS Policies for candidates
CREATE POLICY "Authenticated users can view candidates"
  ON candidates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Recruiters and admins can create candidates"
  ON candidates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter', 'hiring_manager')
    )
  );

CREATE POLICY "Recruiters and admins can update candidates"
  ON candidates FOR UPDATE
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

-- RLS Policies for job_applications
CREATE POLICY "Users can view job applications"
  ON job_applications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Recruiters can manage applications"
  ON job_applications FOR ALL
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

-- RLS Policies for interviews
CREATE POLICY "Users can view interviews they're involved in"
  ON interviews FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM interview_panelists
      WHERE interview_id = interviews.id AND panelist_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter', 'hiring_manager')
    )
  );

CREATE POLICY "Recruiters can create interviews"
  ON interviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter', 'hiring_manager')
    )
  );

CREATE POLICY "Recruiters can update interviews"
  ON interviews FOR UPDATE
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

-- RLS Policies for interview_panelists
CREATE POLICY "Users can view interview panelists"
  ON interview_panelists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Recruiters can manage panelists"
  ON interview_panelists FOR ALL
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

-- RLS Policies for interview_feedback
CREATE POLICY "Users can view feedback"
  ON interview_feedback FOR SELECT
  TO authenticated
  USING (
    panelist_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter', 'hiring_manager')
    )
  );

CREATE POLICY "Panelists can submit their feedback"
  ON interview_feedback FOR INSERT
  TO authenticated
  WITH CHECK (panelist_id = auth.uid());

CREATE POLICY "Panelists can update their feedback"
  ON interview_feedback FOR UPDATE
  TO authenticated
  USING (panelist_id = auth.uid())
  WITH CHECK (panelist_id = auth.uid());

-- RLS Policies for offers
CREATE POLICY "Authorized users can view offers"
  ON offers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter', 'hiring_manager', 'finance')
    )
  );

CREATE POLICY "Recruiters can create offers"
  ON offers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter', 'hiring_manager')
    )
  );

CREATE POLICY "Recruiters can update offers"
  ON offers FOR UPDATE
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

-- RLS Policies for offer_approvals
CREATE POLICY "Users can view offer approvals"
  ON offer_approvals FOR SELECT
  TO authenticated
  USING (
    approver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter')
    )
  );

CREATE POLICY "System can create offer approvals"
  ON offer_approvals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Approvers can update their approvals"
  ON offer_approvals FOR UPDATE
  TO authenticated
  USING (approver_id = auth.uid())
  WITH CHECK (approver_id = auth.uid());

-- RLS Policies for activity_logs
CREATE POLICY "Users can view activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (performed_by = auth.uid());

-- RLS Policies for candidate_notes
CREATE POLICY "Users can view notes"
  ON candidate_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create notes"
  ON candidate_notes FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their notes"
  ON candidate_notes FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their notes"
  ON candidate_notes FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for email_templates
CREATE POLICY "Users can view email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage email templates"
  ON email_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for email_logs
CREATE POLICY "Users can view email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter')
    )
  );

CREATE POLICY "System can insert email logs"
  ON email_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert default email templates
INSERT INTO email_templates (name, subject, body, trigger_event, is_active) VALUES
('Application Received', 'Application Received - {{job_title}}', 'Hi {{candidate_name}},\n\nThank you for applying to {{job_title}} at our company. We have received your application and our team will review it shortly.\n\nBest regards,\nThe Hiring Team', 'application_received', true),
('Interview Invitation', 'Interview Invitation - {{job_title}}', 'Hi {{candidate_name}},\n\nWe are pleased to invite you for an interview for the {{job_title}} position.\n\nInterview Details:\nDate: {{interview_date}}\nTime: {{interview_time}}\nLocation: {{interview_location}}\n\nPlease confirm your availability.\n\nBest regards,\nThe Hiring Team', 'interview_scheduled', true),
('Rejection', 'Update on Your Application - {{job_title}}', 'Hi {{candidate_name}},\n\nThank you for your interest in the {{job_title}} position. After careful consideration, we have decided to move forward with other candidates.\n\nWe appreciate the time you invested in the process and wish you the best in your job search.\n\nBest regards,\nThe Hiring Team', 'application_rejected', true),
('Offer Letter', 'Job Offer - {{job_title}}', 'Hi {{candidate_name}},\n\nCongratulations! We are delighted to offer you the position of {{job_title}}.\n\nOffer Details:\nFixed CTC: {{fixed_ctc}}\nVariable: {{variable_ctc}}\nJoining Bonus: {{joining_bonus}}\nStart Date: {{start_date}}\n\nPlease review the attached offer letter and let us know your decision.\n\nBest regards,\nThe Hiring Team', 'offer_sent', true)
ON CONFLICT DO NOTHING;