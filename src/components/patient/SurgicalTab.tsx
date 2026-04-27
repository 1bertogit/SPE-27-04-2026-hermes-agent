import { useEffect, useState } from 'react';
import { Scissors, Plus, Shield, Trash2, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select, Input } from '../ui/Input';
import { EmptyState } from '../ui/EmptyState';
import { useSurgicalStore } from '../../stores/surgicalStore';
import { useUIStore } from '../../stores/uiStore';
import { formatDate } from '../../lib/utils';
import { PROCEDURE_TYPES } from '../../data/procedures';
import type { SurgicalRecord, ImplantRecord } from '../../lib/types';

interface Props {
  patientId: string;
}

export function SurgicalTab({ patientId }: Props) {
  const { records, loading, fetchRecords, createRecord, updateRecord, deleteRecord, addImplant, deleteImplant } = useSurgicalStore();
  const showToast = useUIStore((s) => s.showToast);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [implantModalOpen, setImplantModalOpen] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    procedure_type: '',
    surgery_date: '',
    technique_used: '',
    surgical_time_minutes: '',
    anesthesia_time_minutes: '',
    anesthesia_type: '',
    complications: '',
    complications_management: '',
    materials_used: '',
    sutures_used: '',
    notes: '',
    oms_sign_in_done: false,
    oms_time_out_done: false,
    oms_sign_out_done: false,
  });

  const [implantForm, setImplantForm] = useState({
    implant_type: '',
    manufacturer: '',
    model: '',
    volume_ml: '',
    lot_number: '',
    implant_side: '',
  });

  useEffect(() => {
    fetchRecords(patientId);
  }, [patientId, fetchRecords]);

  const toggleExpand = (id: string) => setExpanded((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ procedure_type: '', surgery_date: '', technique_used: '', surgical_time_minutes: '', anesthesia_time_minutes: '', anesthesia_type: '', complications: '', complications_management: '', materials_used: '', sutures_used: '', notes: '', oms_sign_in_done: false, oms_time_out_done: false, oms_sign_out_done: false });
    setModalOpen(true);
  };

  const openEdit = (rec: SurgicalRecord) => {
    setEditingId(rec.id);
    setForm({
      procedure_type: rec.procedure_type,
      surgery_date: rec.surgery_date ?? '',
      technique_used: rec.technique_used ?? '',
      surgical_time_minutes: rec.surgical_time_minutes?.toString() ?? '',
      anesthesia_time_minutes: rec.anesthesia_time_minutes?.toString() ?? '',
      anesthesia_type: rec.anesthesia_type ?? '',
      complications: rec.complications ?? '',
      complications_management: rec.complications_management ?? '',
      materials_used: rec.materials_used ?? '',
      sutures_used: rec.sutures_used ?? '',
      notes: rec.notes ?? '',
      oms_sign_in_done: rec.oms_sign_in_done,
      oms_time_out_done: rec.oms_time_out_done,
      oms_sign_out_done: rec.oms_sign_out_done,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.procedure_type) { showToast('Selecione o procedimento', 'error'); return; }
    setSubmitting(true);

    const payload = {
      patient_id: patientId,
      evaluation_id: null,
      procedure_type: form.procedure_type,
      surgery_date: form.surgery_date || null,
      technique_used: form.technique_used || null,
      surgical_time_minutes: form.surgical_time_minutes ? parseInt(form.surgical_time_minutes) : null,
      anesthesia_time_minutes: form.anesthesia_time_minutes ? parseInt(form.anesthesia_time_minutes) : null,
      anesthesia_type: form.anesthesia_type || null,
      complications: form.complications || null,
      complications_management: form.complications_management || null,
      materials_used: form.materials_used || null,
      sutures_used: form.sutures_used || null,
      notes: form.notes || null,
      oms_sign_in_done: form.oms_sign_in_done,
      oms_time_out_done: form.oms_time_out_done,
      oms_sign_out_done: form.oms_sign_out_done,
    };

    if (editingId) {
      const { error } = await updateRecord(editingId, payload);
      if (error) showToast(error, 'error');
      else { showToast('Registro atualizado', 'success'); setModalOpen(false); }
    } else {
      const { error } = await createRecord(payload);
      if (error) showToast(error, 'error');
      else { showToast('Registro cirúrgico criado', 'success'); setModalOpen(false); }
    }
    setSubmitting(false);
  };

  const handleAddImplant = async (recordId: string) => {
    if (!implantForm.implant_type || !implantForm.manufacturer || !implantForm.lot_number) {
      showToast('Preencha tipo, fabricante e lote', 'error'); return;
    }
    setSubmitting(true);
    const rec = records.find((r) => r.id === recordId);
    const { error } = await addImplant({
      surgical_record_id: recordId,
      patient_id: patientId,
      implant_type: implantForm.implant_type,
      manufacturer: implantForm.manufacturer,
      model: implantForm.model || null,
      volume_ml: implantForm.volume_ml ? parseFloat(implantForm.volume_ml) : null,
      lot_number: implantForm.lot_number,
      implant_side: implantForm.implant_side || null,
      surgery_date: rec?.surgery_date ?? null,
    });
    if (error) showToast(error, 'error');
    else { showToast('Implante registrado (ANVISA)', 'success'); setImplantModalOpen(null); setImplantForm({ implant_type: '', manufacturer: '', model: '', volume_ml: '', lot_number: '', implant_side: '' }); }
    setSubmitting(false);
  };

  const omsComplete = (rec: SurgicalRecord) => rec.oms_sign_in_done && rec.oms_time_out_done && rec.oms_sign_out_done;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-editorial-muted">{records.length} registro{records.length !== 1 ? 's' : ''} cirúrgico{records.length !== 1 ? 's' : ''}</p>
        <Button size="sm" variant="outline" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo Registro
        </Button>
      </div>

      {records.length === 0 && !loading ? (
        <EmptyState
          icon={<Scissors className="h-10 w-10 text-editorial-warm" />}
          title="Nenhum registro cirúrgico"
          description="Registre dados do procedimento realizado, incluindo rastreabilidade de implantes."
          action={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />Novo Registro</Button>}
        />
      ) : (
        <div className="space-y-3">
          {records.map((rec) => {
            const isExpanded = expanded.includes(rec.id);
            const hasImplants = (rec.implants ?? []).length > 0;
            return (
              <Card key={rec.id} padding={false}>
                <button
                  className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-editorial-cream/20 dark:hover:bg-white/5 transition-colors"
                  onClick={() => toggleExpand(rec.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-editorial-navy dark:text-editorial-cream">{rec.procedure_type}</span>
                      {rec.surgery_date && <span className="text-xs text-editorial-muted">{formatDate(rec.surgery_date)}</span>}
                      {hasImplants && (
                        <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-editorial-gold/10 text-editorial-gold-dark border border-editorial-gold/20">
                          <Package className="h-3 w-3" />
                          {rec.implants!.length} implante{rec.implants!.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {rec.anesthesia_type && <span className="text-xs text-editorial-muted">Anestesia: {rec.anesthesia_type}</span>}
                      {rec.surgical_time_minutes && <span className="text-xs text-editorial-muted">Duração: {rec.surgical_time_minutes} min</span>}
                      <div className="flex items-center gap-1">
                        {[rec.oms_sign_in_done, rec.oms_time_out_done, rec.oms_sign_out_done].map((done, i) => (
                          <div key={i} className={`w-2 h-2 rounded-full ${done ? 'bg-editorial-sage' : 'bg-editorial-cream dark:bg-editorial-navy-light/30'}`} title={['Sign In', 'Time Out', 'Sign Out'][i]} />
                        ))}
                        <span className="text-xs text-editorial-muted ml-0.5">{omsComplete(rec) ? 'OMS completo' : 'OMS parcial'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(rec); }} className="p-1.5 rounded text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream hover:bg-editorial-cream/50 transition-colors">
                      <Scissors className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteRecord(rec.id); }} className="p-1.5 rounded text-editorial-muted hover:text-editorial-rose hover:bg-editorial-rose/10 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-editorial-muted" /> : <ChevronDown className="h-4 w-4 text-editorial-muted" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-editorial-cream dark:border-editorial-navy-light/20 px-4 py-4 space-y-4">
                    {rec.technique_used && (
                      <div><p className="text-xs font-medium text-editorial-muted uppercase tracking-wider mb-1">Técnica</p><p className="text-sm text-editorial-navy dark:text-editorial-cream">{rec.technique_used}</p></div>
                    )}
                    {rec.complications && (
                      <div>
                        <p className="text-xs font-medium text-editorial-rose uppercase tracking-wider mb-1">Intercorrências</p>
                        <p className="text-sm text-editorial-navy dark:text-editorial-cream">{rec.complications}</p>
                        {rec.complications_management && <p className="text-sm text-editorial-muted mt-1">Conduta: {rec.complications_management}</p>}
                      </div>
                    )}
                    {rec.materials_used && (
                      <div><p className="text-xs font-medium text-editorial-muted uppercase tracking-wider mb-1">Materiais</p><p className="text-sm text-editorial-navy dark:text-editorial-cream">{rec.materials_used}</p></div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-editorial-muted uppercase tracking-wider flex items-center gap-1.5">
                          <Shield className="h-3.5 w-3.5" />
                          Implantes — Rastreabilidade ANVISA
                        </p>
                        <Button size="sm" variant="ghost" onClick={() => { setImplantModalOpen(rec.id); setImplantForm({ implant_type: '', manufacturer: '', model: '', volume_ml: '', lot_number: '', implant_side: '' }); }}>
                          <Plus className="h-3.5 w-3.5" />
                          Registrar Implante
                        </Button>
                      </div>
                      {(rec.implants ?? []).length === 0 ? (
                        <p className="text-sm text-editorial-muted">Nenhum implante registrado</p>
                      ) : (
                        <div className="space-y-2">
                          {rec.implants!.map((imp: ImplantRecord) => (
                            <div key={imp.id} className="flex items-center gap-3 px-3 py-2.5 bg-editorial-gold/5 border border-editorial-gold/15 rounded-lg">
                              <Package className="h-4 w-4 text-editorial-gold flex-shrink-0" />
                              <div className="flex-1 min-w-0 text-xs">
                                <div className="font-medium text-editorial-navy dark:text-editorial-cream">{imp.implant_type} — {imp.manufacturer}</div>
                                <div className="text-editorial-muted mt-0.5">
                                  Lote: <span className="font-mono font-medium">{imp.lot_number}</span>
                                  {imp.model && ` · ${imp.model}`}
                                  {imp.volume_ml && ` · ${imp.volume_ml} mL`}
                                  {imp.implant_side && ` · Lado: ${imp.implant_side}`}
                                </div>
                              </div>
                              <button onClick={() => deleteImplant(imp.id, rec.id, patientId)} className="p-1 rounded text-editorial-muted hover:text-editorial-rose hover:bg-editorial-rose/10 transition-colors">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
        title={editingId ? 'Editar Registro Cirúrgico' : 'Novo Registro Cirúrgico'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button loading={submitting} onClick={handleSubmit}>{editingId ? 'Salvar' : 'Criar'}</Button>
          </div>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <Select
            label="Procedimento"
            options={[{ label: 'Selecione...', value: '' }, ...PROCEDURE_TYPES.map((p) => ({ label: p, value: p }))]}
            value={form.procedure_type}
            onChange={(e) => setForm((f) => ({ ...f, procedure_type: e.target.value }))}
          />
          <Input label="Data da Cirurgia" type="date" value={form.surgery_date} onChange={(e) => setForm((f) => ({ ...f, surgery_date: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tempo Cirúrgico (min)" type="number" value={form.surgical_time_minutes} onChange={(e) => setForm((f) => ({ ...f, surgical_time_minutes: e.target.value }))} />
            <Input label="Tempo Anestesia (min)" type="number" value={form.anesthesia_time_minutes} onChange={(e) => setForm((f) => ({ ...f, anesthesia_time_minutes: e.target.value }))} />
          </div>
          <Select
            label="Tipo de Anestesia"
            options={[{ label: 'Não especificado', value: '' }, { label: 'Geral', value: 'Geral' }, { label: 'Sedação + Local', value: 'Sedação + Local' }, { label: 'Local', value: 'Local' }, { label: 'Raquianestesia', value: 'Raquianestesia' }, { label: 'Peridural', value: 'Peridural' }]}
            value={form.anesthesia_type}
            onChange={(e) => setForm((f) => ({ ...f, anesthesia_type: e.target.value }))}
          />
          {(['technique_used', 'materials_used', 'sutures_used', 'complications', 'complications_management', 'notes'] as const).map((field) => (
            <div key={field}>
              <label className="block text-xs font-medium text-editorial-navy/70 dark:text-editorial-cream/70 uppercase tracking-wider mb-1.5">
                {field === 'technique_used' ? 'Técnica Utilizada' : field === 'materials_used' ? 'Materiais Utilizados' : field === 'sutures_used' ? 'Fios e Suturas' : field === 'complications' ? 'Intercorrências' : field === 'complications_management' ? 'Conduta nas Intercorrências' : 'Observações'}
              </label>
              <textarea
                className="w-full rounded-lg border border-editorial-cream dark:border-editorial-navy-light/30 bg-white dark:bg-editorial-navy/40 text-sm text-editorial-navy dark:text-editorial-cream px-3 py-2.5 resize-none h-16 focus:outline-none focus:border-editorial-gold/60 transition-colors"
                value={form[field]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
              />
            </div>
          ))}
          <div className="space-y-2">
            <p className="text-xs font-medium text-editorial-navy/70 dark:text-editorial-cream/70 uppercase tracking-wider">Checklist OMS</p>
            {(['oms_sign_in_done', 'oms_time_out_done', 'oms_sign_out_done'] as const).map((key) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))} className="rounded border-editorial-cream" />
                <span className="text-sm text-editorial-navy dark:text-editorial-cream">{key === 'oms_sign_in_done' ? 'Sign In realizado' : key === 'oms_time_out_done' ? 'Time Out realizado' : 'Sign Out realizado'}</span>
              </label>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        open={!!implantModalOpen}
        onClose={() => setImplantModalOpen(null)}
        title="Registrar Implante (ANVISA)"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setImplantModalOpen(null)}>Cancelar</Button>
            <Button loading={submitting} onClick={() => implantModalOpen && handleAddImplant(implantModalOpen)}>Registrar</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-editorial-muted bg-editorial-gold/5 border border-editorial-gold/20 rounded-lg px-3 py-2">
            A ANVISA exige registro do lote de próteses para rastreabilidade em caso de explante futuro.
          </p>
          <Input label="Tipo de Implante" placeholder="Ex: Prótese Mamária" value={implantForm.implant_type} onChange={(e) => setImplantForm((f) => ({ ...f, implant_type: e.target.value }))} />
          <Input label="Fabricante" placeholder="Ex: Mentor, Eurosilicone, Silimed" value={implantForm.manufacturer} onChange={(e) => setImplantForm((f) => ({ ...f, manufacturer: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Modelo" value={implantForm.model} onChange={(e) => setImplantForm((f) => ({ ...f, model: e.target.value }))} />
            <Input label="Volume (mL)" type="number" value={implantForm.volume_ml} onChange={(e) => setImplantForm((f) => ({ ...f, volume_ml: e.target.value }))} />
          </div>
          <Input label="Número de Lote *" placeholder="Ex: LOT2024001" value={implantForm.lot_number} onChange={(e) => setImplantForm((f) => ({ ...f, lot_number: e.target.value }))} />
          <Select
            label="Lado"
            options={[{ label: 'Não se aplica', value: '' }, { label: 'Direito', value: 'Direito' }, { label: 'Esquerdo', value: 'Esquerdo' }, { label: 'Bilateral', value: 'Bilateral' }]}
            value={implantForm.implant_side}
            onChange={(e) => setImplantForm((f) => ({ ...f, implant_side: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
}
