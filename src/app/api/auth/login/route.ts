import { hashPassword, makeAuthCookie, isAuthEnabled } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { password } = (await request.json()) as { password?: string };

    if (!isAuthEnabled()) {
      // No password configured; always succeed
      return Response.json({ ok: true });
    }

    const appPassword = process.env.APP_PASSWORD!;

    if (!password || password !== appPassword) {
      return Response.json({ error: 'Incorrect password' }, { status: 401 });
    }

    const token = hashPassword(appPassword);
    return Response.json(
      { ok: true },
      { headers: { 'Set-Cookie': makeAuthCookie(token) } }
    );
  } catch {
    return Response.json({ error: 'Bad request' }, { status: 400 });
  }
}
