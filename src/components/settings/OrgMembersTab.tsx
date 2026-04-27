import { useEffect, useState } from 'react';
import { Users, UserPlus, X, Mail, Shield, User, Trash2, AlertCircle } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { useAuthStore, useRole } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

interface OrgMember {
  user_id: string | null;
  org_id: string;
  full_name: string | null;
  email: string | null;
  role: 'admin' | 'doctor' | 'reception' | null;
  crm_number: string | null;
  specialty: string | null;
  phone: string | null;
  joined_at: string;
  member_status: 'active' | 'pending';
}

export default function OrgMembersTab() {
  const role = useRole();
  const isAdmin = role === 'admin';
  
  const { 
    fetchOrgMembers, 
    inviteMember, 
    updateMemberRole, 
    removeMember,
    user 
  } = useAuthStore();
  
  const showToast = useUIStore((s) => s.showToast);
  
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'doctor' | 'reception'>('doctor');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<OrgMember | null>(null);
  const [roleToUpdate, setRoleToUpdate] = useState<{ member: OrgMember; newRole: 'admin' | 'doctor' | 'reception' } | null>(null);

  const loadMembers = async () => {
    setLoading(true);
    const { data, error } = await fetchOrgMembers();
    if (error) {
      showToast(error, 'error');
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    
    setInviteLoading(true);
    const { error } = await inviteMember(inviteEmail.trim(), inviteRole);
    setInviteLoading(false);
    
    if (error) {
      showToast(error, 'error');
    } else {
      showToast('Convite enviado com sucesso', 'success');
      setShowInviteModal(false);
      setInviteEmail('');
      loadMembers();
    }
  };

  const handleCancelInvite = async (email: string) => {
    const member = members.find(m => m.email === email && m.member_status === 'pending');
    if (!member) return;
    
    // Nota: Precisaríamos do token para cancelar. Por simplicidade, vamos apenas recarregar.
    showToast('Funcionalidade de cancelamento requer token de convite', 'info');
  };

  const handleUpdateRole = async () => {
    if (!roleToUpdate) return;
    
    const { error } = await updateMemberRole(roleToUpdate.member.user_id!, roleToUpdate.newRole);
    
    if (error) {
      showToast(error, 'error');
    } else {
      showToast('Role atualizada com sucesso', 'success');
      setRoleToUpdate(null);
      loadMembers();
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove?.user_id) return;
    
    const { error } = await removeMember(memberToRemove.user_id);
    
    if (error) {
      showToast(error, 'error');
    } else {
      showToast('Membro removido com sucesso', 'success');
      setMemberToRemove(null);
      loadMembers();
    }
  };

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'doctor': return <User className="h-4 w-4" />;
      case 'reception': return <Mail className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'doctor': return 'Médico';
      case 'reception': return 'Recepção';
      default: return 'Desconhecido';
    }
  };

  const getRoleBadgeVariant = (role: string | null): 'success' | 'info' | 'neutral' | 'warning' | 'error' => {
    switch (role) {
      case 'admin': return 'success';
      case 'doctor': return 'info';
      case 'reception': return 'neutral';
      default: return 'neutral';
    }
  };

  const activeMembers = members.filter(m => m.member_status === 'active');
  const pendingInvites = members.filter(m => m.member_status === 'pending');

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
      {/* Header com botão de convidar */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-serif">
              <Users className="h-5 w-5 text-editorial-gold" />
              Membros da Organização
            </CardTitle>
            <CardDescription>
              {activeMembers.length} membros ativos · {pendingInvites.length} convites pendentes
            </CardDescription>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowInviteModal(true)} variant="primary" size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar Membro
            </Button>
          )}
        </div>
      </Card>

      {/* Lista de membros ativos */}
      <Card>
        <CardTitle className="text-base font-serif mb-4">Membros Ativos</CardTitle>
        
        {activeMembers.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="Nenhum membro ativo"
            description="Você é o único membro da organização no momento."
          />
        ) : (
          <div className="space-y-3">
            {activeMembers.map((member) => (
              <div 
                key={member.user_id} 
                className="flex items-center justify-between p-4 bg-editorial-light dark:bg-editorial-navy/40 rounded-lg border border-editorial-cream dark:border-editorial-navy-light/20"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-editorial-navy/10 dark:bg-editorial-navy/60 flex items-center justify-center">
                    {getRoleIcon(member.role)}
                  </div>
                  <div>
                    <p className="font-medium text-editorial-navy dark:text-editorial-cream">
                      {member.full_name || member.email}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-editorial-muted">
                      <span>{member.email}</span>
                      {member.crm_number && <span>· CRM: {member.crm_number}</span>}
                      {member.specialty && <span>· {member.specialty}</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    {getRoleLabel(member.role)}
                  </Badge>
                  
                  {isAdmin && member.user_id !== user?.id && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setRoleToUpdate({ member, newRole: member.role || 'doctor' })}
                        title="Alterar role"
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setMemberToRemove(member)}
                        className="text-editorial-rose hover:text-editorial-rose"
                        title="Remover membro"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Convites pendentes */}
      {isAdmin && pendingInvites.length > 0 && (
        <Card>
          <CardTitle className="text-base font-serif mb-4 flex items-center gap-2">
            <Mail className="h-4 w-4 text-editorial-gold" />
            Convites Pendentes
          </CardTitle>
          
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <div 
                key={invite.email} 
                className="flex items-center justify-between p-4 bg-editorial-gold/5 dark:bg-editorial-gold/10 rounded-lg border border-editorial-gold/20"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-editorial-gold/20 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-editorial-gold-dark" />
                  </div>
                  <div>
                    <p className="font-medium text-editorial-navy dark:text-editorial-cream">
                      {invite.email}
                    </p>
                    <p className="text-sm text-editorial-muted">
                      Aguardando aceitação · Role: {getRoleLabel(invite.role)}
                    </p>
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleCancelInvite(invite.email!)}
                  className="text-editorial-rose hover:text-editorial-rose"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal de convite */}
      <Modal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        title="Convidar Novo Membro"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-editorial-navy dark:text-editorial-cream mb-1">
              Email
            </label>
            <Input
              type="email"
              placeholder="medico@clinica.com.br"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-editorial-navy dark:text-editorial-cream mb-1">
              Função
            </label>
            <Select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'doctor' | 'reception')}
              options={[
                { value: 'doctor', label: 'Médico' },
                { value: 'reception', label: 'Recepção' },
              ]}
            />
          </div>
          
          <p className="text-sm text-editorial-muted flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            O convidado receberá um link para aceitar o convite e criar sua conta.
          </p>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={inviteLoading}>
              Enviar Convite
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de confirmação de remoção */}
      <Modal
        open={!!memberToRemove}
        onOpenChange={() => setMemberToRemove(null)}
        title="Remover Membro"
      >
        <div className="space-y-4">
          <p className="text-editorial-navy dark:text-editorial-cream">
            Tem certeza que deseja remover <strong>{memberToRemove?.full_name || memberToRemove?.email}</strong> da organização?
          </p>
          <p className="text-sm text-editorial-muted">
            Esta ação não pode ser desfeita. O usuário perderá acesso a todos os dados da clínica.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMemberToRemove(null)}>
              Cancelar
            </Button>
            <Button variant="primary" className="bg-editorial-rose hover:bg-editorial-rose" onClick={handleRemoveMember}>
              Remover
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de alteração de role */}
      <Modal
        open={!!roleToUpdate}
        onOpenChange={() => setRoleToUpdate(null)}
        title="Alterar Função"
      >
        <div className="space-y-4">
          <p className="text-editorial-navy dark:text-editorial-cream">
            Alterar função de <strong>{roleToUpdate?.member.full_name || roleToUpdate?.member.email}</strong>:
          </p>
          <Select
            value={roleToUpdate?.newRole}
            onChange={(e) => setRoleToUpdate(prev => prev ? { ...prev, newRole: e.target.value as 'admin' | 'doctor' | 'reception' } : null)}
            options={[
              { value: 'admin', label: 'Administrador' },
              { value: 'doctor', label: 'Médico' },
              { value: 'reception', label: 'Recepção' },
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRoleToUpdate(null)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleUpdateRole}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
