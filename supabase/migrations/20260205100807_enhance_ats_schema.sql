/*
  # Enhanced ATS Schema for Complete Hiring Lifecycle

  ## Overview
  This migration adds comprehensive features for:
  - Resume screening with keyword matching
  - Enhanced requisition fields for screening
  - Question bank for structured interviews
  - Requisition closure tracking
  - Enhanced approval workflows
  - Audit trail improvements

  ## New Fields on Existing Tables

  ### Jobs Table Enhancements
  - Mandatory keywords for screening
  - Preferred keywords
  - Minimum experience required
  - Required qualifications
  - Target hire date
  - Number of openings
  - Closure tracking

  ## New Tables

  ### 1. question_bank
  Role-based interview questions
  - Questions organized by role, department, level
  - Question types (technical, behavioral, case-based)
  - Version control

  ### 2. interview_questions_asked
  Track which questions were used in interviews
  - Links interviews to questions
  - Custom questions added during interview

  ### 3. requisition_closure
  Track requisition closure details
  - Closure reason
  - Positions filled
  - Timeline metrics

  ## Security
  - Enable RLS on all new tables
  - Appropriate access policies
*/

-- Add new columns to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS mandatory_keywords text[] DEFAULT '{}';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS preferred_keywords text[] DEFAULT '{}';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS min_experience_years int;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS required_qualifications text[] DEFAULT '{}';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS target_hire_date date;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS number_of_openings int DEFAULT 1;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS positions_filled int DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS closure_reason text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Add parsed resume data to candidates
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS parsed_skills text[] DEFAULT '{}';
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS parsed_education text;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS parsed_experience_years int;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS keyword_match_score int DEFAULT 0;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS mandatory_match boolean DEFAULT false;

-- Question bank table
CREATE TABLE IF NOT EXISTS question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('technical', 'behavioral', 'case_based', 'situational')),
  role text,
  department text,
  experience_level text CHECK (experience_level IN ('junior', 'mid', 'senior', 'lead', 'any')),
  difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard')),
  expected_answer text,
  evaluation_criteria text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Interview questions asked (tracking)
CREATE TABLE IF NOT EXISTS interview_questions_asked (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid REFERENCES interviews(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES question_bank(id) ON DELETE SET NULL,
  custom_question text,
  was_asked boolean DEFAULT true,
  candidate_response text,
  created_at timestamptz DEFAULT now()
);

-- Requisition closure tracking
CREATE TABLE IF NOT EXISTS requisition_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL UNIQUE,
  closure_type text NOT NULL CHECK (closure_type IN ('filled', 'cancelled', 'frozen', 'on_hold')),
  closure_reason text NOT NULL,
  positions_filled int DEFAULT 0,
  time_to_fill_days int,
  closed_by uuid REFERENCES profiles(id),
  closed_at timestamptz DEFAULT now(),
  notes text
);

-- Candidate screening scores
CREATE TABLE IF NOT EXISTS screening_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES job_applications(id) ON DELETE CASCADE NOT NULL UNIQUE,
  mandatory_keywords_matched int DEFAULT 0,
  mandatory_keywords_total int DEFAULT 0,
  preferred_keywords_matched int DEFAULT 0,
  preferred_keywords_total int DEFAULT 0,
  experience_match boolean DEFAULT false,
  qualification_match boolean DEFAULT false,
  overall_match_percentage int DEFAULT 0,
  screening_notes text,
  screened_by uuid REFERENCES profiles(id),
  screened_at timestamptz DEFAULT now()
);

-- Interview availability tracking
CREATE TABLE IF NOT EXISTS interview_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panelist_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  available_from timestamptz NOT NULL,
  available_to timestamptz NOT NULL,
  is_recurring boolean DEFAULT false,
  recurrence_pattern text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_question_bank_role ON question_bank(role);
CREATE INDEX IF NOT EXISTS idx_question_bank_type ON question_bank(question_type);
CREATE INDEX IF NOT EXISTS idx_question_bank_department ON question_bank(department);
CREATE INDEX IF NOT EXISTS idx_interview_questions_interview ON interview_questions_asked(interview_id);
CREATE INDEX IF NOT EXISTS idx_screening_scores_application ON screening_scores(application_id);
CREATE INDEX IF NOT EXISTS idx_jobs_target_hire_date ON jobs(target_hire_date);
CREATE INDEX IF NOT EXISTS idx_jobs_closure ON jobs(closure_reason, closed_at);

