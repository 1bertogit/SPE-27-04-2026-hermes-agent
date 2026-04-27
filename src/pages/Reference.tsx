import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ChevronDown } from 'lucide-react';
import { getCriticalKeywords } from '../lib/keywordCheck';

type Role = 'all' | 'reception' | 'doctor';

const PROTOCOL_PHASES = [
  {
    phase: 1,
    title: 'Captação',
    description: 'Estratégia de atração e qualificação de leads',
    decisions: [
      { question: 'Lead qualificado?', yes: 'Agendar Consulta', no: 'Criar pipeline follow-up' },
    ],
    roles: ['reception', 'doctor'],
  },
  {
    phase: 2,
    title: 'Consulta Inicial',
    description: 'Anamnese completa e apresentação de opcões cirúrgicas',
    decisions: [
      { question: 'Paciente decidiu operar?', yes: 'Iniciar pré-operatório', no: 'Longo prazo (acompanhar 6-12m)' },
    ],
    roles: ['doctor'],
  },
  {
    phase: 3,
    title: 'Pré-operatório',
    description: 'Avaliação SPE-M, exames e documentação',
    decisions: [
      { question: 'SPE-M ≥ 6?', yes: 'Agendar cirurgia', no: 'Avaliar critérios SPE-M bloqueadores' },
      { question: 'Exames OK?', yes: 'Confirmar agendamento', no: 'Solicitar complementares' },
    ],
    roles: ['doctor'],
  },
  {
    phase: 4,
    title: 'Cirurgia Agendada',
    description: 'Confirmação de data e preparação final',
    decisions: [
      { question: 'Pagamento confirmado?', yes: 'Cirurgia no calendário', no: 'Pendente financeiro' },
    ],
    roles: ['reception', 'doctor'],
  },
  {
    phase: 5,
    title: 'Dia da Cirurgia',
    description: 'Checklist OMS e procedimento',
    decisions: [
      { question: 'Checklist completo?', yes: 'Liberar para sala', no: 'Completar itens obrigatórios' },
    ],
    roles: ['doctor'],
  },
  {
    phase: 6,
    title: 'Pós-op 24-48h',
    description: 'Monitoramento agudo e manejo de complicações',
    decisions: [
      { question: 'Sinais críticos detectados?', yes: 'Intervenção urgente', no: 'Alta segura' },
    ],
    roles: ['doctor'],
  },
  {
    phase: 7,
    title: 'Pós-op 7 dias',
    description: 'Reavaliação de cicatrização e prescrição',
    decisions: [
      { question: 'Cicatrização normal?', yes: 'Próxima consulta em 30d', no: 'Avaliar complicações' },
    ],
    roles: ['doctor'],
  },
  {
    phase: 8,
    title: 'Pós-op 30 dias',
    description: 'Avaliação de satisfação e satisfação preliminar',
    decisions: [
      { question: 'Satisfação ≥ 8?', yes: 'Longo prazo', no: 'Investigar insatisfação' },
    ],
    roles: ['doctor'],
  },
  {
    phase: 9,
    title: 'Longo Prazo (3-12m)',
    description: 'Acompanhamento e revisitas conforme necessário',
    decisions: [
      { question: 'Manutenção de satisfação?', yes: 'Encerrado', no: 'Continuar acompanhamento' },
    ],
    roles: ['doctor'],
  },
  {
    phase: 10,
    title: 'Fechamento (12m)',
    description: 'Conclusão do case e documentação final',
    decisions: [
      { question: 'Todas as metas atingidas?', yes: 'Case encerrado', no: 'Docuementation de desvios' },
    ],
    roles: ['doctor'],
  },
];

