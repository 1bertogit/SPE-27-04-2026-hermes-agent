import { useEffect, useState } from 'react';
import { CreditCard, Receipt, AlertCircle, CheckCircle, Clock, ArrowRight, Building2, Sparkles, Star } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useBillingStore } from '../../stores/billingStore';
import type { SubscriptionPlan } from '../../lib/types';

export default function BillingTab() {
  const {
    plans,
    currentSubscription,
    invoices,
    usage,
    fetchPlans,
    fetchCurrentSubscription,
    fetchInvoices,
    fetchUsage,
    createCheckoutSession,
    cancelSubscription,
  } = useBillingStore();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
    fetchInvoices();
    fetchUsage();
  }, [fetchPlans, fetchCurrentSubscription, fetchInvoices, fetchUsage]);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Ativo</Badge>;
      case 'trialing':
        return <Badge variant="warning">Trial</Badge>;
      case 'past_due':
        return <Badge variant="error">Pagamento pendente</Badge>;
      case 'canceled':
        return <Badge variant="neutral">Cancelado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleUpgrade = async (planId: string) => {
    setLoading(true);
    const result = await createCheckoutSession(planId);
    if (result?.url) {
      window.location.href = result.url;
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    setLoading(true);
    await cancelSubscription();
    await fetchCurrentSubscription();
    setShowCancelModal(false);
    setLoading(false);
  };

  const currentPlan = currentSubscription?.plan as SubscriptionPlan | undefined;

  return (
    <div className="space-y-6">
      {/* Status atual */}
      <Card>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Assinatura atual
        </CardTitle>
        <CardDescription>
          Gerencie seu plano e visão geral da conta
        </CardDescription>

        {currentSubscription ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between p-4 bg-editorial-light dark:bg-editorial-navy/60 rounded-lg">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-editorial-navy dark:text-editorial-cream">
                    {currentPlan?.name || 'Plano não identificado'}
                  </h3>
                  {getStatusBadge(currentSubscription.status)}
                </div>
                <p className="text-sm text-editorial-muted mt-1">
                  {currentSubscription.status === 'trialing'
                    ? `Trial termina em ${formatDate(currentSubscription.trial_end)}`
                    : `Renova em ${formatDate(currentSubscription.current_period_end)}`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-editorial-navy dark:text-editorial-cream">
                  {currentPlan ? formatPrice(currentPlan.monthly_price) : '-'}/mês
                </p>
                {currentSubscription.cancel_at_period_end && (
                  <p className="text-xs text-editorial-rose mt-1">
                    Cancelado (vigente até {formatDate(currentSubscription.current_period_end)})
                  </p>
                )}
              </div>
            </div>

            {/* Uso do período */}
            {usage && (
              <div className="p-4 border border-editorial-cream dark:border-editorial-navy-light rounded-lg">
                <h4 className="text-sm font-medium text-editorial-navy dark:text-editorial-cream mb-3">
                  Uso do período atual
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-editorial-muted">Procedimentos realizados</span>
                    <span className="text-editorial-navy dark:text-editorial-cream">
                      {usage.proceduresThisPeriod} / {usage.includedProcedures}
                    </span>
                  </div>
                  <div className="h-2 bg-editorial-cream dark:bg-editorial-navy-light rounded-full overflow-hidden">
                    <div
                      className="h-full bg-editorial-gold rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (usage.proceduresThisPeriod / usage.includedProcedures) * 100)}%`,
                      }}
                    />
                  </div>
                  {usage.overageCount > 0 && (
                    <p className="text-xs text-editorial-rose">
                      {usage.overageCount} procedimentos extras = {formatPrice(usage.overageCost)} na próxima fatura
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowUpgradeModal(true)}
                disabled={currentSubscription.status === 'canceled'}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                {currentSubscription.status === 'trialing' ? 'Escolher plano' : 'Mudar plano'}
              </Button>
              {!currentSubscription.cancel_at_period_end && currentSubscription.status !== 'canceled' && (
                <Button
                  variant="ghost"
                  onClick={() => setShowCancelModal(true)}
                >
                  Cancelar assinatura
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 text-center py-8">
            <Sparkles className="h-12 w-12 mx-auto text-editorial-muted mb-4" />
            <h3 className="font-medium text-editorial-navy dark:text-editorial-cream mb-2">
              Nenhuma assinatura ativa
            </h3>
            <p className="text-sm text-editorial-muted mb-4">
              Comece com um trial de 14 dias grátis ou escolha um plano.
            </p>
            <Button onClick={() => setShowUpgradeModal(true)}>
              Ver planos
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </Card>

      {/* Histórico de faturas */}
      <Card>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Histórico de faturas
        </CardTitle>
        <CardDescription>
          Faturas e pagamentos dos últimos 12 meses
        </CardDescription>

        {invoices.length > 0 ? (
          <div className="mt-4 space-y-2">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 bg-editorial-light dark:bg-editorial-navy/40 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {invoice.status === 'paid' ? (
                    <CheckCircle className="h-4 w-4 text-editorial-sage" />
                  ) : invoice.status === 'open' ? (
                    <Clock className="h-4 w-4 text-editorial-gold" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-editorial-rose" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-editorial-navy dark:text-editorial-cream">
                      {invoice.invoice_type === 'subscription' ? 'Assinatura' : 'Overage'}
                    </p>
                    <p className="text-xs text-editorial-muted">
                      {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-editorial-navy dark:text-editorial-cream">
                    {formatPrice(invoice.amount_due)}
                  </p>
                  <Badge
                    variant={
                      invoice.status === 'paid'
                        ? 'success'
                        : invoice.status === 'open'
                        ? 'warning'
                        : 'error'
                    }
                    className="text-xs"
                  >
                    {invoice.status === 'paid' ? 'Pago' : invoice.status === 'open' ? 'Pendente' : invoice.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 text-center py-8 text-editorial-muted">
            <Receipt className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Nenhuma fatura encontrada</p>
          </div>
        )}
      </Card>

      {/* Modal de upgrade */}
      <Modal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        title="Escolher plano"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                currentPlan?.id === plan.id
                  ? 'border-editorial-gold bg-editorial-gold/5'
                  : 'border-editorial-cream dark:border-editorial-navy-light hover:bg-editorial-light dark:hover:bg-editorial-navy/40'
              }`}
              onClick={() => currentPlan?.id !== plan.id && handleUpgrade(plan.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {plan.tier === 'starter' && <Sparkles className="h-4 w-4" />}
                  {plan.tier === 'professional' && <Star className="h-4 w-4" />}
                  {plan.tier === 'enterprise' && <Building2 className="h-4 w-4" />}
                  <span className="font-medium">{plan.name}</span>
                </div>
                {currentPlan?.id === plan.id && <Badge>Atual</Badge>}
              </div>
              <p className="text-sm text-editorial-muted mb-2">{plan.description}</p>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{formatPrice(plan.monthly_price)}/mês</span>
                <span className="text-xs text-editorial-muted">
                  {plan.included_procedures} procedimentos
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="ghost" onClick={() => setShowUpgradeModal(false)}>
            Cancelar
          </Button>
        </div>
      </Modal>

      {/* Modal de cancelamento */}
      <Modal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        title="Cancelar assinatura"
      >
        <div className="space-y-4">
          <div className="p-4 bg-editorial-rose/10 rounded-lg">
            <p className="text-sm text-editorial-rose">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              Seu acesso continuará até {formatDate(currentSubscription?.current_period_end || null)}.
              Após essa data, você não poderá criar novos pacientes ou avaliações.
            </p>
          </div>
          <p className="text-sm text-editorial-muted">
            Tem certeza que deseja cancelar? Você pode reativar sua assinatura a qualquer momento.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowCancelModal(false)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              loading={loading}
            >
              Confirmar cancelamento
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