-- Update triggers
CREATE TRIGGER trigger_question_bank_updated_at BEFORE UPDATE ON question_bank FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_questions_asked ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisition_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies for question_bank
CREATE POLICY "Users can view question bank"
  ON question_bank FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and hiring managers can create questions"
  ON question_bank FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter', 'hiring_manager')
    )
  );

CREATE POLICY "Admins and creators can update questions"
  ON question_bank FOR UPDATE
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

-- RLS Policies for interview_questions_asked
CREATE POLICY "Users can view questions asked"
  ON interview_questions_asked FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interviews i
      INNER JOIN interview_panelists ip ON i.id = ip.interview_id
      WHERE i.id = interview_questions_asked.interview_id
      AND (ip.panelist_id = auth.uid() OR i.created_by = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter', 'hiring_manager')
    )
  );

CREATE POLICY "Panelists can add questions"
  ON interview_questions_asked FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interview_panelists
      WHERE interview_id = interview_questions_asked.interview_id
      AND panelist_id = auth.uid()
    )
  );

-- RLS Policies for requisition_closures
CREATE POLICY "Users can view closures"
  ON requisition_closures FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and recruiters can create closures"
  ON requisition_closures FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter', 'hiring_manager')
    )
  );

-- RLS Policies for screening_scores
CREATE POLICY "Recruiters can view screening scores"
  ON screening_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter', 'hiring_manager')
    )
  );

CREATE POLICY "Recruiters can create screening scores"
  ON screening_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter', 'hiring_manager')
    )
  );

CREATE POLICY "Screeners can update their scores"
  ON screening_scores FOR UPDATE
  TO authenticated
  USING (screened_by = auth.uid())
  WITH CHECK (screened_by = auth.uid());

-- RLS Policies for interview_availability
CREATE POLICY "Users can view availability"
  ON interview_availability FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their availability"
  ON interview_availability FOR ALL
  TO authenticated
  USING (panelist_id = auth.uid())
  WITH CHECK (panelist_id = auth.uid());

-- Insert sample question bank data
INSERT INTO question_bank (question_text, question_type, role, department, experience_level, difficulty, evaluation_criteria) VALUES
  ('Describe a time when you had to debug a complex production issue. What was your approach?', 'behavioral', 'Software Engineer', 'Engineering', 'mid', 'medium', 'Look for: systematic approach, communication with team, root cause analysis, prevention measures'),
  ('Explain the difference between SQL and NoSQL databases. When would you choose one over the other?', 'technical', 'Software Engineer', 'Engineering', 'mid', 'medium', 'Look for: understanding of data models, scalability considerations, use case awareness'),
  ('How do you handle conflicting priorities from multiple stakeholders?', 'behavioral', NULL, NULL, 'any', 'easy', 'Look for: communication skills, prioritization framework, stakeholder management'),
  ('Write a function to reverse a linked list', 'technical', 'Software Engineer', 'Engineering', 'junior', 'medium', 'Look for: correct algorithm, edge case handling, time/space complexity awareness'),
  ('Tell me about a time you had to learn a new technology quickly', 'behavioral', NULL, 'Engineering', 'any', 'easy', 'Look for: learning ability, resourcefulness, application of learning'),
  ('How would you design a URL shortening service like bit.ly?', 'case_based', 'Software Engineer', 'Engineering', 'senior', 'hard', 'Look for: system design thinking, scalability, trade-offs, database design'),
  ('What metrics would you track for a B2B SaaS product?', 'technical', 'Product Manager', 'Product', 'mid', 'medium', 'Look for: understanding of SaaS metrics, business acumen, data-driven thinking'),
  ('Describe your design process from research to final deliverable', 'behavioral', 'Product Designer', 'Design', 'mid', 'medium', 'Look for: user-centered approach, iteration, collaboration, design thinking'),
  ('How do you ensure your marketing campaigns are delivering ROI?', 'technical', 'Marketing Manager', 'Marketing', 'mid', 'medium', 'Look for: analytics knowledge, attribution understanding, optimization mindset'),
  ('What is your experience with Kubernetes and container orchestration?', 'technical', 'DevOps Engineer', 'Engineering', 'senior', 'hard', 'Look for: hands-on experience, understanding of architecture, troubleshooting ability')
