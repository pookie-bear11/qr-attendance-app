export type QRPayload = {
  v: 1;
  event: string;
  title?: string;
  start?: string;
  end?: string;
};

export function buildQRPayload(event: {
  eventId: string;
  title: string;
  start?: string;
  end?: string;
}): string {
  const payload: QRPayload = {
    v: 1,
    event: event.eventId,
  };

  if (event.title) payload.title = event.title;
  if (event.start) payload.start = event.start;
  if (event.end) payload.end = event.end;

  return JSON.stringify(payload);
}

export function formatManilaTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}+08:00`
  );
}

export function parseEventTimestamp(value: string): number {
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    return Date.parse(value);
  }

  const manilaLocalTimestamp = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00+08:00`
    : `${value}+08:00`;

  return Date.parse(manilaLocalTimestamp);
}

export type EventTimeValidation =
  | { valid: true }
  | {
      valid: false;
      message: 'Invalid event start time.' | 'Invalid event end time.' |
        'Event has not started yet.' | 'Event has already ended.';
    };

export function validateEventTime(
  startValue: string | undefined,
  endValue: string | undefined,
  now = Date.now()
): EventTimeValidation {
  const start = startValue ? parseEventTimestamp(startValue) : null;
  const end = endValue ? parseEventTimestamp(endValue) : null;

  if (start !== null && !Number.isFinite(start)) {
    return { valid: false, message: 'Invalid event start time.' };
  }

  if (end !== null && !Number.isFinite(end)) {
    return { valid: false, message: 'Invalid event end time.' };
  }

  if (start !== null && now < start) {
    return { valid: false, message: 'Event has not started yet.' };
  }

  if (end !== null && now > end) {
    return { valid: false, message: 'Event has already ended.' };
  }

  return { valid: true };
}

export type ParseQRResult =
  | { ok: true; payload: QRPayload }
  | { ok: false; message: string };

export function parseQRPayload(raw: string): ParseQRResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      message: 'Invalid QR code.',
    };
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('v' in parsed) ||
    parsed.v !== 1 ||
    !('event' in parsed) ||
    typeof parsed.event !== 'string' ||
    !parsed.event.trim() ||
    parsed.event.length > 200
  ) {
    return {
      ok: false,
      message: 'Not an attendance QR code.',
    };
  }

  const payload: QRPayload = {
    v: 1,
    event: parsed.event.trim(),
  };

  if ('title' in parsed && typeof parsed.title === 'string') {
    payload.title = parsed.title;
  }

  if ('start' in parsed && typeof parsed.start === 'string') {
    payload.start = parsed.start;
  }

  if ('end' in parsed && typeof parsed.end === 'string') {
    payload.end = parsed.end;
  }

  return {
    ok: true,
    payload,
  };
}