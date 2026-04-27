import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// CORS: apenas origens permitidas
const ALLOWED_ORIGINS = [
  "https://spem.app",
  "https://app.spem.app",
  Deno.env.get("SITE_URL") || "http://localhost:5173",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };
}

function json(body: unknown, status = 200, req?: Request) {
  const cors = req ? getCorsHeaders(req) : {};
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const MESSAGE_TEMPLATES: Record<string, string> = {
  agendar_consulta:
    "Olá {0}! Aqui é a equipe da clínica. Gostaríamos de agendar sua consulta. Responda esta mensagem com os melhores dias e horários para você.",
  pos_op_24h:
    "Olá {0}! Aqui é a equipe da sua clínica. Como você está se sentindo após a cirurgia? Se tiver qualquer sintoma como dor forte, sangramento ou febre, responda esta mensagem.",
  pos_op_48h:
    "Olá {0}! Passando para saber como está sua recuperação. Algum desconforto? Lembre-se: sua próxima consulta é em {1}.",
  pos_op_7d:
    "Olá {0}! Já faz uma semana da sua cirurgia. Como está a cicatrização? Se notar qualquer alteração, nos avise. Próximo retorno: {1}.",
  lembrete_retorno:
    "Olá {0}! Lembrete: você tem retorno agendado para {1}. Confirme sua presença respondendo esta mensagem.",
  keyword_critical_alert:
    "⚠️ ALERTA CLÍNICO: Paciente {0} enviou mensagem com keyword crítica: \"{1}\". Trecho: \"{2}\". Telefone: {3}.",
};

function buildMessage(templateName: string, params: string[]): string {
  const tpl = MESSAGE_TEMPLATES[templateName];
  if (!tpl) {
    return params.length
      ? `[${templateName}] ${params.join(" | ")}`
      : `[${templateName}]`;
  }
  return tpl.replace(/\{(\d+)\}/g, (_, i) => params[Number(i)] ?? "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: getCorsHeaders(req) });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const bridgeUrl = Deno.env.get("WHATSAPP_BRIDGE_URL") ?? "http://localhost:3002/send";

    const headers = {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
    };

    const pendingRes = await fetch(
      `${supabaseUrl}/rest/v1/alert_logs?status=eq.pending&direction=eq.outbound&order=created_at.asc&limit=50`,
      { headers }
    );

    if (!pendingRes.ok) {
      throw new Error(`Failed to fetch pending logs: ${await pendingRes.text()}`);
    }

    const pending: Array<{
      id: string;
      phone: string;
      template_name: string;
      payload: Record<string, unknown>;
    }> = await pendingRes.json();

    if (!pending.length) return json({ sent: 0 }, 200, req);

    let sent = 0;
    let failed = 0;

    for (const log of pending) {
      if (!log.phone) {
        await updateLogStatus(supabaseUrl, headers, log.id, "failed", "Telefone não informado");
        failed++;
        continue;
      }

      const phone = log.phone.replace(/\D/g, "");
      const params = (log.payload as { params?: string[] })?.params ?? [];
      const message = buildMessage(log.template_name, params);

      try {
        const bridgeRes = await fetch(bridgeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, message }),
        });

        const bridgeData = await bridgeRes.json();

        if (bridgeRes.ok && bridgeData.success) {
          await updateLogStatus(supabaseUrl, headers, log.id, "sent");
          sent++;
        } else {
          const errMsg = bridgeData.error ?? JSON.stringify(bridgeData);
          await updateLogStatus(supabaseUrl, headers, log.id, "failed", errMsg);
          failed++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao conectar no bridge";
        await updateLogStatus(supabaseUrl, headers, log.id, "failed", msg);
        failed++;
      }
    }

    return json({ sent, failed }, 200, req);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-whatsapp]", msg);
    return json({ error: msg }, 500, req);
  }
});

async function updateLogStatus(
  supabaseUrl: string,
  headers: Record<string, string>,
  logId: string,
  status: string,
  errorMessage?: string | null,
) {
  const body: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (errorMessage) body.error_message = errorMessage;

  await fetch(`${supabaseUrl}/rest/v1/alert_logs?id=eq.${logId}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
}
