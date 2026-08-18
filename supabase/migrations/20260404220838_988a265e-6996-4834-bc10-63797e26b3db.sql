-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  reminder_email TEXT,
  reminder_phone TEXT,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  browser_notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  reminder_time TEXT DEFAULT '20:00',
  currency TEXT DEFAULT 'USD',
  country TEXT DEFAULT 'Rwanda',
  timezone TEXT DEFAULT 'Africa/Kigali',
  collaborator_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id OR auth.uid() = ANY(collaborator_ids));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Financial records
CREATE TABLE public.financial_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

-- Helper to check if a user is a collaborator of the owner of a record
CREATE OR REPLACE FUNCTION public.is_collaborator(_owner_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = _owner_id AND _user_id = ANY(collaborator_ids)
  )
$$;

CREATE POLICY "Users can view own and collaborator records" ON public.financial_records FOR SELECT USING (
  auth.uid() = user_id OR public.is_collaborator(user_id, auth.uid())
);
CREATE POLICY "Users can insert own records" ON public.financial_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own records" ON public.financial_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own records" ON public.financial_records FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all records" ON public.financial_records FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_financial_records_updated_at BEFORE UPDATE ON public.financial_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habits
CREATE TABLE public.habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#14B8A6',
  icon TEXT DEFAULT 'check',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own and collaborator habits" ON public.habits FOR SELECT USING (
  auth.uid() = user_id OR public.is_collaborator(user_id, auth.uid())
);
CREATE POLICY "Users can insert own habits" ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON public.habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits" ON public.habits FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habit logs
CREATE TABLE public.habit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, log_date)
);
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own and collaborator logs" ON public.habit_logs FOR SELECT USING (
  auth.uid() = user_id OR public.is_collaborator(user_id, auth.uid())
);
CREATE POLICY "Users can insert own logs" ON public.habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own logs" ON public.habit_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own logs" ON public.habit_logs FOR DELETE USING (auth.uid() = user_id);

-- Applications
CREATE TABLE public.applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('job', 'scholarship')) DEFAULT 'job',
  status TEXT NOT NULL CHECK (status IN ('Interested', 'Applied', 'Interviewing', 'Offered', 'Rejected', 'Archived')) DEFAULT 'Interested',
  location TEXT,
  compensation TEXT,
  deadline TEXT,
  url TEXT,
  notes TEXT,
  contacts TEXT,
  linked_files TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view applications by ID" ON public.applications FOR SELECT USING (true);
CREATE POLICY "Users can view own and collaborator applications" ON public.applications FOR SELECT USING (
  auth.uid() = user_id OR public.is_collaborator(user_id, auth.uid())
);
CREATE POLICY "Users can insert own applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own applications" ON public.applications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own applications" ON public.applications FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Monthly budgets meta
CREATE TABLE public.monthly_budgets_meta (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,
  planned_income DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, month)
);
ALTER TABLE public.monthly_budgets_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own and collaborator budgets meta" ON public.monthly_budgets_meta FOR SELECT USING (
  auth.uid() = user_id OR public.is_collaborator(user_id, auth.uid())
);
CREATE POLICY "Users can insert own budgets meta" ON public.monthly_budgets_meta FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets meta" ON public.monthly_budgets_meta FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets meta" ON public.monthly_budgets_meta FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_monthly_budgets_meta_updated_at BEFORE UPDATE ON public.monthly_budgets_meta FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Monthly budgets
CREATE TABLE public.monthly_budgets (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,
  category TEXT NOT NULL,
  allocated DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, month, category)
);
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own and collaborator budgets" ON public.monthly_budgets FOR SELECT USING (
  auth.uid() = user_id OR public.is_collaborator(user_id, auth.uid())
);
CREATE POLICY "Users can insert own budgets" ON public.monthly_budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON public.monthly_budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets" ON public.monthly_budgets FOR DELETE USING (auth.uid() = user_id);

-- Mindset logs
CREATE TABLE public.mindset_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  mood INTEGER,
  energy INTEGER,
  focus INTEGER,
  motivation INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);
ALTER TABLE public.mindset_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own and collaborator mindset logs" ON public.mindset_logs FOR SELECT USING (
  auth.uid() = user_id OR public.is_collaborator(user_id, auth.uid())
);
CREATE POLICY "Users can insert own mindset logs" ON public.mindset_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mindset logs" ON public.mindset_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mindset logs" ON public.mindset_logs FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_mindset_logs_updated_at BEFORE UPDATE ON public.mindset_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Collaboration invites
CREATE TABLE public.collaboration_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_email TEXT NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender_name TEXT NOT NULL,
  receiver_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.collaboration_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view invites they sent or received" ON public.collaboration_invites FOR SELECT USING (
  auth.uid() = sender_id OR auth.jwt() ->> 'email' = receiver_email
);
CREATE POLICY "Users can insert own invites" ON public.collaboration_invites FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);
CREATE POLICY "Users can update invites they received" ON public.collaboration_invites FOR UPDATE USING (
  auth.jwt() ->> 'email' = receiver_email
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, avatar_url)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
