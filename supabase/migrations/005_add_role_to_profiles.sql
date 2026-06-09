-- Add role column to profiles for admin access control
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);

-- To grant admin access, run in Supabase SQL editor:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
