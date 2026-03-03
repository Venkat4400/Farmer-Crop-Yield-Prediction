-- PostgreSQL 14+
-- Supabase Migration
-- Modify crop_yield_data table schema

--Drop NOT NULL constraints
ALTER TABLE public.crop_yield_data ALTER COLUMN temperature DROP NOT NULL;
ALTER TABLE public.crop_yield_data ALTER COLUMN humidity DROP NOT NULL;
ALTER TABLE public.crop_yield_data ALTER COLUMN soil_type DROP NOT NULL;
ALTER TABLE public.crop_yield_data ALTER COLUMN region DROP NOT NULL;

--Add new columns if they don't exist
ALTER TABLE public.crop_yield_data ADD COLUMN IF NOT EXISTS production NUMERIC;
ALTER TABLE public.crop_yield_data ADD COLUMN IF NOT EXISTS pesticide NUMERIC;
ALTER TABLE public.crop_yield_data ADD COLUMN IF NOT EXISTS annual_rainfall NUMERIC;

--Clear existing data
TRUNCATE TABLE public.crop_yield_data;