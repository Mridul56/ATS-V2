# Interviewer Setup Instructions

## Setting Up Interviewer Accounts

Since the interviewers (`interviewer@zolve.com` and `interviewer2@zolve.com`) need to be created through Supabase Auth, follow these steps:

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Users**
3. Click **Add User** and create users with:
   - Email: `interviewer@zolve.com`
   - Password: (set a secure password)
   - Auto Confirm: Yes

4. Repeat for `interviewer2@zolve.com`

5. After creating the users, run this SQL in the **SQL Editor** to set up their profiles:

```sql
-- Update or create profiles for interviewers
DO $$
DECLARE
  interviewer1_id uuid;
  interviewer2_id uuid;
BEGIN
  -- Get user IDs
  SELECT id INTO interviewer1_id FROM auth.users WHERE email = 'interviewer@zolve.com';
  SELECT id INTO interviewer2_id FROM auth.users WHERE email = 'interviewer2@zolve.com';

  -- Insert or update profiles
  IF interviewer1_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
    VALUES (interviewer1_id, 'interviewer@zolve.com', 'Interviewer One', 'interviewer', now(), now())
    ON CONFLICT (id) DO UPDATE
    SET role = 'interviewer', full_name = 'Interviewer One', updated_at = now();
  END IF;

  IF interviewer2_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
    VALUES (interviewer2_id, 'interviewer2@zolve.com', 'Interviewer Two', 'interviewer', now(), now())
    ON CONFLICT (id) DO UPDATE
    SET role = 'interviewer', full_name = 'Interviewer Two', updated_at = now();
  END IF;
END $$;
```

### Option 2: Using Sign Up Feature (If Available)

1. Use the application's sign-up feature to create accounts for:
   - `interviewer@zolve.com`
   - `interviewer2@zolve.com`

2. After sign-up, run the SQL above to update their roles to 'interviewer'

## Adding Interviewers to Jobs

When creating or editing a job requisition:

1. Scroll to the **Interview Panel** section
2. Add interviewers with their details:
   - Name: Interviewer One
   - Email: interviewer@zolve.com
   - Role: Senior Engineer (or any relevant title)

3. Add additional interviewers as needed
4. These interviewers will appear in the dropdown when scheduling interviews

## How It Works

1. **Recruiter** adds interviewers to a job requisition
2. **Recruiter** schedules interview rounds for candidates from the Jobs section
3. **Recruiter** selects an interviewer from the list added to the job
4. **Interviewer** logs in and sees their scheduled interviews on their dashboard
5. **Interviewer** can view candidate details, join meetings, and submit feedback
6. **Interviews** move sequentially - next round can only be scheduled if previous round is completed and candidate passed

## Interviewer Dashboard Features

- View all scheduled interviews
- See upcoming and past interviews
- Access candidate information and resumes
- Join meeting links
- Submit feedback and ratings
- Track completed interviews
