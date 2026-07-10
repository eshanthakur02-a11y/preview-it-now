-- Lock down helper functions so anonymous visitors cannot execute security-definer actions
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_school_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_school(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, uuid, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_attendance_bulk(date, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_invoices_for_structure(uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_exam_published(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.issue_book(uuid, uuid, text, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.return_book(uuid, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_class_if_unreferenced(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_section_if_unreferenced(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_current_session(uuid) TO authenticated, service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'book_loans_borrower_user_id_fkey'
  ) THEN
    ALTER TABLE public.book_loans
      ADD CONSTRAINT book_loans_borrower_user_id_fkey
      FOREIGN KEY (borrower_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;