import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const deviceId = req.headers.get("x-device-id") ?? "";
    if (!deviceId) return new Response("Missing x-device-id", { status: 400 });

    const { bird_id } = await req.json().catch(() => ({}));
    if (!bird_id) return new Response("Missing bird_id", { status: 400 });

    // Usa SÓLO claves de servicio. No propagamos el Authorization del request.
    const url =
      Deno.env.get("PROJECT_URL") ??
      Deno.env.get("IMAGINARIO_URL") ??
      Deno.env.get("SUPABASE_URL");
    const serviceKey =
      Deno.env.get("SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!url || !serviceKey) {
      return new Response("Missing service secrets", { status: 500 });
    }

    const sb = createClient(url, serviceKey);

    // Busca favorito actual (invitado: user_id null)
    const { data: rows, error: e1 } = await sb
      .from("favorites")
      .select("*")
      .eq("bird_id", bird_id)
      .is("user_id", null)
      .eq("device_id", deviceId)
      .order("updated_at", { ascending: false })
      .limit(1);
    if (e1) throw e1;

    if (rows && rows[0] && rows[0].deleted_at == null) {
      const { error } = await sb
        .from("favorites")
        .update({ deleted_at: Date.now() })
        .eq("id", rows[0].id);
      if (error) throw error;
      return new Response(JSON.stringify({ removed: true }), {
        headers: { "content-type": "application/json" },
      });
    } else {
      const { error } = await sb.from("favorites").insert({
        id: crypto.randomUUID(),
        bird_id,
        user_id: null,
        device_id: deviceId,
        updated_at: Date.now(),
        deleted_at: null,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ added: true }), {
        headers: { "content-type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
