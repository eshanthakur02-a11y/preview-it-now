
-- Helper: auto-fill school_id from the current user's profile when not provided
CREATE OR REPLACE FUNCTION public.fill_school_id() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.school_id IS NULL THEN
    NEW.school_id := public.current_school_id();
  END IF;
  RETURN NEW;
END; $$;

-- Generic updated_at trigger already exists as update_updated_at_column().

-- ============================ Academic structure ============================
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.academic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date,
  end_date date,
  is_current boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================ People ============================
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  admission_no text,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  dob date, gender text, phone text, email text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  employee_no text, phone text, email text, subject text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL, phone text, email text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.parent_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  relation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_id, student_id)
);

-- ============================ Teaching ============================
CREATE TABLE public.teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.timetable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time time NOT NULL, end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  date date NOT NULL, status text NOT NULL, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)
);
CREATE TABLE public.homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  title text NOT NULL, description text, due_date date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.homework_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  homework_id uuid REFERENCES public.homework(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  submitted_at timestamptz, status text DEFAULT 'pending',
  note text, grade text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (homework_id, student_id)
);

-- ============================ Exams ============================
CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  start_date date, end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  exam_id uuid REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  marks numeric, max_marks numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id, subject_id)
);

-- ============================ Fees ============================
CREATE TABLE public.fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  frequency text DEFAULT 'monthly',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.fee_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  fine numeric NOT NULL DEFAULT 0,
  paid numeric NOT NULL DEFAULT 0,
  paid_amount numeric GENERATED ALWAYS AS (paid) STORED,
  status text NOT NULL DEFAULT 'unpaid',
  due_date date, note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.fee_invoices(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  method text, note text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================ Library ============================
CREATE TABLE public.book_authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.book_publishers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.book_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  title text NOT NULL, isbn text,
  author_id uuid REFERENCES public.book_authors(id) ON DELETE SET NULL,
  publisher_id uuid REFERENCES public.book_publishers(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.book_categories(id) ON DELETE SET NULL,
  total_copies int NOT NULL DEFAULT 1,
  available_copies int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.book_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  borrowed_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz, returned_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================ Transport ============================
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  reg_no text NOT NULL, model text, capacity int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name text NOT NULL, phone text, license_no text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.transport_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_no text, driver_name text, driver_phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  route_id uuid REFERENCES public.transport_routes(id) ON DELETE CASCADE,
  name text NOT NULL, sequence int NOT NULL DEFAULT 1,
  pickup_time time, drop_time time,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.student_transport (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  route_id uuid REFERENCES public.transport_routes(id) ON DELETE SET NULL,
  pickup_point text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id)
);

-- ============================ Communication ============================
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  title text NOT NULL, body text, audience text DEFAULT 'all',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL, read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================ Platform ============================
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL, entity text, entity_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid UNIQUE REFERENCES public.schools(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'trial',
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz, ends_at timestamptz,
  seats int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================ GRANTS + RLS + auto-school-id ============================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'classes','sections','subjects','academic_sessions',
    'students','teachers','parents','parent_students',
    'teacher_assignments','timetable','attendance',
    'homework','homework_submissions','exams','exam_results',
    'fee_structures','fee_invoices','fee_payments',
    'book_authors','book_publishers','book_categories','books','book_loans',
    'vehicles','drivers','transport_routes','route_stops','student_transport',
    'announcements','audit_logs','subscriptions'
  ]) LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "school scoped" ON public.%I FOR ALL TO authenticated '
      || 'USING (school_id = public.current_school_id() OR public.has_role(auth.uid(),''super_admin'')) '
      || 'WITH CHECK (school_id = public.current_school_id() OR public.has_role(auth.uid(),''super_admin''))', t);
    EXECUTE format(
      'CREATE TRIGGER fill_school_id_bi BEFORE INSERT ON public.%I '
      || 'FOR EACH ROW EXECUTE FUNCTION public.fill_school_id()', t);
  END LOOP;
END $$;

-- messages: sender/recipient scoped
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages" ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "update own messages" ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

-- Subscriptions: super_admin only writes; all authenticated can read their own school
DROP POLICY "school scoped" ON public.subscriptions;
CREATE POLICY "subs read same school" ON public.subscriptions FOR SELECT TO authenticated
  USING (school_id = public.current_school_id() OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "subs super manage" ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- Audit logs: admins read; inserts done via SECURITY DEFINER function
DROP POLICY "school scoped" ON public.audit_logs;
CREATE POLICY "audit read" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')
         OR (school_id = public.current_school_id() AND public.has_role(auth.uid(),'school_admin')));

-- updated_at triggers where applicable
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'classes','sections','subjects','academic_sessions',
    'students','teachers','parents',
    'homework','homework_submissions','fee_invoices','subscriptions'
  ]) LOOP
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I '
                || 'FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;

-- ============================ Reference RPCs used by app ============================
CREATE OR REPLACE FUNCTION public.delete_class_if_unreferenced(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.sections WHERE class_id = _id)
     OR EXISTS (SELECT 1 FROM public.students WHERE class_id = _id)
     OR EXISTS (SELECT 1 FROM public.timetable WHERE class_id = _id)
     OR EXISTS (SELECT 1 FROM public.exams WHERE class_id = _id) THEN
    RAISE EXCEPTION 'Class is referenced by other records';
  END IF;
  DELETE FROM public.classes WHERE id = _id;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_section_if_unreferenced(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.students WHERE section_id = _id)
     OR EXISTS (SELECT 1 FROM public.timetable WHERE section_id = _id)
     OR EXISTS (SELECT 1 FROM public.teacher_assignments WHERE section_id = _id) THEN
    RAISE EXCEPTION 'Section is referenced by other records';
  END IF;
  DELETE FROM public.sections WHERE id = _id;
END; $$;

CREATE OR REPLACE FUNCTION public.set_current_session(_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s_school uuid;
BEGIN
  SELECT school_id INTO s_school FROM public.academic_sessions WHERE id = _session_id;
  IF s_school IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
  UPDATE public.academic_sessions SET is_current = false WHERE school_id = s_school;
  UPDATE public.academic_sessions SET is_current = true  WHERE id = _session_id;
END; $$;

REVOKE ALL ON FUNCTION public.delete_class_if_unreferenced(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_section_if_unreferenced(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_current_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_class_if_unreferenced(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_section_if_unreferenced(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_current_session(uuid) TO authenticated, service_role;
