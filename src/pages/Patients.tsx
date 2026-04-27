import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Users,
  MoreHorizontal,
  Eye,
  Pencil,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Badge, getClassificationBadgeVariant, getStatusBadgeVariant } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { TableRowSkeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { usePatientStore } from '../stores/patientStore';
import { useUIStore } from '../stores/uiStore';
import { formatCPF, formatDate } from '../lib/utils';
import { useState } from 'react';
import type { Patient } from '../lib/types';

export default function Patients() {
  const navigate = useNavigate();
  const {
    patients,
    loading,
    filters,
    setFilters,
    fetchPatients,
    page,
    setPage,
    pageSize,
    totalCount,
  } = usePatientStore();
  const { deletePatient } = usePatientStore();
  const showToast = useUIStore((s) => s.showToast);
  const [searchInput, setSearchInput] = useState(filters.search);
  const [openAction, setOpenAction] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await deletePatient(deleteTarget.id);
    setDeleting(false);
    if (error) {
      showToast(error, 'error');
    } else {
      showToast('Paciente excluido com sucesso', 'success');
    }
    setDeleteTarget(null);
  };

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) setFilters({ search: searchInput });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters.search, setFilters]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif text-editorial-navy dark:text-editorial-cream">Pacientes</h1>
          <p className="text-sm text-editorial-muted mt-1">{totalCount} pacientes cadastrados</p>
        </div>
        <Button onClick={() => navigate('/patients/new')}>
          <Plus className="h-4 w-4" />
          Novo Paciente
        </Button>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-editorial-cream dark:border-editorial-navy-light/20">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome ou CPF..."
                icon={<Search className="h-4 w-4" />}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select
                options={[
                  { label: 'Classe I', value: 'I' },
                  { label: 'Classe II', value: 'II' },
                  { label: 'Classe III', value: 'III' },
                  { label: 'Classe IV', value: 'IV' },
                ]}
                placeholder="Classificacao"
                value={filters.classification}
                onChange={(e) => setFilters({ classification: e.target.value })}
                className="w-40"
              />
              <Select
                options={[
                  { label: 'Nome A-Z', value: 'name_asc' },
                  { label: 'Nome Z-A', value: 'name_desc' },
                  { label: 'Mais recentes', value: 'created_at_desc' },
                  { label: 'Mais antigos', value: 'created_at_asc' },
                ]}
                placeholder="Ordenar"
                value={filters.sortBy}
                onChange={(e) => setFilters({ sortBy: e.target.value })}
                className="w-40"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-editorial-cream dark:divide-editorial-navy-light/20">
            {[...Array(6)].map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </div>
        ) : patients.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="Nenhum paciente encontrado"
            description="Cadastre um novo paciente para comecar"
            action={
              <Button size="sm" onClick={() => navigate('/patients/new')}>
                <Plus className="h-4 w-4" />
                Novo Paciente
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-editorial-cream dark:border-editorial-navy-light/20">
                    <th className="text-left text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3">
                      Paciente
                    </th>
                    <th className="text-left text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                      CPF
                    </th>
                    <th className="text-left text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                      Classe
                    </th>
                    <th className="text-left text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                      Cadastro
                    </th>
                    <th className="text-left text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3">
                      Status
                    </th>
                    <th className="text-right text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3">
                      Acoes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="border-b border-editorial-cream/50 dark:border-editorial-navy-light/20 hover:bg-editorial-cream/40 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => navigate(`/patients/${patient.id}`)}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={patient.full_name} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-editorial-navy dark:text-editorial-cream">{patient.full_name}</p>
                            <p className="text-xs text-editorial-muted md:hidden">{formatCPF(patient.cpf)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 hidden md:table-cell">
                        <span className="text-sm text-editorial-muted font-mono">{formatCPF(patient.cpf)}</span>
                      </td>
                      <td className="px-6 py-3 hidden lg:table-cell">
                        <Badge variant={getClassificationBadgeVariant(patient.classification)}>
                          Classe {patient.classification}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 hidden lg:table-cell">
                        <span className="text-sm text-editorial-muted">{formatDate(patient.created_at)}</span>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={getStatusBadgeVariant(patient.status)}>{patient.status}</Badge>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenAction(openAction === patient.id ? null : patient.id);
                            }}
                            className="p-1.5 rounded-lg text-editorial-muted hover:text-editorial-navy/80 dark:hover:text-editorial-cream/80 hover:bg-editorial-cream/40 dark:hover:bg-white/5 transition-colors focus-ring"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {openAction === patient.id && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenAction(null);
                                }}
                              />
                              <div className="absolute right-0 top-full mt-1 w-44 bg-editorial-light dark:bg-editorial-navy/60 border border-editorial-cream dark:border-editorial-navy-light/20 rounded-lg shadow-xl z-40 py-1 animate-fade-in">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/patients/${patient.id}`);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream hover:bg-editorial-cream/40 dark:hover:bg-white/5 w-full text-left transition-colors"
                                >
                                  <Eye className="h-4 w-4" />
                                  Visualizar
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/patients/${patient.id}/edit`);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream hover:bg-editorial-cream/40 dark:hover:bg-white/5 w-full text-left transition-colors"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Editar
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/evaluations/new?patient=${patient.id}`);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream hover:bg-editorial-cream/40 dark:hover:bg-white/5 w-full text-left transition-colors"
                                >
                                  <ClipboardList className="h-4 w-4" />
                                  Nova Avaliacao
                                </button>
                                <div className="border-t border-editorial-cream dark:border-editorial-navy-light/20 my-1" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenAction(null);
                                    setDeleteTarget(patient);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-editorial-rose hover:text-editorial-rose/80 hover:bg-editorial-cream/40 dark:hover:bg-white/5 w-full text-left transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Excluir
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-editorial-cream dark:border-editorial-navy-light/20">
                <p className="text-sm text-editorial-muted">
                  Mostrando {(page - 1) * pageSize + 1} a{' '}
                  {Math.min(page * pageSize, totalCount)} de {totalCount}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(Math.max(0, page - 3), page + 2)
                    .map((p) => (
                      <Button
                        key={p}
                        variant={p === page ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setPage(p)}
                        className="w-8 h-8 p-0"
                      >
                        {p}
                      </Button>
                    ))}
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Excluir Paciente"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-editorial-rose-light border border-editorial-rose/20">
            <AlertTriangle className="h-5 w-5 text-editorial-rose shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-editorial-navy dark:text-editorial-cream">
                Tem certeza que deseja excluir <span className="font-semibold">{deleteTarget?.full_name}</span>?
              </p>
              <p className="text-xs text-editorial-muted mt-1">
                Todas as avaliacoes e fotos associadas tambem serao removidas. Esta acao nao pode ser desfeita.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              loading={deleting}
              onClick={handleDelete}
              className="bg-editorial-rose hover:bg-editorial-rose/90 text-white border-editorial-rose"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
