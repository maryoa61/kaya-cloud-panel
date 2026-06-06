// Kaya Cloud Panel - Backend Worker (worker.js)
// Secured with Bearer Token & Connected to KAYA_KV

const SECURITY_TOKEN = "kayamavy";
const DEFAULT_KEY = "mavy";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Handle CORS Preflight Requests
    if (request.method === "OPTIONS") {
      return handleCORS();
    }

    // 2. Route: Save Data (POST) - From Web Panel
    if (request.method === "POST" && url.pathname === "/update") {
      try {
        // Check Authentication
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== SECURITY_TOKEN) {
          return new Response(JSON.stringify({ success: false, error: "Unauthorized Token!" }), {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders() }
          });
        }

        const body = await request.json();
        const key = body.key || DEFAULT_KEY;
        const value = body.value; // Expected Base64 Subscription Data

        if (!value) {
          return new Response(JSON.stringify({ success: false, error: "Data value is empty!" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders() }
          });
        }

        // Check KV Binding
        if (!env.KAYA_KV) {
          return new Response(JSON.stringify({ success: false, error: "KAYA_KV Binding not found in Cloudflare!" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders() }
          });
        }

        // Save into Cloudflare KV
        await env.KAYA_KV.put(key, value);

        return new Response(JSON.stringify({ success: true, message: `Sub successfully updated for key: ${key}` }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders() }
        });

      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders() }
        });
      }
    }

    // 3. Route: Get Subscription (GET) - From V2ray/Hiddify Client
    const idParam = url.searchParams.get("id") || url.searchParams.get("sub");
    if (request.method === "GET" && (idParam || url.pathname === `/${DEFAULT_KEY}`)) {
      const targetKey = idParam || DEFAULT_KEY;

      if (!env.KAYA_KV) {
        return new Response("Error: KAYA_KV Binding missing on Cloudflare side.", { status: 500 });
      }

      const subData = await env.KAYA_KV.get(targetKey);
      if (!subData) {
        return new Response("Error: No subscription data found for this key. Please update via panel first.", { status: 404 });
      }

      // Return raw Base64 data with correct headers for v2ray clients
      return new Response(subData, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Subscription-Userinfo": "upload=0; download=0; total=10995116277760; expire=0" // Fake 10TB Data Info
        }
      });
    }

    // 4. Default Fallback
    return new Response("Kaya Cloud Storage Worker is Running smoothly. Access via Panel or Subscription Link.", {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
};

// Helper CORS Headers
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}

function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}