ON CONFLICT DO NOTHING;

-- Function to calculate screening score
CREATE OR REPLACE FUNCTION calculate_screening_score(
  p_application_id uuid,
  p_job_id uuid,
  p_candidate_id uuid
)
RETURNS void AS $$
DECLARE
  v_job_mandatory_keywords text[];
  v_job_preferred_keywords text[];
  v_job_min_experience int;
  v_candidate_skills text[];
  v_candidate_experience int;
  v_mandatory_matched int := 0;
  v_preferred_matched int := 0;
  v_experience_match boolean := false;
  v_overall_percentage int := 0;
BEGIN
  -- Get job requirements
  SELECT mandatory_keywords, preferred_keywords, min_experience_years
  INTO v_job_mandatory_keywords, v_job_preferred_keywords, v_job_min_experience
  FROM jobs WHERE id = p_job_id;

  -- Get candidate data
  SELECT skills, years_of_experience
  INTO v_candidate_skills, v_candidate_experience
  FROM candidates WHERE id = p_candidate_id;

  -- Calculate mandatory keywords match
  IF v_job_mandatory_keywords IS NOT NULL AND array_length(v_job_mandatory_keywords, 1) > 0 THEN
    SELECT COUNT(*)
    INTO v_mandatory_matched
    FROM unnest(v_job_mandatory_keywords) AS keyword
    WHERE keyword ILIKE ANY(SELECT '%' || unnest(v_candidate_skills) || '%');
  END IF;

  -- Calculate preferred keywords match
  IF v_job_preferred_keywords IS NOT NULL AND array_length(v_job_preferred_keywords, 1) > 0 THEN
    SELECT COUNT(*)
    INTO v_preferred_matched
    FROM unnest(v_job_preferred_keywords) AS keyword
    WHERE keyword ILIKE ANY(SELECT '%' || unnest(v_candidate_skills) || '%');
  END IF;

  -- Check experience match
  IF v_job_min_experience IS NOT NULL AND v_candidate_experience >= v_job_min_experience THEN
    v_experience_match := true;
  END IF;

  -- Calculate overall percentage
  v_overall_percentage := CASE
    WHEN array_length(v_job_mandatory_keywords, 1) > 0 THEN
      (v_mandatory_matched::float / array_length(v_job_mandatory_keywords, 1) * 60) +
      (CASE WHEN array_length(v_job_preferred_keywords, 1) > 0
        THEN v_preferred_matched::float / array_length(v_job_preferred_keywords, 1) * 30
        ELSE 0 END) +
      (CASE WHEN v_experience_match THEN 10 ELSE 0 END)
    ELSE 0
  END;

  -- Insert or update screening score
  INSERT INTO screening_scores (
    application_id,
    mandatory_keywords_matched,
    mandatory_keywords_total,
    preferred_keywords_matched,
    preferred_keywords_total,
    experience_match,
    overall_match_percentage,
    screened_at
  ) VALUES (
    p_application_id,
    v_mandatory_matched,
    COALESCE(array_length(v_job_mandatory_keywords, 1), 0),
    v_preferred_matched,
    COALESCE(array_length(v_job_preferred_keywords, 1), 0),
    v_experience_match,
    v_overall_percentage::int,
    now()
  )
  ON CONFLICT (application_id) DO UPDATE SET
    mandatory_keywords_matched = EXCLUDED.mandatory_keywords_matched,
    mandatory_keywords_total = EXCLUDED.mandatory_keywords_total,
    preferred_keywords_matched = EXCLUDED.preferred_keywords_matched,
    preferred_keywords_total = EXCLUDED.preferred_keywords_total,
    experience_match = EXCLUDED.experience_match,
    overall_match_percentage = EXCLUDED.overall_match_percentage,
    screened_at = now();
END;
$$ LANGUAGE plpgsql;
