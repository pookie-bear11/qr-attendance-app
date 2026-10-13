import { supabase } from './supabase';
import { parseQRPayload } from './qr';

export type TeacherEventAttendance = {
  eventId: string;
  eventCode: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendeeCount: number;
  attendees: {
    studentId: string;
    studentName: string | null;
    scannedAt: string;
    status: string;
  }[];
};

export async function getTeacherEventAttendance(
  teacherId: string
): Promise<TeacherEventAttendance[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title, start_time, end_time')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError) {
    console.error('[getTeacherEventAttendance] Event error:', eventError.message);
    throw new Error(eventError.message);
  }

  if (!events || events.length === 0) {
    return [];
  }

  const eventIds = events.map((event) => event.id);

  const { data: attendance, error: attError } = await supabase
    .from('attendance')
    .select(`
      student_id,
      scanned_at,
      status,
      event_id,
      profiles!attendance_student_id_fkey (
        full_name,
        email
      )
    `)
    .in('event_id', eventIds)
    .order('scanned_at', { ascending: false });

  if (attError) {
    console.error(
      '[getTeacherEventAttendance] Attendance error:',
      attError.message
    );
    throw new Error(attError.message);
  }

  if (!attendance) {
    return [];
  }

  return events.map((event) => {
    const rows = attendance.filter(
      (row) => row.event_id === event.id
    );

    return {
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      startTime: event.start_time,
      endTime: event.end_time,
      attendeeCount: rows.length,
      attendees: rows.map((row: any) => ({
        studentId: row.student_id,
        studentName: row.profiles?.full_name ?? null,
        scannedAt: row.scanned_at,
        status: row.status ?? 'present',
      })),
    };
  });
}

export async function getTeacherEventSummary(
  teacherId: string
): Promise<
  {
    eventId: string;
    eventCode: string;
    title: string;
    attendeeCount: number;
  }[]
> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError) {
    console.error('[getTeacherEventSummary] Event error:', eventError.message);
    throw new Error(eventError.message);
  }

  if (!events || events.length === 0) {
    return [];
  }

  const eventIds = events.map((event) => event.id);

  const { data: attRows, error: attError } = await supabase
    .from('attendance')
    .select('event_id')
    .in('event_id', eventIds);

  if (attError) {
    console.error(
      '[getTeacherEventSummary] Attendance error:',
      attError.message
    );
    throw new Error(attError.message);
  }

  const counts: Record<string, number> = {};

  (attRows ?? []).forEach((row) => {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
  });

  return events.map((event) => ({
    eventId: event.id,
    eventCode: event.event_code,
    title: event.title,
    attendeeCount: counts[event.id] ?? 0,
  }));
}

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
  status: string;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

type AttendanceRpcResult = {
  success: boolean;
  message: string;
  event_title: string | null;
  scanned_at: string | null;
};

function isAttendanceRpcResult(
  value: unknown
): value is AttendanceRpcResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof value.success === 'boolean' &&
    'message' in value &&
    typeof value.message === 'string' &&
    'event_title' in value &&
    (typeof value.event_title === 'string' ||
      value.event_title === null) &&
    'scanned_at' in value &&
    (typeof value.scanned_at === 'string' ||
      value.scanned_at === null)
  );
}

export async function registerAttendance(
  rawPayload: string
): Promise<RegisterResult> {
  try {
    const parsed = parseQRPayload(rawPayload);

    if (!parsed.ok) {
      return {
        success: false,
        message: parsed.message,
      };
    }

    const { data, error } = await supabase
      .rpc('register_attendance', {
        p_event_code: parsed.payload.event,
      })
      .maybeSingle();

    if (error) {
      console.error(
        '[registerAttendance] RPC error:',
        error.message,
        error.code
      );

      return {
        success: false,
        message:
          error.code === '23505'
            ? 'Already registered for this event.'
            : error.message,
      };
    }

    if (!isAttendanceRpcResult(data)) {
      console.error('[registerAttendance] RPC returned an invalid result.');
      return {
        success: false,
        message: 'Unable to record attendance. Please try again.',
      };
    }

    return {
      success: data.success,
      message: data.message,
      eventTitle: data.event_title ?? undefined,
    };
  } catch (error) {
    console.error('[registerAttendance] Unexpected error:', error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Unable to record attendance. Please try again.',
    };
  }
}

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, scanned_at, status, events ( event_code, title )')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });

  if (error) {
    console.error('[getAttendanceHistory] Error:', error.message);
    throw new Error(error.message);
  }

  if (!data) {
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    eventId: row.events?.event_code ?? '',
    eventTitle: row.events?.title ?? '',
    scannedAt: row.scanned_at,
    status: row.status ?? 'present',
  }));
}