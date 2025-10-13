-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE app_role AS ENUM ('admin', 'operator');
CREATE TYPE tire_status AS ENUM ('estoque', 'piloto', 'cup', 'dsi');
CREATE TYPE location_type AS ENUM ('container', 'piloto', 'none');
CREATE TYPE tire_event_type AS ENUM ('created', 'moved', 'status_changed', 'assigned_to_driver', 'returned');
CREATE TYPE driver_category AS ENUM ('carrera', 'challenge', 'trophy');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create tire_models table
CREATE TABLE public.tire_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  compound TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create containers table
CREATE TABLE public.containers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create seasons table
CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create drivers table
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  nickname TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cars table
CREATE TABLE public.cars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chassis TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create season_driver_associations table
CREATE TABLE public.season_driver_associations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  category driver_category NOT NULL,
  car_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(season_id, driver_id)
);

-- Create tires table
CREATE TABLE public.tires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode TEXT NOT NULL UNIQUE,
  model_id UUID NOT NULL REFERENCES public.tire_models(id),
  status tire_status NOT NULL DEFAULT 'estoque',
  current_location_type location_type NOT NULL DEFAULT 'container',
  current_location_id UUID,
  current_driver_id UUID REFERENCES public.drivers(id),
  position TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tire_history table for complete audit trail
CREATE TABLE public.tire_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tire_id UUID NOT NULL REFERENCES public.tires(id) ON DELETE CASCADE,
  event_type tire_event_type NOT NULL,
  from_status tire_status,
  to_status tire_status,
  from_location_type location_type,
  from_location_id UUID,
  to_location_type location_type,
  to_location_id UUID,
  driver_id UUID REFERENCES public.drivers(id),
  position TEXT,
  metadata JSONB,
  performed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tire_models_updated_at BEFORE UPDATE ON public.tire_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_containers_updated_at BEFORE UPDATE ON public.containers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON public.cars
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_season_driver_associations_updated_at BEFORE UPDATE ON public.season_driver_associations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tires_updated_at BEFORE UPDATE ON public.tires
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tire_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_driver_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tire_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for tire_models
CREATE POLICY "Authenticated users can view tire models" ON public.tire_models
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage tire models" ON public.tire_models
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for containers
CREATE POLICY "Authenticated users can view containers" ON public.containers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage containers" ON public.containers
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for seasons
CREATE POLICY "Authenticated users can view seasons" ON public.seasons
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage seasons" ON public.seasons
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for drivers
CREATE POLICY "Authenticated users can view drivers" ON public.drivers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage drivers" ON public.drivers
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for cars
CREATE POLICY "Authenticated users can view cars" ON public.cars
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage cars" ON public.cars
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for season_driver_associations
CREATE POLICY "Authenticated users can view associations" ON public.season_driver_associations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage associations" ON public.season_driver_associations
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for tires
CREATE POLICY "Authenticated users can view tires" ON public.tires
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operators can create tires" ON public.tires
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Operators can update tires" ON public.tires
  FOR UPDATE TO authenticated USING (true);

-- RLS Policies for tire_history
CREATE POLICY "Authenticated users can view tire history" ON public.tire_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operators can create tire history" ON public.tire_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Assign operator role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operator');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();