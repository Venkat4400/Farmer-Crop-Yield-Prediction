-- Supabase PostgreSQL Migration
-- Create crop_yield_data table to store comprehensive crop yield dataset
CREATE TABLE public.crop_yield_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop TEXT NOT NULL,
  soil_type TEXT NOT NULL,
  region TEXT NOT NULL,
  state TEXT,
  district TEXT,
  season TEXT NOT NULL,
  rainfall NUMERIC NOT NULL,
  temperature NUMERIC NOT NULL,
  humidity NUMERIC NOT NULL,
  yield NUMERIC NOT NULL,
  area_hectares NUMERIC DEFAULT 1,
  fertilizer_used TEXT,
  irrigation_type TEXT,
  year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_crop_yield_data_crop ON public.crop_yield_data(crop);
CREATE INDEX idx_crop_yield_data_region ON public.crop_yield_data(region);
CREATE INDEX idx_crop_yield_data_state ON public.crop_yield_data(state);
CREATE INDEX idx_crop_yield_data_district ON public.crop_yield_data(district);
CREATE INDEX idx_crop_yield_data_season ON public.crop_yield_data(season);
CREATE INDEX idx_crop_yield_data_soil_type ON public.crop_yield_data(soil_type);

-- Enable Row Level Security
ALTER TABLE public.crop_yield_data ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (this is reference data)
CREATE POLICY "Anyone can view crop yield data" 
ON public.crop_yield_data 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_crop_yield_data_updated_at
BEFORE UPDATE ON public.crop_yield_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();