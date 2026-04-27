import "jsr:@supabase/functions-js/edge-runtime.d.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface AlertDefinition {
  id: string;
  org_id: string;
  code: string;
  trigger_type: string;
  target_role: string;
  template_name: string;
  template_params: unknown;
  delay_hours: number;
}

interface Patient {
  id: string;
  org_id: string;
  full_name: string;
  phone: string;
}

interface SurgicalRecord {
  patient_id: string;
  end_time: string;
}

interface Appointment {
  patient_id: string;
  scheduled_date: string;
}

Deno.serve(async (_req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const headers = {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
    };

    const patientsRes = await fetch(
      `${supabaseUrl}/rest/v1/patients?workflow_status=eq.pos_op_ativo&phone=neq.&select=id,org_id,full_name,phone`,
      { headers }
    );

    if (!patientsRes.ok) {
      throw new Error(`Failed to fetch patients: ${await patientsRes.text()}`);
    }

    const patients: Patient[] = await patientsRes.json();
    if (!patients.length) return json({ processed: 0 });

    const orgIds = [...new Set(patients.map((p) => p.org_id))];

    const defsRes = await fetch(
      `${supabaseUrl}/rest/v1/alert_definitions?trigger_type=eq.scheduled&active=eq.true&org_id=in.(${orgIds.join(",")})`,
      { headers }
    );
    const allDefs: AlertDefinition[] = defsRes.ok ? await defsRes.json() : [];

    if (!allDefs.length) return json({ processed: 0, reason: "No active scheduled definitions" });

    const patientIds = patients.map((p) => p.id);

    const surgRes = await fetch(
      `${supabaseUrl}/rest/v1/surgical_records?patient_id=in.(${patientIds.join(",")})&select=patient_id,end_time&order=end_time.desc`,
      { headers }
    );
    const surgeries: SurgicalRecord[] = surgRes.ok ? await surgRes.json() : [];

    const surgeryMap = new Map<string, string>();
    for (const s of surgeries) {
      if (!surgeryMap.has(s.patient_id)) {
        surgeryMap.set(s.patient_id, s.end_time);
      }
    }

    const apptRes = await fetch(
      `${supabaseUrl}/rest/v1/patient_appointments?patient_id=in.(${patientIds.join(",")})&appointment_type=like.Pós-op*&select=patient_id,scheduled_date&order=scheduled_date.asc`,
      { headers }
    );
    const appointments: Appointment[] = apptRes.ok ? await apptRes.json() : [];

    const nextApptMap = new Map<string, string>();
    for (const a of appointments) {
      if (!nextApptMap.has(a.patient_id) && new Date(a.scheduled_date) > new Date()) {
        nextApptMap.set(a.patient_id, a.scheduled_date);
      }
    }

    const logsRes = await fetch(
      `${supabaseUrl}/rest/v1/alert_logs?patient_id=in.(${patientIds.join(",")})&direction=eq.outbound&select=patient_id,template_name`,
      { headers }
    );
    const existingLogs: Array<{ patient_id: string; template_name: string }> = logsRes.ok
      ? await logsRes.json()
      : [];

    const sentSet = new Set(existingLogs.map((l) => `${l.patient_id}:${l.template_name}`));

    const now = Date.now();
    let created = 0;

    for (const patient of patients) {
      const surgeryEnd = surgeryMap.get(patient.id);
      if (!surgeryEnd) continue;

      const hoursSinceSurgery = (now - new Date(surgeryEnd).getTime()) / (1000 * 60 * 60);
      const orgDefs = allDefs.filter((d) => d.org_id === patient.org_id);

      for (const def of orgDefs) {
        if (hoursSinceSurgery < def.delay_hours) continue;
        const dedupKey = `${patient.id}:${def.template_name}`;
        if (sentSet.has(dedupKey)) continue;

        const nextAppt = nextApptMap.get(patient.id);
        const params: string[] = [patient.full_name];
        if (nextAppt) params.push(new Date(nextAppt).toLocaleDateString("pt-BR"));

        await fetch(`${supabaseUrl}/rest/v1/alert_logs`, {
          method: "POST",
          headers: { ...headers, Prefer: "return=minimal" },
          body: JSON.stringify({
            org_id: patient.org_id,
            patient_id: patient.id,
            definition_id: def.id,
            direction: "outbound",
            channel: "whatsapp",
            phone: patient.phone,
            template_name: def.template_name,
            status: "pending",
            payload: { params },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });

        sentSet.add(dedupKey);
        created++;
      }
    }

    if (created > 0) {
      const sendUrl = `${supabaseUrl}/functions/v1/send-whatsapp`;
      await fetch(sendUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });
    }

    return json({ processed: patients.length, created });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[process-alerts]", msg);
    return json({ error: msg }, 500);
  }
});
