import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge, getStatusBadgeVariant } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { TableRowSkeleton } from '../components/ui/Skeleton';
import { useEvaluationStore } from '../stores/evaluationStore';
import { formatDate } from '../lib/utils';

export default function Evaluations() {
  const navigate = useNavigate();
  const { evaluations, loading, fetchAllEvaluations } = useEvaluationStore();

  useEffect(() => {
    fetchAllEvaluations();
  }, [fetchAllEvaluations]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-serif text-editorial-navy dark:text-editorial-cream">Avaliacoes</h1>
        <p className="text-sm text-editorial-muted mt-1">Todas as avaliacoes realizadas</p>
      </div>

      <Card padding={false}>
        {loading ? (
          <div className="divide-y divide-editorial-cream dark:divide-editorial-navy-light/20">
            {[...Array(6)].map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </div>
        ) : evaluations.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-12 w-12" />}
            title="Nenhuma avaliacao"
            description="Inicie uma avaliacao a partir de um paciente"
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-editorial-cream dark:border-editorial-navy-light/20">
                <th className="text-left text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3">
                  Paciente
                </th>
                <th className="text-left text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                  Data
                </th>
                <th className="text-left text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-right text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((ev) => (
                <tr
                  key={ev.id}
                  className="border-b border-editorial-cream/50 hover:bg-editorial-cream/40 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => navigate(`/evaluations/${ev.id}`)}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={ev.patient?.full_name ?? 'P'} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-editorial-navy dark:text-editorial-cream">
                          {ev.patient?.full_name ?? 'Paciente'}
                        </p>
                        <p className="text-xs text-editorial-muted">{ev.patient?.cpf}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 hidden md:table-cell">
                    <span className="text-sm text-editorial-muted">{formatDate(ev.created_at)}</span>
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={getStatusBadgeVariant(ev.status)}>{ev.status}</Badge>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {ev.status === 'Concluído' ? (
                      <span className="text-sm font-semibold font-serif text-editorial-navy dark:text-editorial-cream">
                        {ev.max_score > 0 ? Math.round((ev.total_score / ev.max_score) * 100) : 0}%
                      </span>
                    ) : (
                      <span className="text-sm text-editorial-warm">---</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
