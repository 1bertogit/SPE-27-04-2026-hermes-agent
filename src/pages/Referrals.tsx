import { useEffect, useState } from 'react';
import { Users, Phone, Mail, CheckCircle, Clock, XCircle, UserPlus, TrendingUp } from 'lucide-react';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useNPSStore } from '../stores/npsStore';
import type { Referral } from '../lib/types';

const statusConfig = {
  pending: { label: 'Pendente', icon: Clock, color: 'warning' },
  contacted: { label: 'Contactado', icon: Phone, color: 'info' },
  converted: { label: 'Convertido', icon: CheckCircle, color: 'success' },
  declined: { label: 'Não Interessado', icon: XCircle, color: 'error' }
} as const;

export default function Referrals() {
  const { referrals, metrics, fetchReferrals, fetchMetrics, updateReferralStatus } = useNPSStore();
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);

  useEffect(() => {
    fetchReferrals();
    fetchMetrics();
  }, []);

  const handleStatusChange = async (id: string, status: Referral['status']) => {
    await updateReferralStatus(id, status);
    setSelectedReferral(null);
  };

  const conversionRate = metrics?.referralsConverted && metrics?.referralsSent
    ? Math.round((metrics.referralsConverted / metrics.referralsSent) * 100)
    : 0;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-light text-editorial-navy dark:text-editorial-cream mb-2">
          Programa de Indicação
        </h1>
        <p className="text-editorial-muted">
          Gerencie indicações de pacientes satisfeitos (NPS ≥ 9)
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-editorial-gold/10">
              <Users className="h-6 w-6 text-editorial-gold" />
            </div>
            <div>
              <p className="text-sm text-editorial-muted">Total Indicações</p>
              <p className="text-2xl font-semibold text-editorial-navy dark:text-editorial-cream">
                {metrics?.referralsSent || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-editorial-sage/10">
              <CheckCircle className="h-6 w-6 text-editorial-sage" />
            </div>
            <div>
              <p className="text-sm text-editorial-muted">Convertidos</p>
              <p className="text-2xl font-semibold text-editorial-navy dark:text-editorial-cream">
                {metrics?.referralsConverted || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-editorial-slate/10">
              <TrendingUp className="h-6 w-6 text-editorial-slate" />
            </div>
            <div>
              <p className="text-sm text-editorial-muted">Taxa de Conversão</p>
              <p className="text-2xl font-semibold text-editorial-navy dark:text-editorial-cream">
                {conversionRate}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-editorial-gold/10">
              <UserPlus className="h-6 w-6 text-editorial-gold" />
            </div>
            <div>
              <p className="text-sm text-editorial-muted">NPS Score</p>
              <p className="text-2xl font-semibold text-editorial-navy dark:text-editorial-cream">
                {metrics?.npsScore?.toFixed(1) || '0.0'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Lista de Referrals */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Indicações</CardTitle>
          <Button
            onClick={() => {}}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Nova Indicação
          </Button>
        </div>

        {referrals.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="Nenhuma indicação ainda"
            description="Pacientes com NPS ≥ 9 aparecerão aqui automaticamente."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-editorial-cream dark:border-editorial-navy-light">
                  <th className="text-left py-3 px-4 text-sm font-medium text-editorial-muted">Nome</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-editorial-muted">Contato</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-editorial-muted">Quem Indicou</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-editorial-muted">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-editorial-muted">Data</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-editorial-muted">Ações</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((referral) => {
                  const status = statusConfig[referral.status];
                  const StatusIcon = status.icon;
                  
                  return (
                    <tr
                      key={referral.id}
                      className="border-b border-editorial-cream/50 dark:border-editorial-navy-light/50 hover:bg-editorial-light/50 dark:hover:bg-editorial-navy/50"
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-editorial-navy dark:text-editorial-cream">
                          {referral.referred_name}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          {referral.referred_phone && (
                            <span className="text-sm text-editorial-muted flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {referral.referred_phone}
                            </span>
                          )}
                          {referral.referred_email && (
                            <span className="text-sm text-editorial-muted flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {referral.referred_email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-editorial-navy dark:text-editorial-cream">
                          {referral.referrer?.full_name || '—'}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={status.color as any} className="flex items-center gap-1 w-fit">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-editorial-muted">
                          {new Date(referral.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedReferral(referral)}
                        >
                          Editar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de edição */}
      <Modal
        open={!!selectedReferral}
        onOpenChange={() => setSelectedReferral(null)}
        title="Atualizar Status"
      >
        {selectedReferral && (
          <div className="space-y-4">
            <p className="text-editorial-muted">
              Indicação de <strong>{selectedReferral.referrer?.full_name}</strong>
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              {(['pending', 'contacted', 'converted', 'declined'] as const).map((s) => {
                const config = statusConfig[s];
                const Icon = config.icon;
                
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(selectedReferral.id, s)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedReferral.status === s
                        ? 'border-editorial-gold bg-editorial-gold/10'
                        : 'border-editorial-cream dark:border-editorial-navy-light hover:bg-editorial-light dark:hover:bg-editorial-navy'
                    }`}
                  >
                    <Icon className="h-4 w-4 mb-1" />
                    <p className="text-sm font-medium">{config.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
