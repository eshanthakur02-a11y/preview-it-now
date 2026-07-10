-- Dashboard compatibility and action functions

-- Notifications: add kind for filtering/badges
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'system';

-- Homework: add fields used by teacher/student/parent dashboards
ALTER TABLE public.homework
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.homework_submissions
  ADD COLUMN IF NOT EXISTS marks numeric,
  ADD COLUMN IF NOT EXISTS feedback text,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Fee setup/invoices: add fields used by the UI and invoice generation
ALTER TABLE public.fee_structures
  ADD COLUMN IF NOT EXISTS due_day integer,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.fee_invoices
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS structure_id uuid REFERENCES public.fee_structures(id) ON DELETE SET NULL;

UPDATE public.fee_invoices
SET title = COALESCE(title, note, 'Fee Invoice')
WHERE title IS NULL;

ALTER TABLE public.fee_invoices
  ALTER COLUMN title SET DEFAULT 'Fee Invoice',
  ALTER COLUMN title SET NOT NULL;

-- Fee payments: add optional compatibility columns for student self-pay screens and reports
ALTER TABLE public.fee_payments
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fee_id uuid,
  ADD COLUMN IF NOT EXISTS amount_paid numeric,
  ADD COLUMN IF NOT EXISTS reference text;

UPDATE public.fee_payments
SET amount_paid = COALESCE(amount_paid, amount)
WHERE amount_paid IS NULL;

-- Book loans: add borrower/fine aliases used by library dashboards
ALTER TABLE public.book_loans
  ADD COLUMN IF NOT EXISTS borrower_user_id uuid,
  ADD COLUMN IF NOT EXISTS borrower_role text,
  ADD COLUMN IF NOT EXISTS issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS fine_amount numeric NOT NULL DEFAULT 0;

UPDATE public.book_loans
SET issued_at = COALESCE(issued_at, borrowed_at)
WHERE issued_at IS NULL;

-- Audit compatibility: UI reads actor_user_id while older table has actor_id
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_user_id uuid;

UPDATE public.audit_logs
SET actor_user_id = COALESCE(actor_user_id, actor_id)
WHERE actor_user_id IS NULL;

