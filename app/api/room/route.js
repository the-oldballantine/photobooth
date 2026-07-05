import { Redis } from "@upstash/redis";

const kv = Redis.fromEnv();

const TOTAL_SHOTS = 4;
// Rooms expire automatically after 6 hours so old sessions don't pile up.
const ROOM_TTL_SECONDS = 6 * 60 * 60;

function keyFor(code) {
  return `room:${code}`;
}

async function readRoom(code) {
  const data = await kv.hgetall(keyFor(code));
  if (!data || Object.keys(data).length === 0) return null;
  const shots = [];
  for (let i = 0; i < TOTAL_SHOTS; i++) {
    shots.push({
      host: data[`shot_${i}_host`] || null,
      partner: data[`shot_${i}_partner`] || null,
    });
  }
  return {
    status: data.status || "lobby",
    currentShot: data.currentShot !== undefined && data.currentShot !== "" ? Number(data.currentShot) : 0,
    countdownStart: data.countdownStart ? Number(data.countdownStart) : null,
    partnerJoined: data.partnerJoined === "true" || data.partnerJoined === true,
    shots,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) {
    return Response.json({ error: "code is required" }, { status: 400 });
  }
  try {
    const room = await readRoom(code);
    return Response.json({ room });
  } catch (e) {
    console.error("GET /api/room failed:", e);
    return Response.json({ error: `storage read failed: ${e.message}` }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, action } = body;
    if (!code || !action) {
      return Response.json({ error: "code and action are required" }, { status: 400 });
    }
    const key = keyFor(code);

    if (action === "create") {
      const { room } = body;
      const fields = {
        status: room.status,
        currentShot: room.currentShot,
        countdownStart: room.countdownStart ?? "",
        partnerJoined: room.partnerJoined ? "true" : "false",
      };
      for (let i = 0; i < TOTAL_SHOTS; i++) {
        fields[`shot_${i}_host`] = room.shots[i]?.host || "";
        fields[`shot_${i}_partner`] = room.shots[i]?.partner || "";
      }
      await kv.hset(key, fields);
      await kv.expire(key, ROOM_TTL_SECONDS);
      const freshRoom = await readRoom(code);
      return Response.json({ ok: true, room: freshRoom });
    }

    if (action === "join") {
      const exists = await kv.hlen(key);
      if (!exists) {
        return Response.json({ error: "room not found" }, { status: 404 });
      }
      await kv.hset(key, { partnerJoined: "true" });
      await kv.expire(key, ROOM_TTL_SECONDS);
      const freshRoom = await readRoom(code);
      return Response.json({ ok: true, room: freshRoom });
    }

    if (action === "shot") {
      // Atomic: writes only this device's photo field, so host and partner
      // submitting at the same instant never clobber each other.
      const { shotIndex, role, dataUrl } = body;
      if (shotIndex === undefined || !role) {
        return Response.json({ error: "shotIndex and role are required" }, { status: 400 });
      }
      await kv.hset(key, {
        status: "shooting",
        [`shot_${shotIndex}_${role}`]: dataUrl || "",
      });
      await kv.expire(key, ROOM_TTL_SECONDS);
      const freshRoom = await readRoom(code);
      return Response.json({ ok: true, room: freshRoom });
    }

    if (action === "advance") {
      const { status, currentShot, countdownStart } = body;
      const fields = {};
      if (status !== undefined) fields.status = status;
      if (currentShot !== undefined) fields.currentShot = currentShot;
      fields.countdownStart = countdownStart ?? "";
      await kv.hset(key, fields);
      await kv.expire(key, ROOM_TTL_SECONDS);
      const freshRoom = await readRoom(code);
      return Response.json({ ok: true, room: freshRoom });
    }

    return Response.json({ error: `unknown action: ${action}` }, { status: 400 });
  } catch (e) {
    console.error("POST /api/room failed:", e);
    return Response.json({ error: `storage write failed: ${e.message}` }, { status: 500 });
  }
}
