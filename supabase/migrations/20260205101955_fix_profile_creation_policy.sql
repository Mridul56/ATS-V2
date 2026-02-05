/*
  # Fix Profile Creation Policy

  ## Changes
  - Update RLS policy to allow users to create their own profile on signup
  - This fixes the chicken-and-egg problem where first admin can't be created
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- Create new policy that allows users to create their own profile
CREATE POLICY "Users can create own profile on signup"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Keep the ability for admins to create profiles for others
CREATE POLICY "Admins can insert any profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
