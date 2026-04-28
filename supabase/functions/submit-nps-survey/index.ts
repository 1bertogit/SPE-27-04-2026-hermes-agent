import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubmitNPSSurveyRequest {
  token: string;
  score: number;
  feedback?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { token, score, feedback }: SubmitNPSSurveyRequest = await req.json();
    if (!token || !Number.isInteger(score) || score < 0 || score > 10) {
      return jsonResponse({ error: 'Token ou score inválido' }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('nps_survey_tokens')
      .select('id, org_id, patient_id, used_at, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (tokenError) throw tokenError;
    if (!tokenData || tokenData.used_at) {
      return jsonResponse({ error: 'Token inválido ou já utilizado' }, 400);
    }
    if (new Date(tokenData.expires_at).getTime() < Date.now()) {
      return jsonResponse({ error: 'Token expirado' }, 400);
    }

    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('id, user_id, org_id, procedure_interest')
      .eq('id', tokenData.patient_id)
      .eq('org_id', tokenData.org_id)
      .maybeSingle();

    if (patientError) throw patientError;
    if (!patient) return jsonResponse({ error: 'Paciente não encontrado' }, 404);

    const trimmedFeedback = feedback?.trim();
    const { data: survey, error: surveyError } = await supabaseAdmin
      .from('satisfaction_surveys')
      .insert({
        org_id: tokenData.org_id,
        patient_id: tokenData.patient_id,
        user_id: patient.user_id,
        procedure_type: patient.procedure_interest,
        nps_score: score,
        what_went_well: trimmedFeedback || null,
        would_recommend: score >= 9,
        overall_rating: score >= 9 ? 5 : score >= 7 ? 4 : score >= 4 ? 3 : 2,
        completed: true,
        survey_date: new Date().toISOString().slice(0, 10),
      })
      .select('id')
      .maybeSingle();

    if (surveyError) throw surveyError;
    if (!survey) throw new Error('Erro ao criar pesquisa NPS');

    const { error: tokenUpdateError } = await supabaseAdmin
      .from('nps_survey_tokens')
      .update({ used_at: new Date().toISOString(), survey_id: survey.id })
      .eq('id', tokenData.id)
      .is('used_at', null);

    if (tokenUpdateError) throw tokenUpdateError;

    if (score >= 9) {
      await supabaseAdmin.from('referrals').insert({
        org_id: tokenData.org_id,
        referrer_patient_id: tokenData.patient_id,
        nps_survey_id: survey.id,
        referred_name: 'Indicação pendente',
        status: 'pending',
        notes: 'Paciente promotor no NPS. Coletar indicação ativa.',
      });
    }

    return jsonResponse({ success: true, surveyId: survey.id });
  } catch (error) {
    console.error('submit-nps-survey error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro ao enviar NPS' }, 500);
  }
});

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
