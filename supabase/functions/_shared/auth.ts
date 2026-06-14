type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

function decodeBase64Url(value: string): string {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
}

export function requireAuthenticatedUser(req: Request): AuthResult {
  const authorization = req.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : '';
  const payloadPart = token.split('.')[1];

  if (!payloadPart) {
    return { ok: false, error: 'Authentication required.' };
  }

  try {
    const payload = JSON.parse(decodeBase64Url(payloadPart)) as {
      role?: unknown;
      sub?: unknown;
    };

    if (payload.role !== 'authenticated' || typeof payload.sub !== 'string' || !payload.sub) {
      return { ok: false, error: 'Authentication required.' };
    }

    return { ok: true, userId: payload.sub };
  } catch {
    return { ok: false, error: 'Authentication required.' };
  }
}
