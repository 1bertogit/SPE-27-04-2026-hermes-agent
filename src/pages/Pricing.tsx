import { useEffect, useState } from 'react';
import { Check, Sparkles, Building2, Star, ArrowRight, Shield } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useBillingStore } from '../stores/billingStore';
import { useAuthStore } from '../stores/authStore';

export default function Pricing() {
  const { plans, fetchPlans, createCheckoutSession } = useBillingStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      window.location.href = '/register';
      return;
    }
    setLoading(planId);
    const result = await createCheckoutSession(planId);
    if (result?.url) {
      window.location.href = result.url;
    }
    setLoading(null);
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'starter': return <Sparkles className="h-5 w-5" />;
      case 'professional': return <Star className="h-5 w-5" />;
      case 'enterprise': return <Building2 className="h-5 w-5" />;
      default: return <Sparkles className="h-5 w-5" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'starter': return 'bg-editorial-sage/10 text-editorial-sage border-editorial-sage/20';
      case 'professional': return 'bg-editorial-gold/10 text-editorial-gold border-editorial-gold/20';
      case 'enterprise': return 'bg-editorial-slate/10 text-editorial-slate border-editorial-slate/20';
      default: return 'bg-editorial-sage/10 text-editorial-sage';
    }
  };

  return (
    <div className="min-h-screen bg-editorial-paper dark:bg-editorial-navy-dark">
      {/* Header */}
      <header className="border-b border-editorial-cream dark:border-editorial-navy-light/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-editorial-navy to-editorial-navy-light flex items-center justify-center">
                <span className="text-white font-playfair text-lg font-bold">S</span>
              </div>
              <span className="font-playfair text-xl font-semibold text-editorial-navy dark:text-editorial-cream">
                SPE-M
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a href="/login" className="text-sm text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream transition-colors">
                Entrar
              </a>
              <Button size="sm" onClick={() => window.location.href = '/register'}>
                Criar conta
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Badge variant="info" className="mb-4">
          <Shield className="h-3 w-3 mr-1" />
          Trial de 14 dias grátis
        </Badge>
        <h1 className="font-playfair text-4xl md:text-5xl font-bold text-editorial-navy dark:text-editorial-cream mb-4">
          Planos simples e transparentes
        </h1>
        <p className="text-lg text-editorial-muted max-w-2xl mx-auto mb-8">
          Comece gratuitamente por 14 dias. Sem cartão de crédito. 
          Cancele quando quiser.
        </p>

        {/* Toggle anual/mensal */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <span className={`text-sm ${!isYearly ? 'text-editorial-navy dark:text-editorial-cream font-medium' : 'text-editorial-muted'}`}>
            Mensal
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={`relative w-14 h-7 rounded-full transition-colors ${isYearly ? 'bg-editorial-gold' : 'bg-editorial-cream dark:bg-editorial-navy-light'}`}
          >
            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${isYearly ? 'left-8' : 'left-1'}`} />
          </button>
          <span className={`text-sm ${isYearly ? 'text-editorial-navy dark:text-editorial-cream font-medium' : 'text-editorial-muted'}`}>
            Anual <span className="text-editorial-sage">(-17%)</span>
          </span>
        </div>
      </div>

      {/* Planos */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative flex flex-col ${plan.tier === 'professional' ? 'ring-2 ring-editorial-gold shadow-lg' : ''}`}>
              {plan.tier === 'professional' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="warning">Mais Popular</Badge>
                </div>
              )}

              <div className={`p-4 rounded-lg border ${getTierColor(plan.tier)} mb-4`}>
                <div className="flex items-center gap-2 mb-2">
                  {getTierIcon(plan.tier)}
                  <span className="font-medium">{plan.name}</span>
                </div>
                <p className="text-sm opacity-80">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-editorial-navy dark:text-editorial-cream">
                    {formatPrice(isYearly ? plan.yearly_price : plan.monthly_price)}
                  </span>
                  <span className="text-editorial-muted text-sm">
                    /{isYearly ? 'ano' : 'mês'}
                  </span>
                </div>
                <p className="text-sm text-editorial-muted mt-1">
                  {plan.included_procedures} procedimentos incluídos
                </p>
              </div>

              <div className="space-y-3 mb-6 flex-1">
                {plan.features.map((feature: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-editorial-sage flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-editorial-navy dark:text-editorial-cream">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-editorial-cream dark:border-editorial-navy-light pt-4 mb-4">
                <p className="text-xs text-editorial-muted text-center">
                  Overage: {formatPrice(plan.overage_price_per_procedure)} por procedimento extra
                </p>
              </div>

              <Button
                onClick={() => handleSubscribe(plan.id)}
                loading={loading === plan.id}
                variant={plan.tier === 'professional' ? 'primary' : 'outline'}
                className="w-full"
              >
                {user ? 'Assinar agora' : 'Começar trial grátis'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Card>
          ))}
        </div>

        {/* FAQ simples */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="font-playfair text-2xl font-semibold text-center text-editorial-navy dark:text-editorial-cream mb-8">
            Perguntas frequentes
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'Posso cancelar a qualquer momento?',
                a: 'Sim, você pode cancelar sua assinatura a qualquer momento. O acesso continua até o final do período pago.',
              },
              {
                q: 'Como funciona o trial de 14 dias?',
                a: 'Você tem acesso completo a todos os recursos por 14 dias. Não precisa de cartão de crédito para começar.',
              },
              {
                q: 'O que acontece se eu exceder os procedimentos incluídos?',
                a: 'Você paga apenas R$15 por procedimento adicional. Sem surpresas.',
              },
              {
                q: 'Posso mudar de plano depois?',
                a: 'Sim, você pode fazer upgrade ou downgrade a qualquer momento. A diferença é calculada pro-rata.',
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-editorial-light dark:bg-editorial-navy/60 rounded-lg p-4">
                <h3 className="font-medium text-editorial-navy dark:text-editorial-cream mb-2">{faq.q}</h3>
                <p className="text-sm text-editorial-muted">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-editorial-cream dark:border-editorial-navy-light/20 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-editorial-muted">
            © 2026 SPE-M. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
