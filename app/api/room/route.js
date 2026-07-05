import { Redis } from "@upstash/redis";

const kv = Redis.fromEnv();

// Rooms expire automatically after 6 hours so old sessions don't pile up.
const ROOM_TTL_SECONDS = 6 * 60 * 60;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) {
    return Response.json({ error: "code is required" }, { status: 400 });
  }
  try {
    const room = await kv.get(`room:${code}`);
    return Response.json({ room: room || null });
  } catch (e) {
    console.error("GET /api/room failed:", e);
    return Response.json({ error: `storage read failed: ${e.message}` }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { code, room } = await request.json();
    if (!code || !room) {
      return Response.json({ error: "code and room are required" }, { status: 400 });
    }
    await kv.set(`room:${code}`, room, { ex: ROOM_TTL_SECONDS });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("POST /api/room failed:", e);
    return Response.json({ error: `storage write failed: ${e.message}` }, { status: 500 });
  }
}