-- Fee discounts and fines used by admin/accountant fee setup tabs
CREATE TABLE IF NOT EXISTS public.fee_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'flat',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_discounts TO authenticated;
GRANT ALL ON public.fee_discounts TO service_role;
ALTER TABLE public.fee_discounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "school scoped" ON public.fee_discounts;
CREATE POLICY "school scoped" ON public.fee_discounts
FOR ALL TO authenticated
USING (school_id = public.current_school_id() OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (school_id = public.current_school_id() OR public.has_role(auth.uid(), 'super_admin'));
DROP TRIGGER IF EXISTS fill_school_id_fee_discounts ON public.fee_discounts;
CREATE TRIGGER fill_school_id_fee_discounts BEFORE INSERT ON public.fee_discounts
FOR EACH ROW EXECUTE FUNCTION public.fill_school_id();
DROP TRIGGER IF EXISTS update_fee_discounts_updated_at ON public.fee_discounts;
CREATE TRIGGER update_fee_discounts_updated_at BEFORE UPDATE ON public.fee_discounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.fee_fines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  per_day_amount numeric NOT NULL DEFAULT 0,
  grace_days integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_fines TO authenticated;
GRANT ALL ON public.fee_fines TO service_role;
ALTER TABLE public.fee_fines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "school scoped" ON public.fee_fines;
CREATE POLICY "school scoped" ON public.fee_fines
FOR ALL TO authenticated
USING (school_id = public.current_school_id() OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (school_id = public.current_school_id() OR public.has_role(auth.uid(), 'super_admin'));
DROP TRIGGER IF EXISTS fill_school_id_fee_fines ON public.fee_fines;
CREATE TRIGGER fill_school_id_fee_fines BEFORE INSERT ON public.fee_fines
FOR EACH ROW EXECUTE FUNCTION public.fill_school_id();
DROP TRIGGER IF EXISTS update_fee_fines_updated_at ON public.fee_fines;
CREATE TRIGGER update_fee_fines_updated_at BEFORE UPDATE ON public.fee_fines
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure fill-school triggers exist for core tables (the previous migration said they existed but DB has none)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'academic_sessions','announcements','attendance','book_authors','book_categories','book_loans','book_publishers','books',
    'classes','drivers','exam_results','exams','fee_invoices','fee_payments','fee_structures','homework','homework_submissions',
    'parents','route_stops','sections','student_transport','students','subjects','teacher_assignments','teachers','timetable',
    'transport_routes','vehicles'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS fill_school_id_%I ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER fill_school_id_%I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fill_school_id()', t, t);
  END LOOP;
END $$;

-- Keep payment compatibility fields in sync
CREATE OR REPLACE FUNCTION public.sync_fee_payment_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE inv record;
BEGIN
  IF NEW.amount_paid IS NULL THEN NEW.amount_paid := NEW.amount; END IF;
  IF NEW.amount IS NULL THEN NEW.amount := COALESCE(NEW.amount_paid, 0); END IF;
  IF NEW.invoice_id IS NOT NULL THEN
    SELECT student_id, school_id INTO inv FROM public.fee_invoices WHERE id = NEW.invoice_id;
    IF NEW.student_id IS NULL THEN NEW.student_id := inv.student_id; END IF;
    IF NEW.school_id IS NULL THEN NEW.school_id := inv.school_id; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sync_fee_payment_fields_trigger ON public.fee_payments;
CREATE TRIGGER sync_fee_payment_fields_trigger BEFORE INSERT OR UPDATE ON public.fee_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_fee_payment_fields();

-- Realtime/app notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid,
  _kind text DEFAULT 'system',
  _title text DEFAULT '',
  _body text DEFAULT NULL,
  _school_id uuid DEFAULT NULL,
  _link text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE nid uuid;
BEGIN
  INSERT INTO public.notifications(user_id, kind, title, body, link)
  VALUES (_user_id, COALESCE(NULLIF(_kind, ''), 'system'), COALESCE(NULLIF(_title, ''), 'Notification'), _body, _link)
  RETURNING id INTO nid;
  RETURN nid;
END;
$$;
REVOKE ALL ON FUNCTION public.create_notification(uuid, text, text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, uuid, text) TO authenticated, service_role;

-- Real audit logging with optional params (also supports old call sites)
CREATE OR REPLACE FUNCTION public.log_audit(
  _action text,
  _entity text DEFAULT NULL,
  _entity_id uuid DEFAULT NULL,
  _school_id uuid DEFAULT NULL,
  _meta jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE sid uuid;
BEGIN
  sid := COALESCE(_school_id, public.current_school_id());
  INSERT INTO public.audit_logs(school_id, actor_id, actor_user_id, action, entity, entity_id, meta)
  VALUES (sid, auth.uid(), auth.uid(), _action, _entity, _entity_id, COALESCE(_meta, '{}'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.log_audit(text, text, uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, uuid, uuid, jsonb) TO authenticated, service_role;

-- Bulk attendance save
CREATE OR REPLACE FUNCTION public.mark_attendance_bulk(
  _date date,
  _section_id uuid,
  _entries jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE sid uuid;
DECLARE n integer;
BEGIN
  SELECT school_id INTO sid FROM public.sections WHERE id = _section_id;
  IF sid IS NULL THEN RAISE EXCEPTION 'Section not found'; END IF;
  IF NOT (sid = public.current_school_id() OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO public.attendance(school_id, student_id, section_id, date, status)
  SELECT sid, (e->>'student_id')::uuid, _section_id, _date, COALESCE(NULLIF(e->>'status', ''), 'present')
  FROM jsonb_array_elements(COALESCE(_entries, '[]'::jsonb)) e
  ON CONFLICT (student_id, date) DO UPDATE
    SET status = EXCLUDED.status,
        section_id = EXCLUDED.section_id,
        school_id = EXCLUDED.school_id;

  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM public.log_audit('attendance.bulk_save', 'attendance', NULL, sid, jsonb_build_object('date', _date, 'section_id', _section_id, 'count', n));
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_attendance_bulk(date, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_attendance_bulk(date, uuid, jsonb) TO authenticated, service_role;

-- Fee invoice generation from structures
CREATE OR REPLACE FUNCTION public.generate_invoices_for_structure(
  _structure_id uuid,
  _due_date date DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE fs record;
DECLARE n integer;
DECLARE due date;
BEGIN
  SELECT * INTO fs FROM public.fee_structures WHERE id = _structure_id;
  IF fs.id IS NULL THEN RAISE EXCEPTION 'Fee structure not found'; END IF;
  IF NOT (fs.school_id = public.current_school_id() OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  due := COALESCE(
    _due_date,
    CASE
      WHEN fs.due_day IS NOT NULL THEN make_date(EXTRACT(year FROM now())::int, EXTRACT(month FROM now())::int, LEAST(fs.due_day, 28))
      ELSE (now()::date + interval '30 days')::date
    END
  );

  INSERT INTO public.fee_invoices(school_id, student_id, structure_id, title, amount, discount, fine, paid, paid_amount, status, due_date, note)
  SELECT s.school_id, s.id, fs.id, fs.name, fs.amount, 0, 0, 0, 0, 'pending', due, fs.frequency
  FROM public.students s
  WHERE s.school_id = fs.school_id
    AND s.status = 'active'
    AND (fs.class_id IS NULL OR s.class_id = fs.class_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.fee_invoices i
      WHERE i.student_id = s.id AND i.structure_id = fs.id AND i.due_date IS NOT DISTINCT FROM due
    );

  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM public.log_audit('fees.generate_invoices', 'fee_structures', fs.id, fs.school_id, jsonb_build_object('count', n, 'due_date', due));
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.generate_invoices_for_structure(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_invoices_for_structure(uuid, date) TO authenticated, service_role;

-- Exam publish toggle
CREATE OR REPLACE FUNCTION public.set_exam_published(_exam_id uuid, _published boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE sid uuid;
BEGIN
  SELECT school_id INTO sid FROM public.exams WHERE id = _exam_id;
  IF sid IS NULL THEN RAISE EXCEPTION 'Exam not found'; END IF;
  IF NOT (sid = public.current_school_id() OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.exams SET is_published = _published WHERE id = _exam_id;
  PERFORM public.log_audit(CASE WHEN _published THEN 'exam.published' ELSE 'exam.unpublished' END, 'exams', _exam_id, sid, '{}'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.set_exam_published(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_exam_published(uuid, boolean) TO authenticated, service_role;

-- Library issue/return actions
CREATE OR REPLACE FUNCTION public.issue_book(
  _book_id uuid,
  _borrower_user_id uuid,
  _borrower_role text,
  _due_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE b record;
DECLARE sid uuid;
DECLARE stu uuid;
DECLARE loan_id uuid;
BEGIN
  SELECT * INTO b FROM public.books WHERE id = _book_id;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Book not found'; END IF;
  IF b.available_copies <= 0 THEN RAISE EXCEPTION 'No copies available'; END IF;
  IF NOT (b.school_id = public.current_school_id() OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  sid := b.school_id;
  SELECT id INTO stu FROM public.students WHERE user_id = _borrower_user_id AND school_id = sid LIMIT 1;

  INSERT INTO public.book_loans(school_id, book_id, student_id, borrower_user_id, borrower_role, borrowed_at, issued_at, due_at, status)
  VALUES (sid, _book_id, stu, _borrower_user_id, COALESCE(_borrower_role, 'student'), now(), now(), _due_at, 'issued')
  RETURNING id INTO loan_id;

  UPDATE public.books SET available_copies = GREATEST(available_copies - 1, 0) WHERE id = _book_id;
  PERFORM public.log_audit('library.issue', 'book_loans', loan_id, sid, jsonb_build_object('book_id', _book_id, 'borrower_user_id', _borrower_user_id));
  RETURN loan_id;
END;
$$;
REVOKE ALL ON FUNCTION public.issue_book(uuid, uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_book(uuid, uuid, text, timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.return_book(_loan_id uuid, _fine_per_day numeric DEFAULT 0)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE l record;
DECLARE fine numeric := 0;
BEGIN
  SELECT * INTO l FROM public.book_loans WHERE id = _loan_id;
  IF l.id IS NULL THEN RAISE EXCEPTION 'Loan not found'; END IF;
  IF NOT (l.school_id = public.current_school_id() OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF l.returned_at IS NOT NULL THEN RETURN; END IF;

  IF l.due_at IS NOT NULL AND now() > l.due_at THEN
    fine := GREATEST(0, CEIL(EXTRACT(epoch FROM (now() - l.due_at)) / 86400.0)) * COALESCE(_fine_per_day, 0);
  END IF;

  UPDATE public.book_loans
  SET returned_at = now(), status = 'returned', fine_amount = fine
  WHERE id = _loan_id;

  UPDATE public.books SET available_copies = available_copies + 1 WHERE id = l.book_id;
  PERFORM public.log_audit('library.return', 'book_loans', _loan_id, l.school_id, jsonb_build_object('fine', fine));
END;
$$;
REVOKE ALL ON FUNCTION public.return_book(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.return_book(uuid, numeric) TO authenticated, service_role;

-- Helpful compatibility indexes
CREATE INDEX IF NOT EXISTS idx_homework_created_by ON public.homework(created_by);
CREATE INDEX IF NOT EXISTS idx_book_loans_borrower_user_id ON public.book_loans(borrower_user_id);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_structure_due ON public.fee_invoices(structure_id, due_date);
CREATE INDEX IF NOT EXISTS idx_fee_payments_paid_at ON public.fee_payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_kind ON public.notifications(user_id, kind, read_at);
