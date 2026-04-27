import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CRITICAL_WORDS = [
  "sangramento", "sangrando", "hematoma", "secreção", "paralisia",
  "sangue", "febre", "pus", "abertura", "hemorragia", "desmaio",
  "convulsão", "infecção", "necrose", "cianose", "isquemia",
  "choque", "taquicardia",
];

const CRITICAL_PHRASES = [
  "não consigo fechar o olho", "inchaço muito grande",
  "abriu a cirurgia", "perdendo sensação", "febre alta",
  "dor forte", "falta de ar", "taquipneia", "pele azulada",
  "hipotensão", "edema agudo",
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function detectKeyword(text: string): string | null {
  const norm = normalize(text);
  for (const phrase of CRITICAL_PHRASES) {
    if (norm.includes(normalize(phrase))) return phrase;
  }
  for (const word of CRITICAL_WORDS) {
    const pattern = new RegExp(`\\b${normalize(word)}\\b`);
    if (pattern.test(norm)) return word;
  }
  return null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function authorize(req: Request): { ok: true } | { ok: false; reason: string } {
  const expected = Deno.env.get("WEBHOOK_SHARED_SECRET");
  if (!expected) return { ok: false, reason: "secret_not_configured" };

  const header = req.headers.get("Authorization") ?? "";
  if (!header.startsWith("Bearer ")) return { ok: false, reason: "missing_bearer" };

  const presented = header.slice("Bearer ".length);
  if (!constantTimeEquals(presented, expected)) return { ok: false, reason: "mismatch" };

  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = authorize(req);
  if (!auth.ok) {
    console.warn(`[webhook-whatsapp] unauthorized: ${auth.reason}`);
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const headers = {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
    };

    const body = await req.json();
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0]?.value;

    if (!changes) return json({ ok: true });

    if (changes.statuses) {
      for (const status of changes.statuses) {
        const waId = status.id;
        const newStatus = status.status;
        if (!waId || !newStatus) continue;

        const mapped =
          newStatus === "sent" ? "sent"
          : newStatus === "delivered" ? "delivered"
          : newStatus === "read" ? "read"
          : newStatus === "failed" ? "failed"
          : null;

        if (!mapped) continue;

        await fetch(
          `${supabaseUrl}/rest/v1/alert_logs?wa_message_id=eq.${waId}`,
          {
            method: "PATCH",
            headers: { ...headers, Prefer: "return=minimal" },
            body: JSON.stringify({
              status: mapped,
              updated_at: new Date().toISOString(),
            }),
          }
        );
      }
    }

    if (changes.messages) {
      for (const msg of changes.messages) {
        const phone = msg.from;
        const text = msg.text?.body ?? "";
        if (!phone || !text) continue;

        const patientRes = await fetch(
          `${supabaseUrl}/rest/v1/patients?phone=like.*${phone.slice(-8)}&workflow_status=eq.pos_op_ativo&select=id,org_id,full_name,phone`,
          { headers }
        );

        const patients: Array<{
          id: string;
          org_id: string;
          full_name: string;
          phone: string;
        }> = patientRes.ok ? await patientRes.json() : [];

        if (!patients.length) {
          console.log(`[webhook] No pos_op_ativo patient for phone ...${phone.slice(-4)}`);
          continue;
        }

        const patient = patients[0];

        await fetch(`${supabaseUrl}/rest/v1/alert_logs`, {
          method: "POST",
          headers: { ...headers, Prefer: "return=minimal" },
          body: JSON.stringify({
            org_id: patient.org_id,
            patient_id: patient.id,
            direction: "inbound",
            channel: "whatsapp",
            phone,
            status: "received",
            payload: { text, wa_message_id: msg.id },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });

        const keyword = detectKeyword(text);
        if (keyword) {
          const defRes = await fetch(
            `${supabaseUrl}/rest/v1/alert_definitions?org_id=eq.${patient.org_id}&code=eq.keyword_critical&active=eq.true&limit=1`,
            { headers }
          );
          const defs: Array<{ id: string; template_name: string }> = defRes.ok ? await defRes.json() : [];

          const profileRes = await fetch(
            `${supabaseUrl}/rest/v1/profiles?org_id=eq.${patient.org_id}&role=eq.admin&select=phone&limit=1`,
            { headers }
          );
          const profiles: Array<{ phone: string }> = profileRes.ok ? await profileRes.json() : [];
          const doctorPhone = profiles[0]?.phone;

          if (doctorPhone) {
            const snippet = text.length > 100 ? text.substring(0, 100) + "..." : text;
            await fetch(`${supabaseUrl}/rest/v1/alert_logs`, {
              method: "POST",
              headers: { ...headers, Prefer: "return=minimal" },
              body: JSON.stringify({
                org_id: patient.org_id,
                patient_id: patient.id,
                definition_id: defs[0]?.id ?? null,
                direction: "outbound",
                channel: "whatsapp",
                phone: doctorPhone,
                template_name: defs[0]?.template_name ?? "keyword_critical_alert",
                status: "pending",
                keyword_detected: keyword,
                payload: {
                  params: [patient.full_name, keyword, snippet, patient.phone],
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }),
            });

            const sendUrl = `${supabaseUrl}/functions/v1/send-whatsapp`;
            fetch(sendUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${serviceKey}`,
                "Content-Type": "application/json",
              },
              body: "{}",
            }).catch((e) => console.error("[webhook] fire-and-forget send-whatsapp:", e));
          }
        }
      }
    }

    return json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[webhook-whatsapp]", msg);
    return json({ error: msg }, 500);
  }
});
