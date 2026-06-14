import { withCors } from './cors.ts';

export type EdgeErrorCode =
  | 'BAD_REQUEST'
  | 'CONFIGURATION'
  | 'GEMINI_UNAVAILABLE'
  | 'INTERNAL'
  | 'METHOD_NOT_ALLOWED'
  | 'QUOTA_EXCEEDED'
  | 'TIMEOUT'
  | 'VALIDATION';

export type EdgeSuccess<T> = {
  ok: true;
  data: T;
};

export type EdgeFailure = {
  ok: false;
  code: EdgeErrorCode;
  error: string;
};

export type EdgeEnvelope<T> = EdgeSuccess<T> | EdgeFailure;

export function jsonOk<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, data } satisfies EdgeSuccess<T>), {
    status,
    headers: withCors({ 'Content-Type': 'application/json' }),
  });
}

export function jsonError(code: EdgeErrorCode, error: string, status = 500): Response {
  return new Response(JSON.stringify({ ok: false, code, error } satisfies EdgeFailure), {
    status,
    headers: withCors({ 'Content-Type': 'application/json' }),
  });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new Error('INVALID_JSON');
  }
}
