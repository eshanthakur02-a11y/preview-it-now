
CREATE OR REPLACE FUNCTION public.get_user_school(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT school_id FROM public.profiles WHERE id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.log_audit(
  _action text, _entity text, _entity_id uuid, _school_id uuid, _meta jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- no-op audit sink; audit table not yet provisioned
  RETURN;
END; $$;

REVOKE ALL ON FUNCTION public.get_user_school(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_audit(text, text, uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_school(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, uuid, uuid, jsonb) TO authenticated, service_role;