export default function Reference() {
  const [roleFilter, setRoleFilter] = useState<Role>('all');
  const [expandedPhase, setExpandedPhase] = useState<number | null>(1);

  const criticalKeywords = getCriticalKeywords();

  const filteredPhases = PROTOCOL_PHASES.filter(phase =>
    roleFilter === 'all' || phase.roles.includes(roleFilter as any)
  );

  return (
    <div className="min-h-screen bg-editorial-paper dark:bg-editorial-navy-dark py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-editorial-navy dark:text-editorial-cream mb-2">
            Referência Rápida
          </h1>
          <p className="text-editorial-muted dark:text-editorial-warm">
            Protocolo clínico completo e keywords críticas para WhatsApp
          </p>
        </div>

        <div className="mb-8 flex gap-3 flex-wrap">
          <Button
            onClick={() => setRoleFilter('all')}
            variant={roleFilter === 'all' ? 'primary' : 'outline'}
            className="text-xs tracking-editorial uppercase"
          >
            Todos
          </Button>
          <Button
            onClick={() => setRoleFilter('reception')}
            variant={roleFilter === 'reception' ? 'primary' : 'outline'}
            className="text-xs tracking-editorial uppercase"
          >
            Recepção
          </Button>
          <Button
            onClick={() => setRoleFilter('doctor')}
            variant={roleFilter === 'doctor' ? 'primary' : 'outline'}
            className="text-xs tracking-editorial uppercase"
          >
            Médico
          </Button>
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="text-xs tracking-editorial uppercase ml-auto"
          >
            Imprimir
          </Button>
        </div>

        <div className="space-y-4 mb-12">
          {filteredPhases.map(phase => (
            <Card key={phase.phase} className="overflow-hidden">
              <button
                onClick={() => setExpandedPhase(expandedPhase === phase.phase ? null : phase.phase)}
                className="w-full p-4 flex items-center gap-4 hover:bg-editorial-cream/50 dark:hover:bg-editorial-navy-light/20 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-editorial-gold/20 dark:bg-editorial-gold/10 flex items-center justify-center">
                  <span className="font-semibold text-editorial-gold">{phase.phase}</span>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-editorial-navy dark:text-editorial-cream">
                    {phase.title}
                  </h3>
                  <p className="text-sm text-editorial-muted dark:text-editorial-warm">
                    {phase.description}
                  </p>
                </div>
                <ChevronDown
                  className={`flex-shrink-0 text-editorial-muted transition-transform ${
                    expandedPhase === phase.phase ? 'rotate-180' : ''
                  }`}
                  size={20}
                />
              </button>

              {expandedPhase === phase.phase && (
                <div className="px-4 pb-4 pt-0 border-t border-editorial-cream dark:border-editorial-navy-light/30">
                  <div className="space-y-3">
                    {phase.decisions.map((decision, idx) => (
                      <div key={idx} className="flex gap-4 py-2">
                        <div className="flex-shrink-0 font-medium text-editorial-gold">Q:</div>
                        <div className="flex-1">
                          <p className="font-medium text-editorial-navy dark:text-editorial-cream text-sm">
                            {decision.question}
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-editorial-sage/10 dark:bg-editorial-sage/20 rounded border border-editorial-sage/30">
                              <span className="font-semibold text-editorial-sage">Sim:</span> {decision.yes}
                            </div>
                            <div className="p-2 bg-editorial-rose/10 dark:bg-editorial-rose/20 rounded border border-editorial-rose/30">
                              <span className="font-semibold text-editorial-rose">Não:</span> {decision.no}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        <Card className="bg-editorial-light dark:bg-editorial-navy/40 border-editorial-gold/30">
          <div className="p-6">
            <h2 className="text-2xl font-serif font-bold text-editorial-navy dark:text-editorial-cream mb-4">
              Keywords Críticas WhatsApp
            </h2>
            <p className="text-sm text-editorial-muted dark:text-editorial-warm mb-4">
              Se o paciente mencionar qualquer dessas palavras, contate o médico imediatamente.
            </p>
            <div className="flex flex-wrap gap-2">
              {criticalKeywords.map(keyword => (
                <Badge key={keyword} variant="error" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        <style>{`
          @media print {
            body {
              background: white;
            }
            .bg-editorial-paper,
            .dark\\:bg-editorial-navy-dark {
              background: white !important;
            }
            button {
              display: none;
            }
            .max-w-4xl {
              max-width: 100%;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
