-- Migration: Org invites and enhanced member management
-- Created: 2026-04-27

-- Tabela de convites pendentes
CREATE TABLE IF NOT EXISTS org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'doctor', 'reception')),
  token VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_org_invites_org_id ON org_invites(org_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON org_invites(email);
CREATE INDEX IF NOT EXISTS idx_org_invites_token ON org_invites(token);
CREATE INDEX IF NOT EXISTS idx_org_invites_status ON org_invites(status);

-- RLS: Apenas membros da org podem ver convites
ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view invites" ON org_invites
  FOR SELECT USING (
    org_id = public.current_org_id()
  );

CREATE POLICY "Admins can create invites" ON org_invites
  FOR INSERT WITH CHECK (
    org_id = public.current_org_id() AND
    public.current_app_role() = 'admin'
  );

CREATE POLICY "Admins can update invites" ON org_invites
  FOR UPDATE USING (
    org_id = public.current_org_id() AND
    public.current_app_role() = 'admin'
  );

CREATE POLICY "Admins can delete invites" ON org_invites
  FOR DELETE USING (
    org_id = public.current_org_id() AND
    public.current_app_role() = 'admin'
  );

-- View para listar todos os membros da org (profiles + convites pendentes)
CREATE OR REPLACE VIEW org_members AS
SELECT 
  p.id as user_id,
  p.org_id,
  p.full_name,
  p.email,
  p.role,
  p.crm_number,
  p.specialty,
  p.phone,
  p.created_at as joined_at,
  'active' as member_status
FROM profiles p
WHERE p.org_id IS NOT NULL

UNION ALL

SELECT 
  NULL as user_id,
  oi.org_id,
  NULL as full_name,
  oi.email,
  oi.role,
  NULL as crm_number,
  NULL as specialty,
  NULL as phone,
  oi.created_at as joined_at,
  'pending' as member_status
FROM org_invites oi
WHERE oi.status = 'pending' AND oi.expires_at > now();

-- Função para aceitar convite
CREATE OR REPLACE FUNCTION accept_org_invite(
  p_token VARCHAR(64),
  p_user_id UUID
) RETURNS TABLE (
  success BOOLEAN,
  org_id UUID,
  role VARCHAR(20),
  message TEXT
) AS $$
DECLARE
  v_invite RECORD;
  v_existing_org UUID;
BEGIN
  -- Buscar convite
  SELECT * INTO v_invite FROM org_invites 
  WHERE token = p_token AND status = 'pending' AND expires_at > now();
  
  IF v_invite IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(20), 'Convite inválido ou expirado'::TEXT;
    RETURN;
  END IF;
  
  -- Verificar se usuário já está em outra org
  SELECT org_id INTO v_existing_org FROM profiles WHERE id = p_user_id;
  
  IF v_existing_org IS NOT NULL AND v_existing_org != v_invite.org_id THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(20), 'Usuário já pertence a outra organização'::TEXT;
    RETURN;
  END IF;
  
  -- Atualizar convite
  UPDATE org_invites SET
    status = 'accepted',
    accepted_at = now(),
    accepted_by = p_user_id
  WHERE id = v_invite.id;
  
  -- Atualizar perfil do usuário
  UPDATE profiles SET
    org_id = v_invite.org_id,
    role = v_invite.role
  WHERE id = p_user_id;
  
  RETURN QUERY SELECT true, v_invite.org_id, v_invite.role, 'Convite aceito com sucesso'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para cancelar convite
CREATE OR REPLACE FUNCTION cancel_org_invite(
  p_token VARCHAR(64),
  p_admin_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE org_invites SET
    status = 'cancelled'
  WHERE token = p_token 
    AND status = 'pending'
    AND org_id IN (
      SELECT org_id FROM profiles 
      WHERE id = p_admin_id AND role = 'admin'
    );
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários
COMMENT ON TABLE org_invites IS 'Convites pendentes para novos membros da organização';
COMMENT ON VIEW org_members IS 'View unificada de membros ativos e convites pendentes da org';
