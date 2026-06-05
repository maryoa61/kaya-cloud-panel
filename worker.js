export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const url = new URL(request.url);

    // ۱. دریافت کانفیگ‌ها توسط نرم‌افزارها (GET)
    if (request.method === "GET") {
      const id = url.searchParams.get("id");
      if (!id) return new Response("Missing ID", { status: 400 });

      // کلمه KAYA_KV نام متغیر متصل شده به حافظه کلودفلر شماست
      const subData = await env.KAYA_KV.get(id);
      if (!subData) return new Response("Not Found", { status: 404 });

      return new Response(subData, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // ۲. تزریق و آپدیت کانفیگ‌ها از پنل وب (POST)
    if (request.method === "POST") {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || authHeader !== "Bearer kayamavy") {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      }

      try {
        const body = await request.json();
        const { configs, key } = body;

        if (!configs || !key) return new Response("Invalid Data", { status: 400 });

        await env.KAYA_KV.put(key, configs);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    return new Response("Method not allowed", { status: 405 });
  },
};
