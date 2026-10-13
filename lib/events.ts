import { supabase } from './supabase';

export type Event = {
  eventId: string;
  title: string;
  start: string;
  end: string;
  venue: string;
  description: string;
};

export type CloudEvent = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  description: string | null;
  status: 'open' | 'closed';
  created_by: string | null;
  created_at: string;
};

/**
 * Create an event without overwriting an existing event code.
 */
export async function createEvent(
  event: Event
): Promise<{ error: string | null; event: CloudEvent | null }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('[createEvent] Auth error:', userError.message);
    return { error: userError.message, event: null };
  }

  if (!user) {
    return { error: 'Please log in to create an event.', event: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[createEvent] Profile error:', profileError.message);
    return { error: profileError.message, event: null };
  }

  if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
    return {
      error: 'Only teachers and administrators can create events.',
      event: null,
    };
  }

  const { data, error } = await supabase.from('events').insert(
    {
      event_code: event.eventId,
      title: event.title,
      start_time: event.start || null,
      end_time: event.end || null,
      venue: event.venue.trim() || null,
      description: event.description.trim() || null,
      status: 'open',
      created_by: user.id,
    }
  ).select('*').single();

  if (error) {
    console.error('[createEvent] Supabase error:', error.message);
    return { error: error.message, event: null };
  }

  return { error: null, event: data as CloudEvent };
}

/**
 * Get events created by a specific teacher.
 */
export async function getEventsByTeacher(
  teacherId: string
): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getEventsByTeacher] Supabase error:', error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as CloudEvent[];
}

/**
 * Get one event using its event code.
 * Throws an error when Supabase returns a query error.
 */
export async function getEventByCode(
  code: string
): Promise<CloudEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_code', code)
    .maybeSingle();

  if (error) {
    console.error('[getEventByCode] Supabase error:', error.message);
    throw new Error(error.message);
  }

  return data as CloudEvent | null;
}

/**
 * Get all events.
 */
export async function getAllEvents(): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getAllEvents] Supabase error:', error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as CloudEvent[];
}

/**
 * Update an existing event using its database ID.
 */
export async function updateEvent(
  eventId: string,
  updates: {
    event_code?: string;
    title?: string;
    start_time?: string | null;
    end_time?: string | null;
    venue?: string | null;
    description?: string | null;
    status?: 'open' | 'closed';
  }
): Promise<{ error: string | null }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('[updateEvent] Auth error:', userError.message);
    return { error: userError.message };
  }

  if (!user) {
    return { error: 'Please log in to update an event.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[updateEvent] Profile error:', profileError.message);
    return { error: profileError.message };
  }

  if (profile?.role !== 'admin') {
    return { error: 'Only administrators can update events.' };
  }

  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', eventId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[updateEvent] Supabase error:', error.message);
    return { error: error.message };
  }

  if (!data) {
    return {
      error: 'The event was not found or you are not authorized to update it.',
    };
  }

  return { error: null };
}
