import { Redis } from "@upstash/redis";

export async function GET() {
  const hasUrl = !!(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL);
  const hasToken = !!(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN);

  let pingResult = null;
  let pingError = null;
  try {
    const kv = Redis.fromEnv();
    await kv.set("debug:ping", Date.now());
    pingResult = await kv.get("debug:ping");
  } catch (e) {
    pingError = e.message;
  }

  return Response.json({ hasUrl, hasToken, pingResult, pingError });
}
