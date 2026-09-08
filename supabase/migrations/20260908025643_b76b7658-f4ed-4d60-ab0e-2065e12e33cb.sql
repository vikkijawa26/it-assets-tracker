CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  username text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "admin all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tag text NOT NULL,
  name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  location text NOT NULL DEFAULT '',
  owner text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tag)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own assets" ON public.assets FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin assets" ON public.assets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER assets_updated_at BEFORE UPDATE ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();