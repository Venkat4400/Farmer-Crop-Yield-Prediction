-- Supabase PostgreSQL Migration
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create predictions table
CREATE TABLE public.predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  crop TEXT NOT NULL,
  soil_type TEXT NOT NULL,
  region TEXT NOT NULL,
  season TEXT NOT NULL,
  rainfall NUMERIC NOT NULL,
  temperature NUMERIC NOT NULL,
  humidity NUMERIC NOT NULL,
  predicted_yield NUMERIC NOT NULL,
  confidence NUMERIC,
  model_accuracy JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on predictions
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- Predictions policies - users can only see their own predictions
CREATE POLICY "Users can view their own predictions"
ON public.predictions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own predictions"
ON public.predictions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own predictions"
ON public.predictions FOR DELETE
USING (auth.uid() = user_id);

-- Create model_stats table for storing ML model performance metrics
CREATE TABLE public.model_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_name TEXT NOT NULL,
  r2_score NUMERIC,
  mae NUMERIC,
  rmse NUMERIC,
  training_samples INTEGER,
  last_trained_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Model stats is public readable for dashboard display
ALTER TABLE public.model_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view model stats"
ON public.model_stats FOR SELECT
USING (true);

-- Function to handle new user signup - create profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();