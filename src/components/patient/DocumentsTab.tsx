import { useEffect, useState } from 'react';
import { FileText, Plus, CheckCircle2, Clock, XCircle, Download, Trash2, Shield } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select, Input } from '../ui/Input';
import { EmptyState } from '../ui/EmptyState';
import { useDocumentStore } from '../../stores/documentStore';
import { useUIStore } from '../../stores/uiStore';
import { formatDate } from '../../lib/utils';
import { PROCEDURE_TYPES } from '../../data/procedures';
import type { PatientDocument, DocumentType, DocumentStatus } from '../../lib/types';

const DOCUMENT_TYPES: DocumentType[] = [
  'TCI - Rinoplastia',
  'TCI - Mamoplastia de Aumento',
  'TCI - Mamoplastia Redutora',
  'TCI - Lipoaspiração',
  'TCI - Abdominoplastia',
  'TCI - Lifting Facial',
  'Contrato de Prestação de Serviços',
  'Autorização de Uso de Imagem',
  'Protocolo de Preparo Pré-operatório',
  'Política de Privacidade (LGPD)',
  'Outros',
];

const MANDATORY_DOCS: DocumentType[] = [
  'Contrato de Prestação de Serviços',
  'Autorização de Uso de Imagem',
  'Política de Privacidade (LGPD)',
];

function getDocStatusIcon(status: DocumentStatus) {
  switch (status) {
    case 'Assinado': return <CheckCircle2 className="h-4 w-4 text-editorial-sage" />;
    case 'Vencido': return <XCircle className="h-4 w-4 text-editorial-rose" />;
    case 'Cancelado': return <XCircle className="h-4 w-4 text-editorial-muted" />;
    default: return <Clock className="h-4 w-4 text-editorial-gold" />;
  }
}

function getDocStatusStyle(status: DocumentStatus) {
  switch (status) {
    case 'Assinado': return 'bg-editorial-sage/10 text-editorial-sage border-editorial-sage/20';
    case 'Vencido': return 'bg-editorial-rose/10 text-editorial-rose border-editorial-rose/20';
    case 'Cancelado': return 'bg-editorial-cream/60 text-editorial-muted border-editorial-warm/30';
    default: return 'bg-editorial-gold/10 text-editorial-gold-dark border-editorial-gold/20';
  }
}

interface Props {
  patientId: string;
}

