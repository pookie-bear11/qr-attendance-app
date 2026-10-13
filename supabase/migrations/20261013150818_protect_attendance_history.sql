-- Protect attendance history from deletion through the app API.
-- Prevent event deletion because attendance rows reference events.
-- Existing attendance records are not deleted or modified.

DROP POLICY IF EXISTS "Admins can delete attendance"
ON public.attendance;

DROP POLICY IF EXISTS "Admins can delete all events"
ON public.events;

REVOKE DELETE ON TABLE public.attendance
FROM PUBLIC, anon, authenticated;

REVOKE DELETE ON TABLE public.events
FROM PUBLIC, anon, authenticated;