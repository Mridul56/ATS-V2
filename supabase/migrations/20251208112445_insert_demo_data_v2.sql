/*
  # Insert Demo Data for ATS (Simplified)

  ## Overview
  This migration inserts sample data for testing without requiring specific user profiles.
  The data can be viewed and managed once a user signs up and logs in.

  ## Sample Data
  - Job requisitions (without user references for now)
  - Candidates in various pipeline stages
  - Note: User-specific data (interviews, offers) will be created after user signup

  This approach avoids foreign key conflicts while still providing demo data.
*/

-- Insert demo jobs without user references
INSERT INTO jobs (title, department, location, job_type, description, requirements, salary_min, salary_max, status, created_by)
SELECT 
  title,
  department,
  location,
  job_type::job_type,
  description,
  requirements,
  salary_min,
  salary_max,
  status::job_status,
  (SELECT id FROM profiles LIMIT 1)
FROM (VALUES
  ('Senior Full Stack Engineer', 'Engineering', 'San Francisco, CA', 'full_time', 
   'We are looking for an experienced Full Stack Engineer to join our growing team.', 
   '5+ years of experience with React, Node.js, and PostgreSQL', 120000, 180000, 'published'),
  
  ('Product Designer', 'Design', 'Remote', 'full_time',
   'Join our design team to create beautiful and intuitive user experiences.',
   '3+ years of product design experience, proficiency in Figma', 90000, 130000, 'published'),
  
  ('DevOps Engineer', 'Engineering', 'New York, NY', 'full_time',
   'Help us build and maintain scalable infrastructure.',
   'Experience with AWS, Kubernetes, and CI/CD pipelines', 110000, 160000, 'published'),
  
  ('Marketing Manager', 'Marketing', 'Austin, TX', 'full_time',
   'Lead our marketing efforts and grow our brand.',
   '5+ years of B2B marketing experience', 80000, 120000, 'approved'),
  
  ('Data Scientist', 'Data', 'Boston, MA', 'full_time',
   'Analyze data and build ML models to drive business insights.',
   'PhD or Masters in Computer Science, Statistics, or related field', 130000, 190000, 'published'),
  
  ('Sales Development Representative', 'Sales', 'San Francisco, CA', 'full_time',
   'Generate qualified leads and book meetings for the sales team.',
   '1-2 years of SDR experience', 60000, 80000, 'published'),
  
  ('Customer Success Manager', 'Customer Success', 'Remote', 'full_time',
   'Ensure customer satisfaction and drive product adoption.',
   '3+ years of customer-facing experience', 70000, 100000, 'published'),
  
  ('Backend Engineer', 'Engineering', 'Seattle, WA', 'full_time',
   'Build scalable backend systems and APIs.',
   '4+ years of experience with Python or Node.js', 115000, 165000, 'published'),
  
  ('Frontend Engineer', 'Engineering', 'Los Angeles, CA', 'full_time',
   'Create responsive and performant web applications.',
   '3+ years of React or Vue.js experience', 100000, 150000, 'published'),
  
  ('HR Business Partner', 'Human Resources', 'Chicago, IL', 'full_time',
   'Partner with business leaders on people strategy.',
   '5+ years of HRBP experience', 85000, 115000, 'published')
) AS t(title, department, location, job_type, description, requirements, salary_min, salary_max, status)
WHERE EXISTS (SELECT 1 FROM profiles LIMIT 1)
ON CONFLICT (requisition_id) DO NOTHING;