export function DocumentsTab({ patientId }: Props) {
  const { documents, loading, fetchDocuments, createDocument, updateDocument, deleteDocument, markAsSigned } = useDocumentStore();
  const showToast = useUIStore((s) => s.showToast);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    document_type: 'Contrato de Prestação de Serviços' as DocumentType,
    procedure_type: '',
    title: '',
    status: 'Pendente' as DocumentStatus,
    notes: '',
    is_mandatory: false,
  });

  useEffect(() => {
    fetchDocuments(patientId);
  }, [patientId, fetchDocuments]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ document_type: 'Contrato de Prestação de Serviços', procedure_type: '', title: '', status: 'Pendente', notes: '', is_mandatory: false });
    setModalOpen(true);
  };

  const openEdit = (doc: PatientDocument) => {
    setEditingId(doc.id);
    setForm({
      document_type: doc.document_type,
      procedure_type: doc.procedure_type ?? '',
      title: doc.title,
      status: doc.status,
      notes: doc.notes ?? '',
      is_mandatory: doc.is_mandatory,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const title = form.title || form.document_type;
    setSubmitting(true);

    if (editingId) {
      const { error } = await updateDocument(editingId, {
        document_type: form.document_type,
        procedure_type: form.procedure_type || null,
        title,
        status: form.status,
        notes: form.notes || null,
        is_mandatory: form.is_mandatory,
      });
      if (error) showToast(error, 'error');
      else { showToast('Documento atualizado', 'success'); setModalOpen(false); }
    } else {
      const { error } = await createDocument({
        patient_id: patientId,
        evaluation_id: null,
        document_type: form.document_type,
        procedure_type: form.procedure_type || null,
        title,
        status: 'Pendente',
        signed_at: null,
        file_url: null,
        notes: form.notes || null,
        is_mandatory: MANDATORY_DOCS.includes(form.document_type) || form.is_mandatory,
      });
      if (error) showToast(error, 'error');
      else { showToast('Documento adicionado', 'success'); setModalOpen(false); }
    }
    setSubmitting(false);
  };

  const handleSign = async (id: string) => {
    const { error } = await markAsSigned(id);
    if (error) showToast(error, 'error');
    else showToast('Documento marcado como assinado', 'success');
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteDocument(id);
    if (error) showToast(error, 'error');
    else showToast('Documento removido', 'success');
  };

  const pending = documents.filter((d) => d.status === 'Pendente').length;
  const signed = documents.filter((d) => d.status === 'Assinado').length;
  const mandatory = documents.filter((d) => d.is_mandatory && d.status !== 'Assinado').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {mandatory > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-editorial-rose/10 border border-editorial-rose/20">
              <Shield className="h-3.5 w-3.5 text-editorial-rose" />
              <span className="text-xs font-medium text-editorial-rose">{mandatory} obrigatório{mandatory > 1 ? 's' : ''} pendente{mandatory > 1 ? 's' : ''}</span>
            </div>
          )}
          {mandatory === 0 && documents.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-editorial-sage/10 border border-editorial-sage/20">
              <CheckCircle2 className="h-3.5 w-3.5 text-editorial-sage" />
              <span className="text-xs font-medium text-editorial-sage">Documentação completa</span>
            </div>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {documents.length === 0 && !loading ? (
        <EmptyState
          icon={<FileText className="h-10 w-10 text-editorial-warm" />}
          title="Nenhum documento registrado"
          description="Adicione TCIs, contratos e autorizações do paciente."
          action={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />Adicionar documento</Button>}
        />
      ) : (
        <Card padding={false}>
          <div className="p-3 border-b border-editorial-cream dark:border-editorial-navy-light/20 flex gap-4 text-xs text-editorial-muted">
            <span><span className="font-medium text-editorial-navy dark:text-editorial-cream">{signed}</span> assinados</span>
            <span><span className="font-medium text-editorial-gold-dark">{pending}</span> pendentes</span>
            <span><span className="font-medium text-editorial-navy dark:text-editorial-cream">{documents.length}</span> total</span>
          </div>
          <div className="divide-y divide-editorial-cream dark:divide-editorial-navy-light/20">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-editorial-cream/30 dark:hover:bg-white/5 transition-colors">
                {getDocStatusIcon(doc.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-editorial-navy dark:text-editorial-cream truncate">{doc.title || doc.document_type}</span>
                    {doc.is_mandatory && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-editorial-rose/10 text-editorial-rose border border-editorial-rose/20 flex-shrink-0">CFM</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-editorial-muted">{doc.document_type}</span>
                    {doc.procedure_type && <span className="text-xs text-editorial-muted">· {doc.procedure_type}</span>}
                    {doc.signed_at && <span className="text-xs text-editorial-muted">· Assinado em {formatDate(doc.signed_at)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getDocStatusStyle(doc.status)}`}>{doc.status}</span>
                  {doc.status === 'Pendente' && (
                    <Button size="sm" variant="ghost" onClick={() => handleSign(doc.id)} className="text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Assinar
                    </Button>
                  )}
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="p-1.5 rounded text-editorial-muted hover:text-editorial-navy transition-colors">
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button onClick={() => openEdit(doc)} className="p-1.5 rounded text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream hover:bg-editorial-cream/50 transition-colors">
                    <FileText className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(doc.id)} className="p-1.5 rounded text-editorial-muted hover:text-editorial-rose hover:bg-editorial-rose/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Documento' : 'Novo Documento'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button loading={submitting} onClick={handleSubmit}>{editingId ? 'Salvar' : 'Adicionar'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Tipo de Documento"
            options={DOCUMENT_TYPES.map((t) => ({ label: t, value: t }))}
            value={form.document_type}
            onChange={(e) => {
              const dt = e.target.value as DocumentType;
              setForm((f) => ({ ...f, document_type: dt, title: dt, is_mandatory: MANDATORY_DOCS.includes(dt) }));
            }}
          />
          <Input
            label="Título (opcional)"
            placeholder={form.document_type}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Select
            label="Procedimento Relacionado"
            options={[{ label: 'Não especificado', value: '' }, ...PROCEDURE_TYPES.map((p) => ({ label: p, value: p }))]}
            value={form.procedure_type}
            onChange={(e) => setForm((f) => ({ ...f, procedure_type: e.target.value }))}
          />
          {editingId && (
            <Select
              label="Status"
              options={[
                { label: 'Pendente', value: 'Pendente' },
                { label: 'Assinado', value: 'Assinado' },
                { label: 'Vencido', value: 'Vencido' },
                { label: 'Cancelado', value: 'Cancelado' },
              ]}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as DocumentStatus }))}
            />
          )}
          <div>
            <label className="block text-xs font-medium text-editorial-navy/70 dark:text-editorial-cream/70 uppercase tracking-wider mb-1.5">Observações</label>
            <textarea
              className="w-full rounded-lg border border-editorial-cream dark:border-editorial-navy-light/30 bg-white dark:bg-editorial-navy/40 text-sm text-editorial-navy dark:text-editorial-cream px-3 py-2.5 resize-none h-16 focus:outline-none focus:border-editorial-gold/60 transition-colors"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_mandatory}
              onChange={(e) => setForm((f) => ({ ...f, is_mandatory: e.target.checked }))}
              className="rounded border-editorial-cream"
            />
            <span className="text-sm text-editorial-navy dark:text-editorial-cream">Obrigatório (CFM)</span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
