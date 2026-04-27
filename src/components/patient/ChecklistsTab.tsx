import { useEffect, useState } from 'react';
import { CheckSquare, Plus, ChevronDown, ChevronUp, Trash2, Shield, Info, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Input';
import { EmptyState } from '../ui/EmptyState';
import { useChecklistStore } from '../../stores/checklistStore';
import { useUIStore } from '../../stores/uiStore';
import { PROCEDURE_TYPES } from '../../data/procedures';
import type { Checklist, ChecklistType, ChecklistItemType } from '../../lib/types';

const CHECKLIST_TYPES: ChecklistType[] = [
  'Pré-operatório Geral',
  'Liberação Cirúrgica',
  'Check-in Dia da Cirurgia',
  'Checklist OMS',
  'Alta Pós-anestésica',
];

function getItemTypeStyle(type: ChecklistItemType) {
  switch (type) {
    case 'Obrigatório CFM': return { dot: 'bg-editorial-sage', badge: 'bg-editorial-sage/10 text-editorial-sage border-editorial-sage/20', icon: <Shield className="h-3 w-3" /> };
    case 'Risco/Alerta': return { dot: 'bg-editorial-rose', badge: 'bg-editorial-rose/10 text-editorial-rose border-editorial-rose/20', icon: <AlertTriangle className="h-3 w-3" /> };
    default: return { dot: 'bg-editorial-navy/40', badge: 'bg-editorial-navy/8 text-editorial-muted border-editorial-cream', icon: <Info className="h-3 w-3" /> };
  }
}

function getProgress(cl: Checklist): { done: number; total: number; pct: number } {
  const items = cl.items ?? [];
  const done = items.filter((i) => i.is_completed).length;
  const total = items.length;
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

interface Props {
  patientId: string;
}

export function ChecklistsTab({ patientId }: Props) {
  const { checklists, loading, fetchChecklists, createChecklist, deleteChecklist, toggleItem, addItem, deleteItem } = useChecklistStore();
  const showToast = useUIStore((s) => s.showToast);
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [addItemState, setAddItemState] = useState<{ checklistId: string; label: string; type: ChecklistItemType } | null>(null);

  const [form, setForm] = useState({
    checklist_type: 'Liberação Cirúrgica' as ChecklistType,
    procedure_type: '',
    withTemplate: true,
  });

  useEffect(() => {
    fetchChecklists(patientId);
  }, [patientId, fetchChecklists]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    setSubmitting(true);
    const { error } = await createChecklist(
      {
        patient_id: patientId,
        evaluation_id: null,
        checklist_type: form.checklist_type,
        procedure_type: form.procedure_type || null,
        title: form.checklist_type,
        status: 'Pendente',
        completed_at: null,
        notes: null,
      },
      form.withTemplate
    );
    if (error) showToast(error, 'error');
    else { showToast('Checklist criado', 'success'); setModalOpen(false); }
    setSubmitting(false);
  };

  const handleToggle = async (itemId: string, checklistId: string) => {
    const { error } = await toggleItem(itemId, checklistId, patientId);
    if (error) showToast(error, 'error');
  };

  const handleAddItem = async (checklistId: string) => {
    if (!addItemState || !addItemState.label.trim()) return;
    const { error } = await addItem(checklistId, patientId, addItemState.label, addItemState.type);
    if (error) showToast(error, 'error');
    else setAddItemState(null);
  };

  const handleDeleteItem = async (itemId: string, checklistId: string) => {
    const { error } = await deleteItem(itemId, checklistId, patientId);
    if (error) showToast(error, 'error');
  };

  const handleDeleteChecklist = async (id: string) => {
    const { error } = await deleteChecklist(id);
    if (error) showToast(error, 'error');
    else showToast('Checklist removido', 'success');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-editorial-muted">{checklists.length} checklist{checklists.length !== 1 ? 's' : ''}</p>
        <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo Checklist
        </Button>
      </div>

      {checklists.length === 0 && !loading ? (
        <EmptyState
          icon={<CheckSquare className="h-10 w-10 text-editorial-warm" />}
          title="Nenhum checklist criado"
          description="Crie checklists operacionais para acompanhar o fluxo clínico."
          action={<Button size="sm" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" />Novo Checklist</Button>}
        />
      ) : (
        <div className="space-y-3">
          {checklists.map((cl: Checklist) => {
            const { done, total, pct } = getProgress(cl);
            const isExpanded = expanded.includes(cl.id);
            const mandatoryPending = (cl.items ?? []).filter((i) => !i.is_completed && i.item_type === 'Obrigatório CFM').length;

            return (
              <Card key={cl.id} padding={false}>
                <button
                  className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-editorial-cream/20 dark:hover:bg-white/5 transition-colors"
                  onClick={() => toggleExpand(cl.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-editorial-navy dark:text-editorial-cream">{cl.title}</span>
                      {cl.procedure_type && <span className="text-xs text-editorial-muted">— {cl.procedure_type}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-1.5 bg-editorial-cream dark:bg-editorial-navy-light/20 rounded-full overflow-hidden max-w-32">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            background: pct === 100 ? '#4a7c6f' : pct >= 50 ? '#c49a3d' : '#1a2c4e',
                          }}
                        />
                      </div>
                      <span className="text-xs text-editorial-muted">{done}/{total}</span>
                      {mandatoryPending > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-editorial-rose/10 text-editorial-rose border border-editorial-rose/20">
                          {mandatoryPending} obrigatório{mandatoryPending > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteChecklist(cl.id); }}
                      className="p-1 rounded text-editorial-muted hover:text-editorial-rose hover:bg-editorial-rose/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-editorial-muted" /> : <ChevronDown className="h-4 w-4 text-editorial-muted" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-editorial-cream dark:border-editorial-navy-light/20">
                    <div className="divide-y divide-editorial-cream/60 dark:divide-editorial-navy-light/10">
                      {(cl.items ?? []).map((item) => {
                        const style = getItemTypeStyle(item.item_type as ChecklistItemType);
                        return (
                          <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                            <div className="flex items-center pt-0.5">
                              <div
                                className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-colors flex-shrink-0 ${
                                  item.is_completed
                                    ? 'bg-editorial-sage border-editorial-sage'
                                    : 'border-editorial-cream dark:border-editorial-navy-light/40 hover:border-editorial-sage/50'
                                }`}
                                onClick={() => handleToggle(item.id, cl.id)}
                              >
                                {item.is_completed && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                                    <path d="M1.5 5.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm transition-colors ${item.is_completed ? 'line-through text-editorial-muted' : 'text-editorial-navy dark:text-editorial-cream'}`}>
                                {item.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className={`text-xs px-1.5 py-0.5 rounded border flex items-center gap-1 ${style.badge}`}>
                                {style.icon}
                                {item.item_type === 'Obrigatório CFM' ? 'CFM' : item.item_type === 'Risco/Alerta' ? 'Alerta' : 'Rec.'}
                              </span>
                              <button
                                onClick={() => handleDeleteItem(item.id, cl.id)}
                                className="p-1 rounded text-editorial-muted hover:text-editorial-rose hover:bg-editorial-rose/10 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="px-4 py-3 border-t border-editorial-cream/60 dark:border-editorial-navy-light/10 bg-editorial-paper/30 dark:bg-editorial-navy/20">
                      {addItemState?.checklistId === cl.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            value={addItemState.label}
                            onChange={(e) => setAddItemState((s) => s ? { ...s, label: e.target.value } : s)}
                            placeholder="Descrição do item..."
                            className="flex-1 text-sm px-2 py-1.5 rounded border border-editorial-cream dark:border-editorial-navy-light/30 bg-white dark:bg-editorial-navy/40 text-editorial-navy dark:text-editorial-cream focus:outline-none focus:border-editorial-gold/60"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(cl.id); if (e.key === 'Escape') setAddItemState(null); }}
                          />
                          <select
                            value={addItemState.type}
                            onChange={(e) => setAddItemState((s) => s ? { ...s, type: e.target.value as ChecklistItemType } : s)}
                            className="text-xs px-2 py-1.5 rounded border border-editorial-cream dark:border-editorial-navy-light/30 bg-white dark:bg-editorial-navy/40 text-editorial-navy dark:text-editorial-cream"
                          >
                            <option>Obrigatório CFM</option>
                            <option>Recomendado</option>
                            <option>Risco/Alerta</option>
                          </select>
                          <Button size="sm" onClick={() => handleAddItem(cl.id)}>Adicionar</Button>
                          <Button size="sm" variant="ghost" onClick={() => setAddItemState(null)}>Cancelar</Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddItemState({ checklistId: cl.id, label: '', type: 'Recomendado' })}
                          className="text-xs text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream flex items-center gap-1.5 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Adicionar item
                        </button>
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
        title="Novo Checklist"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button loading={submitting} onClick={handleCreate}>Criar</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Tipo de Checklist"
            options={CHECKLIST_TYPES.map((t) => ({ label: t, value: t }))}
            value={form.checklist_type}
            onChange={(e) => setForm((f) => ({ ...f, checklist_type: e.target.value as ChecklistType }))}
          />
          <Select
            label="Procedimento"
            options={[{ label: 'Não especificado', value: '' }, ...PROCEDURE_TYPES.map((p) => ({ label: p, value: p }))]}
            value={form.procedure_type}
            onChange={(e) => setForm((f) => ({ ...f, procedure_type: e.target.value }))}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.withTemplate}
              onChange={(e) => setForm((f) => ({ ...f, withTemplate: e.target.checked }))}
              className="rounded border-editorial-cream"
            />
            <span className="text-sm text-editorial-navy dark:text-editorial-cream">Preencher com template padrão</span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