-- Insert demo candidates
INSERT INTO candidates (full_name, email, phone, current_company, current_title, years_of_experience, skills, source, current_stage, tags)
VALUES
  ('Sarah Johnson', 'sarah.johnson@email.com', '415-555-0101', 'Tech Corp', 'Senior Software Engineer', 6, ARRAY['React', 'Node.js', 'TypeScript'], 'linkedin', 'interview', ARRAY['frontend', 'fullstack']),
  ('Michael Chen', 'michael.chen@email.com', '415-555-0102', 'StartupXYZ', 'Full Stack Developer', 4, ARRAY['Python', 'Django', 'PostgreSQL'], 'referral', 'offer', ARRAY['backend', 'database']),
  ('Emily Rodriguez', 'emily.rodriguez@email.com', '415-555-0103', 'Design Studio', 'Product Designer', 5, ARRAY['Figma', 'User Research', 'Prototyping'], 'job_board', 'screening', ARRAY['design', 'ux']),
  ('David Kim', 'david.kim@email.com', '415-555-0104', 'Cloud Systems', 'DevOps Engineer', 7, ARRAY['AWS', 'Kubernetes', 'Terraform'], 'linkedin', 'interview', ARRAY['devops', 'cloud']),
  ('Lisa Wang', 'lisa.wang@email.com', '415-555-0105', 'Marketing Pro', 'Senior Marketing Manager', 8, ARRAY['B2B Marketing', 'Content Strategy', 'Analytics'], 'referral', 'hired', ARRAY['marketing', 'strategy']),
  ('James Brown', 'james.brown@email.com', '415-555-0106', 'Data Labs', 'Data Scientist', 5, ARRAY['Python', 'Machine Learning', 'SQL'], 'website', 'screening', ARRAY['data', 'ml']),
  ('Jessica Martinez', 'jessica.martinez@email.com', '415-555-0107', 'SaaS Company', 'SDR', 2, ARRAY['Salesforce', 'Cold Calling', 'Email Outreach'], 'linkedin', 'applied', ARRAY['sales', 'bdr']),
  ('Robert Taylor', 'robert.taylor@email.com', '415-555-0108', 'Customer First', 'Customer Success Manager', 4, ARRAY['Account Management', 'Onboarding', 'Training'], 'job_board', 'interview', ARRAY['cs', 'saas']),
  ('Amanda White', 'amanda.white@email.com', '415-555-0109', 'Backend Systems', 'Senior Backend Engineer', 6, ARRAY['Java', 'Spring Boot', 'Microservices'], 'referral', 'screening', ARRAY['backend', 'java']),
  ('Christopher Lee', 'christopher.lee@email.com', '415-555-0110', 'Frontend Co', 'Lead Frontend Engineer', 7, ARRAY['React', 'Redux', 'TypeScript'], 'linkedin', 'applied', ARRAY['frontend', 'react']),
  ('Jennifer Garcia', 'jennifer.garcia@email.com', '415-555-0111', 'HR Solutions', 'HRBP', 6, ARRAY['Employee Relations', 'Talent Development', 'Compensation'], 'referral', 'offer', ARRAY['hr', 'people']),
  ('Daniel Anderson', 'daniel.anderson@email.com', '415-555-0112', 'Startup ABC', 'Software Engineer', 3, ARRAY['JavaScript', 'React', 'Node.js'], 'website', 'applied', ARRAY['fullstack']),
  ('Michelle Thomas', 'michelle.thomas@email.com', '415-555-0113', 'Design Hub', 'UX Designer', 4, ARRAY['Sketch', 'User Testing', 'Wireframing'], 'linkedin', 'rejected', ARRAY['design']),
  ('Kevin Jackson', 'kevin.jackson@email.com', '415-555-0114', 'Cloud Inc', 'Cloud Architect', 9, ARRAY['Azure', 'Docker', 'CI/CD'], 'referral', 'screening', ARRAY['cloud', 'architecture']),
  ('Rachel Wilson', 'rachel.wilson@email.com', '415-555-0115', 'Growth Marketing', 'Marketing Director', 10, ARRAY['Growth Hacking', 'SEO', 'Paid Ads'], 'linkedin', 'applied', ARRAY['marketing', 'growth']),
  ('Brian Moore', 'brian.moore@email.com', '415-555-0116', 'ML Systems', 'Machine Learning Engineer', 5, ARRAY['TensorFlow', 'PyTorch', 'Python'], 'job_board', 'interview', ARRAY['ml', 'ai']),
  ('Ashley Martin', 'ashley.martin@email.com', '415-555-0117', 'Sales Corp', 'Account Executive', 3, ARRAY['Enterprise Sales', 'Negotiation', 'CRM'], 'website', 'applied', ARRAY['sales', 'enterprise']),
  ('Matthew Thompson', 'matthew.thompson@email.com', '415-555-0118', 'Support Plus', 'Customer Support Lead', 5, ARRAY['Zendesk', 'Team Leadership', 'Customer Service'], 'linkedin', 'screening', ARRAY['support', 'cs']),
  ('Nicole Harris', 'nicole.harris@email.com', '415-555-0119', 'Backend Tech', 'API Developer', 4, ARRAY['REST', 'GraphQL', 'Node.js'], 'referral', 'applied', ARRAY['backend', 'api']),
  ('Jason Clark', 'jason.clark@email.com', '415-555-0120', 'Frontend Lab', 'UI Engineer', 5, ARRAY['Vue.js', 'CSS', 'JavaScript'], 'job_board', 'applied', ARRAY['frontend', 'ui']),
  ('Stephanie Lewis', 'stephanie.lewis@email.com', '415-555-0121', 'People Ops', 'HR Manager', 7, ARRAY['Recruitment', 'Performance Management', 'Benefits'], 'linkedin', 'screening', ARRAY['hr', 'recruiting']),
  ('Andrew Robinson', 'andrew.robinson@email.com', '415-555-0122', 'Tech Startup', 'Junior Developer', 1, ARRAY['JavaScript', 'HTML', 'CSS'], 'website', 'applied', ARRAY['junior', 'frontend']),
  ('Lauren Walker', 'lauren.walker@email.com', '415-555-0123', 'Creative Agency', 'Senior Designer', 6, ARRAY['Adobe Creative Suite', 'Brand Design', 'Illustration'], 'linkedin', 'rejected', ARRAY['design', 'branding']),
  ('Eric Young', 'eric.young@email.com', '415-555-0124', 'DevOps Co', 'Site Reliability Engineer', 5, ARRAY['Monitoring', 'Incident Response', 'Linux'], 'referral', 'interview', ARRAY['sre', 'devops']),
  ('Melissa Hall', 'melissa.hall@email.com', '415-555-0125', 'Marketing Agency', 'Content Manager', 4, ARRAY['Content Writing', 'SEO', 'Editorial'], 'job_board', 'applied', ARRAY['marketing', 'content'])
ON CONFLICT (email) DO NOTHING;
