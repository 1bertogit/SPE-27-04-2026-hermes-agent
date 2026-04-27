import { useEffect, useState } from 'react';
import { Send, Bot, Check, AlertCircle, MessageSquare, Bell, AlertTriangle } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useTelegramStore } from '../../stores/telegramStore';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

export default function TelegramSettingsTab() {
  const { orgId, role } = useAuthStore();
  const isAdmin = role === 'admin';
  
  const { 
    settings, 
    loading, 
    fetchSettings, 
    updateSettings, 
    testConnection, 
    sendTestMessage 
  } = useTelegramStore();
  
  const showToast = useUIStore((s) => s.showToast);
  
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [alertOnCritical, setAlertOnCritical] = useState(true);
  const [alertOnMessages, setAlertOnMessages] = useState(false);
  const [alertOnErrors, setAlertOnErrors] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (orgId) {
      fetchSettings(orgId);
    }
  }, [orgId]);

  useEffect(() => {
    if (settings) {
      setBotToken(settings.bot_token || '');
      setChatId(settings.chat_id || '');
      setIsActive(settings.is_active);
      setAlertOnCritical(settings.alert_on_critical_keywords);
      setAlertOnMessages(settings.alert_on_patient_messages);
      setAlertOnErrors(settings.alert_on_system_errors);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!orgId) return;
    
    setSaving(true);
    const { error } = await updateSettings(orgId, {
      bot_token: botToken || null,
      chat_id: chatId || null,
      is_active: isActive,
      alert_on_critical_keywords: alertOnCritical,
      alert_on_patient_messages: alertOnMessages,
      alert_on_system_errors: alertOnErrors,
    });
    setSaving(false);

    if (error) {
      showToast(error, 'error');
    } else {
      showToast('Configurações salvas com sucesso', 'success');
      fetchSettings(orgId);
    }
  };

  const handleTest = async () => {
    if (!orgId) return;
    
    setTesting(true);
    const { success, error } = await testConnection(orgId);
    setTesting(false);

    if (success) {
      showToast('Conexão com Telegram OK!', 'success');
    } else {
      showToast(error || 'Falha na conexão', 'error');
    }
  };

  const handleSendTest = async () => {
    if (!orgId) return;
    
    setTesting(true);
    const { success, error } = await sendTestMessage(orgId);
    setTesting(false);

    if (success) {
      showToast('Mensagem de teste enviada!', 'success');
    } else {
      showToast(error || 'Falha ao enviar', 'error');
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-editorial-cream/50 rounded w-1/3"></div>
          <div className="h-32 bg-editorial-cream/50 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base font-serif">Alertas Telegram</CardTitle>
            <CardDescription>
              Receba notificações críticas diretamente no Telegram quando pacientes enviarem mensagens de emergência ou palavras-chave de risco forem detectadas.
            </CardDescription>
          </div>
          {isActive && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm">
              <Check className="h-4 w-4" />
              Ativo
            </div>
          )}
        </div>
      </Card>

      {/* Configuração do Bot */}
      <Card>
        <CardTitle className="text-base font-serif mb-4">Configuração do Bot</CardTitle>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-editorial-navy dark:text-editorial-cream mb-1">
              Bot Token
            </label>
            <Input
              type="password"
              placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxyz"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              disabled={!isAdmin}
            />
            <p className="text-xs text-editorial-muted mt-1">
              Obtenha com @BotFather no Telegram. Formato: números:letras
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-editorial-navy dark:text-editorial-cream mb-1">
              Chat ID
            </label>
            <Input
              placeholder="-1001234567890 ou @seu_canal"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              disabled={!isAdmin}
            />
            <p className="text-xs text-editorial-muted mt-1">
              ID do chat ou username do canal/grupo. Use @userinfobot para descobrir.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={!isAdmin}
                className="rounded border-editorial-cream text-editorial-gold focus:ring-editorial-gold"
              />
              <span className="text-sm text-editorial-navy dark:text-editorial-cream">
                Ativar alertas Telegram
              </span>
            </label>
          </div>

          {isAdmin && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleTest} 
                loading={testing}
                disabled={!botToken || !chatId}
              >
                <Check className="h-4 w-4 mr-2" />
                Testar Conexão
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSendTest} 
                loading={testing}
                disabled={!botToken || !chatId}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar Teste
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Tipos de Alerta */}
      <Card>
        <CardTitle className="text-base font-serif mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-editorial-gold" />
          Tipos de Alerta
        </CardTitle>

        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 rounded-lg bg-editorial-light dark:bg-editorial-navy/40 cursor-pointer transition-colors hover:bg-editorial-cream/30 dark:hover:bg-editorial-navy/60">
            <input
              type="checkbox"
              checked={alertOnCritical}
              onChange={(e) => setAlertOnCritical(e.target.checked)}
              disabled={!isAdmin}
              className="mt-0.5 rounded border-editorial-cream text-editorial-gold focus:ring-editorial-gold"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-editorial-rose" />
                <span className="font-medium text-editorial-navy dark:text-editorial-cream">
                  Palavras-chave críticas
                </span>
              </div>
              <p className="text-sm text-editorial-muted mt-1">
                Alerta quando pacientes usarem termos como "sangramento", "febre", "dor forte", etc.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg bg-editorial-light dark:bg-editorial-navy/40 cursor-pointer transition-colors hover:bg-editorial-cream/30 dark:hover:bg-editorial-navy/60">
            <input
              type="checkbox"
              checked={alertOnMessages}
              onChange={(e) => setAlertOnMessages(e.target.checked)}
              disabled={!isAdmin}
              className="mt-0.5 rounded border-editorial-cream text-editorial-gold focus:ring-editorial-gold"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-editorial-slate" />
                <span className="font-medium text-editorial-navy dark:text-editorial-cream">
                  Todas as mensagens de pacientes
                </span>
              </div>
              <p className="text-sm text-editorial-muted mt-1">
                Receba todas as mensagens dos pacientes em pós-operatório (pode gerar muitas notificações).
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg bg-editorial-light dark:bg-editorial-navy/40 cursor-pointer transition-colors hover:bg-editorial-cream/30 dark:hover:bg-editorial-navy/60">
            <input
              type="checkbox"
              checked={alertOnErrors}
              onChange={(e) => setAlertOnErrors(e.target.checked)}
              disabled={!isAdmin}
              className="mt-0.5 rounded border-editorial-cream text-editorial-gold focus:ring-editorial-gold"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="font-medium text-editorial-navy dark:text-editorial-cream">
                  Erros do sistema
                </span>
              </div>
              <p className="text-sm text-editorial-muted mt-1">
                Notificações sobre falhas em integrações (WhatsApp, banco de dados, etc).
              </p>
            </div>
          </label>
        </div>
      </Card>

      {/* Instruções */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Como configurar:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-300">
              <li>No Telegram, procure @BotFather e crie um novo bot</li>
              <li>Copie o token fornecido (formato: números:letras)</li>
              <li>Inicie uma conversa com seu bot e envie qualquer mensagem</li>
              <li>Use @userinfobot para descobrir seu Chat ID</li>
              <li>Cole ambos os valores acima e salve</li>
            </ol>
          </div>
        </div>
      </Card>

      {/* Botão salvar */}
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={handleSave} loading={saving}>
            <Send className="h-4 w-4 mr-2" />
            Salvar Configurações
          </Button>
        </div>
      )}
    </div>
  );
}
