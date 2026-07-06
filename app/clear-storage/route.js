import { Redis } from "@upstash/redis";

const kv = Redis.fromEnv();

function page({ title, message, ok }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #FFF6F1;
    font-family: 'Rubik', sans-serif;
    color: #3D2B2E;
  }
  .card {
    max-width: 420px;
    width: calc(100% - 48px);
    background: #fff;
    border-radius: 20px;
    padding: 32px 28px;
    text-align: center;
    box-shadow: 0 20px 40px -20px rgba(61,43,46,0.25);
  }
  .icon { font-size: 40px; margin-bottom: 12px; }
  h1 { font-size: 20px; margin: 0 0 10px; }
  p { font-size: 14px; line-height: 1.6; color: #6B4E52; margin: 0; }
  a {
    display: inline-block;
    margin-top: 20px;
    font-size: 13px;
    color: #E8628F;
    text-decoration: none;
    font-weight: 600;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">${ok ? "🌸" : "⚠️"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/">← back to photobooth</a>
  </div>
</body>
</html>`;
}

async function wipeAll() {
  const roomKeys = await kv.keys("room:*");
  const archiveKeys = await kv.keys("archive:*");
  const allKeys = [...roomKeys, ...archiveKeys];
  if (allKeys.length > 0) {
    await kv.del(...allKeys);
  }
  return allKeys.length;
}

export async function GET() {
  try {
    const deletedCount = await wipeAll();
    return new Response(
      page({
        title: "Storage cleared",
        message: `Removed ${deletedCount} saved item${deletedCount === 1 ? "" : "s"} — every stored photo and session has been deleted.`,
        ok: true,
      }),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (e) {
    console.error("GET /clear-storage failed:", e);
    return new Response(
      page({
        title: "Couldn't clear storage",
        message: `Something went wrong: ${e.message}`,
        ok: false,
      }),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
