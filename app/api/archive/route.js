import { Redis } from "@upstash/redis";

const kv = Redis.fromEnv();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "6", 10);

    const keys = await kv.keys("archive:*");
    if (!keys || keys.length === 0) {
      return Response.json({ items: [] });
    }
    const recentKeys = keys.slice(-14);
    const items = [];
    for (const k of recentKeys) {
      try {
        const val = await kv.get(k);
        if (val) items.push(val);
      } catch (e) {}
    }
    items.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    return Response.json({ items: items.slice(0, limit) });
  } catch (e) {
    return Response.json({ items: [] });
  }
}

export async function POST(request) {
  try {
    const { code, room } = await request.json();
    if (!code || !room) {
      return Response.json({ error: "code and room are required" }, { status: 400 });
    }
    await kv.set(`archive:${code}`, {
      code,
      completedAt: Date.now(),
      shots: room.shots,
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "archive write failed" }, { status: 500 });
  }
}
