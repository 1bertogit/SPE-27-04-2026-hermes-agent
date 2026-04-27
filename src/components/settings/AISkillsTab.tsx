import { useEffect, useState } from 'react';
import { Bot, Plus, Play, Trash2, Edit2, CheckCircle, Clock, Code, Settings2 } from 'lucide-react';
import { Card, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { useAIAgentStore } from '../../stores/aiAgentStore';
import type { AISkill } from '../../lib/types';

const agentTypeConfig = {
  MessageAgent: { label: 'Geração de Mensagens', icon: Bot, color: 'info' },
  ResponseAnalyzer: { label: 'Análise de Respostas', icon: CheckCircle, color: 'success' },
  DocumentGenerator: { label: 'Geração de Documentos', icon: Code, color: 'warning' }
} as const;

export default function AISkillsTab() {
  const { skills, executions, metrics, fetchSkills, fetchExecutions, fetchMetrics, createSkill, deleteSkill, executeAgent } = useAIAgentStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState({
    name: '',
    slug: '',
    agent_type: 'MessageAgent' as const,
    system_prompt: '',
    user_prompt_template: '',
    description: ''
  });

  useEffect(() => {
    fetchSkills();
    fetchExecutions(10);
    fetchMetrics();
  }, []);

  const handleCreate = async () => {
    const skill = await createSkill(newSkill);
    if (skill) {
      setShowCreateModal(false);
      setNewSkill({
        name: '',
        slug: '',
        agent_type: 'MessageAgent',
        system_prompt: '',
        user_prompt_template: '',
        description: ''
      });
    }
  };

  const handleTest = async (skill: AISkill) => {
    const execution = await executeAgent({
      agentType: skill.agent_type,
      skillSlug: skill.slug,
      input: { test_input: testInput, message_type: 'test' }
    });
    
    if (execution) {
      setTestResult(`Execução iniciada: ${execution.id}`);
      setTimeout(() => fetchExecutions(10), 2000);
    }
  };

  const systemSkills = skills.filter(s => s.is_system);
  const customSkills = skills.filter(s => !s.is_system);

  return (
    <div className="space-y-6">
      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-editorial-gold/10">
              <Play className="h-6 w-6 text-editorial-gold" />
            </div>
            <div>
              <p className="text-sm text-editorial-muted">Execuções</p>
              <p className="text-2xl font-semibold text-editorial-navy dark:text-editorial-cream">
                {metrics?.totalExecutions || 0}
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
              <p className="text-sm text-editorial-muted">Sucesso</p>
              <p className="text-2xl font-semibold text-editorial-navy dark:text-editorial-cream">
                {metrics?.completed || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-editorial-slate/10">
              <Clock className="h-6 w-6 text-editorial-slate" />
            </div>
            <div>
              <p className="text-sm text-editorial-muted">Tempo Médio</p>
              <p className="text-2xl font-semibold text-editorial-navy dark:text-editorial-cream">
                {Math.round((metrics?.avgDuration || 0) / 1000)}s
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-editorial-gold/10">
              <Settings2 className="h-6 w-6 text-editorial-gold" />
            </div>
            <div>
              <p className="text-sm text-editorial-muted">Skills</p>
              <p className="text-2xl font-semibold text-editorial-navy dark:text-editorial-cream">
                {skills.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Skills do Sistema */}
      <Card className="p-6">
        <CardTitle className="mb-4">Skills do Sistema</CardTitle>
        <div className="space-y-3">
          {systemSkills.map(skill => {
            const config = agentTypeConfig[skill.agent_type];
            const Icon = config.icon;
            
            return (
              <div
                key={skill.id}
                className="flex items-center justify-between p-4 rounded-lg border border-editorial-cream dark:border-editorial-navy-light bg-editorial-light/50 dark:bg-editorial-navy/50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-editorial-gold/10">
                    <Icon className="h-5 w-5 text-editorial-gold" />
                  </div>
                  <div>
                    <p className="font-medium text-editorial-navy dark:text-editorial-cream">
                      {skill.name}
                    </p>
                    <p className="text-sm text-editorial-muted">{skill.description}</p>
                    <Badge variant={config.color as any} className="mt-1">
                      {config.label}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Input de teste..."
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    className="px-3 py-1 text-sm rounded border border-editorial-cream dark:border-editorial-navy-light"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleTest(skill)}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Testar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Skills Customizadas */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Skills Customizadas</CardTitle>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Skill
          </Button>
        </div>

        {customSkills.length === 0 ? (
          <EmptyState
            icon={<Bot className="h-12 w-12" />}
            title="Nenhuma skill customizada"
            description="Crie skills personalizadas para automatizar tarefas específicas."
          />
        ) : (
          <div className="space-y-3">
            {customSkills.map(skill => {
              const config = agentTypeConfig[skill.agent_type];
              const Icon = config.icon;
              
              return (
                <div
                  key={skill.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-editorial-cream dark:border-editorial-navy-light"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-editorial-navy/10 dark:bg-editorial-cream/10">
                      <Icon className="h-5 w-5 text-editorial-navy dark:text-editorial-cream" />
                    </div>
                    <div>
                      <p className="font-medium text-editorial-navy dark:text-editorial-cream">
                        {skill.name}
                      </p>
                      <p className="text-sm text-editorial-muted">{skill.description}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant={config.color as any}>{config.label}</Badge>
                        {!skill.is_active && <Badge variant="error">Inativo</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {}}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteSkill(skill.id)}
                    >
                      <Trash2 className="h-4 w-4 text-editorial-rose" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Execuções Recentes */}
      <Card className="p-6">
        <CardTitle className="mb-4">Execuções Recentes</CardTitle>
        {executions.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-12 w-12" />}
            title="Nenhuma execução ainda"
            description="As execuções aparecerão aqui quando os agentes forem acionados."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-editorial-cream dark:border-editorial-navy-light">
                  <th className="text-left py-2 px-3 text-sm font-medium text-editorial-muted">Agente</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-editorial-muted">Status</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-editorial-muted">Duração</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-editorial-muted">Custo</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-editorial-muted">Início</th>
                </tr>
              </thead>
              <tbody>
                {executions.slice(0, 5).map(exec => (
                  <tr
                    key={exec.id}
                    className="border-b border-editorial-cream/50 dark:border-editorial-navy-light/50"
                  >
                    <td className="py-2 px-3">
                      <span className="text-sm text-editorial-navy dark:text-editorial-cream">
                        {exec.agent_type}
                      </span>
                      {exec.skill_name && (
                        <p className="text-xs text-editorial-muted">{exec.skill_name}</p>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <Badge
                        variant={
                          exec.status === 'completed' ? 'success' :
                          exec.status === 'failed' ? 'error' :
                          exec.status === 'running' ? 'warning' : 'neutral'
                        }
                      >
                        {exec.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-sm text-editorial-muted">
                      {exec.duration_ms ? `${exec.duration_ms}ms` : '-'}
                    </td>
                    <td className="py-2 px-3 text-sm text-editorial-muted">
                      {exec.cost_usd ? `$${exec.cost_usd.toFixed(4)}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-sm text-editorial-muted">
                      {new Date(exec.started_at).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de criação */}
      <Modal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        title="Nova Skill AI"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input
              type="text"
              value={newSkill.name}
              onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              className="w-full px-3 py-2 rounded border border-editorial-cream dark:border-editorial-navy-light"
              placeholder="Ex: Gerador de Follow-up"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Slug</label>
            <input
              type="text"
              value={newSkill.slug}
              onChange={(e) => setNewSkill({ ...newSkill, slug: e.target.value })}
              className="w-full px-3 py-2 rounded border border-editorial-cream dark:border-editorial-navy-light"
              placeholder="gerador-followup"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tipo de Agente</label>
            <select
              value={newSkill.agent_type}
              onChange={(e) => setNewSkill({ ...newSkill, agent_type: e.target.value as any })}
              className="w-full px-3 py-2 rounded border border-editorial-cream dark:border-editorial-navy-light"
            >
              <option value="MessageAgent">Geração de Mensagens</option>
              <option value="ResponseAnalyzer">Análise de Respostas</option>
              <option value="DocumentGenerator">Geração de Documentos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">System Prompt</label>
            <textarea
              value={newSkill.system_prompt}
              onChange={(e) => setNewSkill({ ...newSkill, system_prompt: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 rounded border border-editorial-cream dark:border-editorial-navy-light"
              placeholder="Defina o comportamento e persona do agente..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Template de User Prompt</label>
            <textarea
              value={newSkill.user_prompt_template}
              onChange={(e) => setNewSkill({ ...newSkill, user_prompt_template: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded border border-editorial-cream dark:border-editorial-navy-light"
              placeholder="Use {{variavel}} para placeholders dinâmicos..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <input
              type="text"
              value={newSkill.description}
              onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
              className="w-full px-3 py-2 rounded border border-editorial-cream dark:border-editorial-navy-light"
              placeholder="Breve descrição do que esta skill faz..."
            />
          </div>

          <Button onClick={handleCreate} className="w-full">
            Criar Skill
          </Button>
        </div>
      </Modal>

      {testResult && (
        <div className="fixed bottom-4 right-4 p-4 bg-editorial-gold/10 border border-editorial-gold rounded-lg">
          <p className="text-sm text-editorial-navy dark:text-editorial-cream">{testResult}</p>
        </div>
      )}
    </div>
  );
}
