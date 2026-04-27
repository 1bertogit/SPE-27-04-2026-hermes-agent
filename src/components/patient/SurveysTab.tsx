import { useEffect, useState } from 'react';
import { Star, Plus, Trash2, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Input';
import { EmptyState } from '../ui/EmptyState';
import { useSurveyStore } from '../../stores/surveyStore';
import { useUIStore } from '../../stores/uiStore';
import { formatDate } from '../../lib/utils';
import { PROCEDURE_TYPES } from '../../data/procedures';
import type { SatisfactionSurvey } from '../../lib/types';

function getNpsCategory(score: number): { label: string; color: string; icon: React.ReactNode } {
  if (score >= 9) return { label: 'Promotor', color: 'text-editorial-sage', icon: <ThumbsUp className="h-3.5 w-3.5" /> };
  if (score >= 7) return { label: 'Neutro', color: 'text-editorial-gold-dark', icon: <Minus className="h-3.5 w-3.5" /> };
  return { label: 'Detrator', color: 'text-editorial-rose', icon: <ThumbsDown className="h-3.5 w-3.5" /> };
}

interface Props {
  patientId: string;
}

export function SurveysTab({ patientId }: Props) {
  const { surveys, loading, fetchSurveys, createSurvey, deleteSurvey } = useSurveyStore();
  const showToast = useUIStore((s) => s.showToast);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    procedure_type: '',
    nps_score: 9,
    overall_rating: 5,
    what_went_well: '',
    what_could_improve: '',
    would_recommend: true,
    survey_date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    fetchSurveys(patientId);
  }, [patientId, fetchSurveys]);

  const patientSurveys = surveys.filter((s) => s.patient_id === patientId);

  const handleSubmit = async () => {
    setSubmitting(true);
    const { error } = await createSurvey({
      patient_id: patientId,
      evaluation_id: null,
      appointment_id: null,
      procedure_type: form.procedure_type || null,
      nps_score: form.nps_score,
      what_went_well: form.what_went_well || null,
      what_could_improve: form.what_could_improve || null,
      would_recommend: form.would_recommend,
      overall_rating: form.overall_rating,
      survey_date: form.survey_date,
    });
    if (error) showToast(error, 'error');
    else { showToast('Pesquisa registrada', 'success'); setModalOpen(false); }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteSurvey(id);
    if (error) showToast(error, 'error');
    else showToast('Pesquisa removida', 'success');
  };

  const avgNps = patientSurveys.length > 0
    ? Math.round(patientSurveys.reduce((sum, s) => sum + (s.nps_score ?? 0), 0) / patientSurveys.length)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {avgNps !== null && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-editorial-navy/8 dark:bg-editorial-cream/8 border border-editorial-cream dark:border-editorial-navy-light/20">
              <Star className="h-3.5 w-3.5 text-editorial-gold" />
              <span className="text-sm font-medium text-editorial-navy dark:text-editorial-cream">NPS médio: {avgNps}/10</span>
            </div>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => { setForm({ procedure_type: '', nps_score: 9, overall_rating: 5, what_went_well: '', what_could_improve: '', would_recommend: true, survey_date: new Date().toISOString().slice(0, 10) }); setModalOpen(true); }}>
          <Plus className="h-4 w-4" />
          Nova Pesquisa
        </Button>
      </div>

      {patientSurveys.length === 0 && !loading ? (
        <EmptyState
          icon={<Star className="h-10 w-10 text-editorial-warm" />}
          title="Nenhuma pesquisa de satisfação"
          description="Aplique o NPS na janela de 3 a 6 meses pós-operatório, quando o paciente está no pico de satisfação."
          action={<Button size="sm" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" />Nova Pesquisa</Button>}
        />
      ) : (
        <div className="space-y-3">
          {patientSurveys.map((survey: SatisfactionSurvey) => {
            const npsScore = survey.nps_score ?? 0;
            const cat = getNpsCategory(npsScore);
            return (
              <Card key={survey.id} className="relative group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${npsScore >= 9 ? 'bg-editorial-sage/10 text-editorial-sage' : npsScore >= 7 ? 'bg-editorial-gold/10 text-editorial-gold-dark' : 'bg-editorial-rose/10 text-editorial-rose'}`}>
                      {npsScore}
                    </div>
                    <div>
                      <div className={`flex items-center gap-1.5 text-sm font-medium ${cat.color}`}>
                        {cat.icon}
                        {cat.label}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-editorial-muted">
                        {survey.procedure_type && <span>{survey.procedure_type}</span>}
                        <span>{formatDate(survey.survey_date)}</span>
                        {survey.overall_rating && (
                          <span className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3 w-3 ${i < (survey.overall_rating ?? 0) ? 'text-editorial-gold fill-editorial-gold' : 'text-editorial-cream dark:text-editorial-navy-light/30'}`} />
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(survey.id)}
                    className="p-1.5 rounded text-editorial-muted hover:text-editorial-rose hover:bg-editorial-rose/10 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {(survey.what_went_well || survey.what_could_improve) && (
                  <div className="mt-3 pt-3 border-t border-editorial-cream dark:border-editorial-navy-light/20 space-y-2">
                    {survey.what_went_well && (
                      <div>
                        <p className="text-xs font-medium text-editorial-sage mb-0.5">O que foi bem</p>
                        <p className="text-sm text-editorial-navy dark:text-editorial-cream">{survey.what_went_well}</p>
                      </div>
                    )}
                    {survey.what_could_improve && (
                      <div>
                        <p className="text-xs font-medium text-editorial-gold-dark mb-0.5">O que pode melhorar</p>
                        <p className="text-sm text-editorial-navy dark:text-editorial-cream">{survey.what_could_improve}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Pesquisa de Satisfação (NPS)"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button loading={submitting} onClick={handleSubmit}>Registrar</Button>
          </div>
        }
      >
        <div className="space-y-5">
          <Select
            label="Procedimento"
            options={[{ label: 'Não especificado', value: '' }, ...PROCEDURE_TYPES.map((p) => ({ label: p, value: p }))]}
            value={form.procedure_type}
            onChange={(e) => setForm((f) => ({ ...f, procedure_type: e.target.value }))}
          />

          <div>
            <label className="block text-xs font-medium text-editorial-navy/70 dark:text-editorial-cream/70 uppercase tracking-wider mb-3">
              NPS — De 0 a 10, quanto você indicaria para um amigo?
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: 11 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setForm((f) => ({ ...f, nps_score: i }))}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                    form.nps_score === i
                      ? i >= 9 ? 'bg-editorial-sage text-white' : i >= 7 ? 'bg-editorial-gold text-white' : 'bg-editorial-rose text-white'
                      : 'bg-editorial-cream/60 dark:bg-editorial-navy-light/20 text-editorial-muted hover:bg-editorial-cream dark:hover:bg-editorial-navy-light/30'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            <p className={`text-xs mt-2 font-medium ${form.nps_score >= 9 ? 'text-editorial-sage' : form.nps_score >= 7 ? 'text-editorial-gold-dark' : 'text-editorial-rose'}`}>
              {form.nps_score >= 9 ? 'Promotor — muito satisfeito' : form.nps_score >= 7 ? 'Neutro — satisfeito' : 'Detrator — insatisfeito'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-editorial-navy/70 dark:text-editorial-cream/70 uppercase tracking-wider mb-2">
              Avaliação Geral
            </label>
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} onClick={() => setForm((f) => ({ ...f, overall_rating: i + 1 }))} className="transition-transform hover:scale-110">
                  <Star className={`h-6 w-6 ${i < form.overall_rating ? 'text-editorial-gold fill-editorial-gold' : 'text-editorial-cream dark:text-editorial-navy-light/30'}`} />
                </button>
              ))}
            </div>
          </div>

          {(['what_went_well', 'what_could_improve'] as const).map((field) => (
            <div key={field}>
              <label className="block text-xs font-medium text-editorial-navy/70 dark:text-editorial-cream/70 uppercase tracking-wider mb-1.5">
                {field === 'what_went_well' ? 'O que foi bem?' : 'O que pode melhorar?'}
              </label>
              <textarea
                className="w-full rounded-lg border border-editorial-cream dark:border-editorial-navy-light/30 bg-white dark:bg-editorial-navy/40 text-sm text-editorial-navy dark:text-editorial-cream px-3 py-2.5 resize-none h-16 focus:outline-none focus:border-editorial-gold/60 transition-colors"
                value={form[field]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
              />
            </div>
          ))}

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.would_recommend} onChange={(e) => setForm((f) => ({ ...f, would_recommend: e.target.checked }))} className="rounded border-editorial-cream" />
            <span className="text-sm text-editorial-navy dark:text-editorial-cream">Indicaria a clínica para amigos e familiares</span>
          </label>

          <div>
            <label className="block text-xs font-medium text-editorial-navy/70 dark:text-editorial-cream/70 uppercase tracking-wider mb-1.5">Data da pesquisa</label>
            <input type="date" value={form.survey_date} onChange={(e) => setForm((f) => ({ ...f, survey_date: e.target.value }))} className="w-full rounded-lg border border-editorial-cream dark:border-editorial-navy-light/30 bg-white dark:bg-editorial-navy/40 text-sm text-editorial-navy dark:text-editorial-cream px-3 py-2.5 focus:outline-none focus:border-editorial-gold/60 transition-colors" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
