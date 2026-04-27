import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface TelegramSettings {
  id: string;
  org_id: string;
  bot_token: string | null;
  chat_id: string | null;
  is_active: boolean;
  alert_on_critical_keywords: boolean;
  alert_on_patient_messages: boolean;
  alert_on_system_errors: boolean;
  created_at: string;
  updated_at: string;
}

interface TelegramState {
  settings: TelegramSettings | null;
  loading: boolean;
  fetchSettings: (orgId: string) => Promise<{ error: string | null }>;
  updateSettings: (orgId: string, data: Partial<TelegramSettings>) => Promise<{ error: string | null }>;
  testConnection: (orgId: string) => Promise<{ success: boolean; error: string | null }>;
  sendTestMessage: (orgId: string) => Promise<{ success: boolean; error: string | null }>;
}

export const useTelegramStore = create<TelegramState>((set) => ({
  settings: null,
  loading: false,

  fetchSettings: async (orgId) => {
    set({ loading: true });
    
    const { data, error } = await supabase
      .from('org_telegram_settings')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle();
    
    set({ loading: false });
    
    if (error) return { error: error.message };
    if (data) set({ settings: data });
    return { error: null };
  },

  updateSettings: async (orgId, data) => {
    const { data: existing } = await supabase
      .from('org_telegram_settings')
      .select('id')
      .eq('org_id', orgId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('org_telegram_settings')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase
        .from('org_telegram_settings')
        .insert({ ...data, org_id: orgId });
      
      if (error) return { error: error.message };
    }

    return { error: null };
  },

  testConnection: async (orgId) => {
    const { data: settings } = await supabase
      .from('org_telegram_settings')
      .select('bot_token, chat_id')
      .eq('org_id', orgId)
      .maybeSingle();

    if (!settings?.bot_token || !settings?.chat_id) {
      return { success: false, error: 'Bot token e Chat ID são obrigatórios' };
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${settings.bot_token}/getMe`
      );
      
      if (!response.ok) {
        return { success: false, error: 'Token inválido ou bot não encontrado' };
      }

      const data = await response.json();
      
      if (!data.ok) {
        return { success: false, error: 'Erro na API do Telegram' };
      }

      return { success: true, error: null };
    } catch {
      return { success: false, error: 'Erro de conexão com Telegram' };
    }
  },

  sendTestMessage: async (orgId) => {
    const { data: settings } = await supabase
      .from('org_telegram_settings')
      .select('bot_token, chat_id')
      .eq('org_id', orgId)
      .maybeSingle();

    if (!settings?.bot_token || !settings?.chat_id) {
      return { success: false, error: 'Bot token e Chat ID são obrigatórios' };
    }

    const message = `🧪 *Teste SPE-M*\n\n` +
      `✅ Integração Telegram configurada com sucesso!\n\n` +
      `Você receberá alertas quando:\n` +
      `• Palavras-chave críticas forem detectadas\n` +
      `• Pacientes enviarem mensagens (se habilitado)\n` +
      `• Erros do sistema ocorrerem (se habilitado)\n\n` +
      `_Mensagem de teste enviada em ${new Date().toLocaleString('pt-BR')}_`;

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${settings.bot_token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: settings.chat_id,
            text: message,
            parse_mode: 'Markdown',
          }),
        }
      );

      if (!response.ok) {
        return { success: false, error: 'Falha ao enviar mensagem' };
      }

      const data = await response.json();
      
      if (!data.ok) {
        return { success: false, error: 'Chat ID inválido ou bot sem permissão' };
      }

      return { success: true, error: null };
    } catch {
      return { success: false, error: 'Erro de conexão' };
    }
  },
}));
