import * as SQLite from 'expo-sqlite';

import { supabase } from './supabase';

export type AttendanceRecord = {
  id: number;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
};

export type Event = {
  eventId: string;
  title: string;
  start: string;
  end: string;
};

type EventPayload = {
  v: number;
  event: string;
  title?: string;
  start?: string;
  end?: string;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

/*
 * ============================================================
 * LOCAL SQLITE DATABASE
 * ============================================================
 */

let db: SQLite.SQLiteDatabase | null = null;

async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync(
      'qr-attendance.db'
    );

    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS events (
        eventId TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        start TEXT NOT NULL,
        end TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        studentId TEXT NOT NULL,
        eventId TEXT NOT NULL,
        scannedAt TEXT NOT NULL,
        UNIQUE (studentId, eventId)
      );
    `);
  }

  return db;
}

/*
 * ============================================================
 * STUDENT QR ATTENDANCE
 * ============================================================
 */

export async function registerAttendance(
  rawPayload: string,
  studentId: string
): Promise<RegisterResult> {
  let payload: EventPayload;

  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return {
      success: false,
      message: 'Invalid QR code.',
    };
  }

  if (payload.v !== 1 || !payload.event) {
    return {
      success: false,
      message: 'Not an attendance QR code.',
    };
  }

  const now = Date.now();

  const start = payload.start
    ? new Date(payload.start).getTime()
    : null;

  const end = payload.end
    ? new Date(payload.end).getTime()
    : null;

  if (start && now < start) {
    return {
      success: false,
      message: 'Event has not started yet.',
    };
  }

  if (end && now > end) {
    return {
      success: false,
      message: 'Event has already ended.',
    };
  }

  const database = await getDb();

  const title =
    payload.title ?? payload.event;

  await database.runAsync(
    `
      INSERT OR IGNORE INTO events
      (eventId, title, start, end)
      VALUES (?, ?, ?, ?)
    `,
    payload.event,
    title,
    payload.start ?? '',
    payload.end ?? ''
  );

  const result = await database.runAsync(
    `
      INSERT OR IGNORE INTO attendance
      (studentId, eventId, scannedAt)
      VALUES (?, ?, ?)
    `,
    studentId,
    payload.event,
    new Date().toISOString()
  );

  if (result.changes === 0) {
    return {
      success: false,
      message: 'Already registered for this event.',
      eventTitle: title,
    };
  }

  return {
    success: true,
    message: 'Attendance recorded!',
    eventTitle: title,
  };
}

/*
 * ============================================================
 * STUDENT LOCAL ATTENDANCE HISTORY
 * ============================================================
 */

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const database = await getDb();

  const rows =
    await database.getAllAsync<AttendanceRecord>(
      `
        SELECT
          a.id,
          a.eventId,
          e.title AS eventTitle,
          a.scannedAt
        FROM attendance a
        JOIN events e
          ON e.eventId = a.eventId
        WHERE a.studentId = ?
        ORDER BY a.scannedAt DESC
      `,
      studentId
    );

  return rows;
}

/*
 * ============================================================
 * LOCAL EVENT CREATION
 * ============================================================
 */

export async function createEvent(
  event: Event
): Promise<void> {
  const database = await getDb();

  await database.runAsync(
    `
      INSERT OR REPLACE INTO events
      (eventId, title, start, end)
      VALUES (?, ?, ?, ?)
    `,
    event.eventId,
    event.title,
    event.start,
    event.end
  );
}

/*
 * ============================================================
 * SUPABASE ADMIN ATTENDANCE
 * ============================================================
 */

export type AdminAttendanceRecord = {
  id: string;
  student_id: string;
  event_id: string;
  scanned_at: string | null;
  status: string | null;

  student_name: string | null;
  student_email: string | null;

  event_code: string | null;
  event_title: string | null;
};

/*
 * Get all attendance records from Supabase.
 *
 * Intended for Administrator accounts.
 */
export async function getAllAttendance(): Promise<
  AdminAttendanceRecord[]
> {
  const { data, error } = await supabase
    .from('attendance')
    .select(`
      id,
      student_id,
      event_id,
      scanned_at,
      status,
      profiles!attendance_student_id_fkey (
        full_name,
        email
      ),
      events!attendance_event_id_fkey (
        event_code,
        title
      )
    `)
    .order('scanned_at', {
      ascending: false,
    });

  if (error || !data) {
    return [];
  }

  return data.map((record: any) => ({
    id: record.id,
    student_id: record.student_id,
    event_id: record.event_id,
    scanned_at: record.scanned_at ?? null,
    status: record.status ?? null,

    student_name:
      record.profiles?.full_name ?? null,

    student_email:
      record.profiles?.email ?? null,

    event_code:
      record.events?.event_code ?? null,

    event_title:
      record.events?.title ?? null,
  }));
}

/*
 * ============================================================
 * ADMIN ATTENDANCE UPDATE
 * ============================================================
 */

export async function updateAttendance(
  attendanceId: string,
  updates: {
    status?: string;
    scanned_at?: string;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('attendance')
    .update(updates)
    .eq('id', attendanceId);

  return {
    error: error?.message ?? null,
  };
}

/*
 * ============================================================
 * ADMIN ATTENDANCE DELETE
 * ============================================================
 */

export async function deleteAttendance(
  attendanceId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('id', attendanceId);

  return {
    error: error?.message ?? null,
  };
}