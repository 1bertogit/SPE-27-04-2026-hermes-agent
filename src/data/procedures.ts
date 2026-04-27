export const PROCEDURE_TYPES = [
  'Rinoplastia',
  'Mamoplastia de Aumento',
  'Mamoplastia Redutora',
  'Lipoaspiração',
  'Abdominoplastia',
  'Lifting Facial',
  'Blefaroplastia',
  'Otoplastia',
  'Outros',
] as const;

export type ProcedureType = (typeof PROCEDURE_TYPES)[number];

export const PROCEDURE_PHOTO_VIEWPORTS: Record<string, string[]> = {
  Rinoplastia: ['Frontal', 'Perfil D', 'Perfil E', '3/4 D', '3/4 E', 'Base Nasal'],
  'Mamoplastia de Aumento': ['Frontal', 'Perfil D', 'Perfil E', '3/4 D', '3/4 E'],
  'Mamoplastia Redutora': ['Frontal', 'Perfil D', 'Perfil E', '3/4 D', '3/4 E'],
  Lipoaspiração: ['Frontal', 'Perfil D', 'Perfil E', 'Posterior', '3/4'],
  Abdominoplastia: ['Frontal', 'Perfil D', 'Perfil E', 'Posterior'],
  'Lifting Facial': ['Frontal', 'Perfil D', 'Perfil E', '3/4 D', '3/4 E'],
};

export const BASE_PREOP_EXAMS = [
  'Hemograma Completo',
  'Coagulograma',
  'Função Renal (Ureia e Creatinina)',
  'Glicemia de Jejum',
  'ECG (>40 anos)',
  'Avaliação Anestesiológica',
];

export const PROCEDURE_SPECIFIC_EXAMS: Record<string, string[]> = {
  'Mamoplastia de Aumento': ['Mamografia ou Ultrassom Mamário (>35 anos)'],
  'Mamoplastia Redutora': ['Mamografia ou Ultrassom Mamário (>35 anos)'],
  Lipoaspiração: ['Perfil Lipídico', 'Avaliação Nutricional (se IMC >30)'],
  Abdominoplastia: [
    'Perfil Lipídico',
    'Avaliação Nutricional (se IMC >30)',
    'Ecocardiograma (se comorbidade)',
    'Tromboprofilaxia — avaliar com anestesista',
  ],
  Rinoplastia: ['Avaliação Otorrinolaringológica (se desvio de septo associado)'],
  'Lifting Facial': [],
};

export const SUSPENSION_PROTOCOLS = [
  { medication: 'AAS e Anticoagulantes', days: 14, note: '7–14 dias antes — conforme avaliação anestesiológica' },
  { medication: 'Fitoterápicos (ômega-3, ginkgo, vitamina E)', days: 14, note: '14 dias antes' },
  { medication: 'Anti-inflamatórios', days: 7, note: '7 dias antes' },
  { medication: 'Tabagismo', days: 30, note: 'Cessar mínimo 30 dias antes e 30 dias após' },
  { medication: 'Anticoncepcionais Orais Combinados', days: 0, note: 'Avaliar com anestesiologista (risco de trombose)' },
];

export const CHECKLIST_TEMPLATES: Record<
  string,
  { label: string; item_type: 'Obrigatório CFM' | 'Recomendado' | 'Risco/Alerta' }[]
> = {
  'Liberação Cirúrgica': [
    { label: 'Todos os exames pré-operatórios realizados e normais', item_type: 'Obrigatório CFM' },
    { label: 'TCI específico do procedimento assinado', item_type: 'Obrigatório CFM' },
    { label: 'Contrato de prestação de serviços assinado', item_type: 'Obrigatório CFM' },
    { label: 'Pagamento confirmado ou financiamento aprovado', item_type: 'Obrigatório CFM' },
    { label: 'Agendamento confirmado: centro cirúrgico, anestesiologista, instrumentador', item_type: 'Recomendado' },
    { label: 'Protocolo escrito de preparo enviado ao paciente', item_type: 'Recomendado' },
    { label: 'Ligação de confirmação 48h antes realizada', item_type: 'Recomendado' },
    { label: 'Acompanhante confirmado para o dia da cirurgia e para a alta', item_type: 'Recomendado' },
    { label: 'Medicamentos de uso contínuo avaliados com anestesiologista', item_type: 'Obrigatório CFM' },
    { label: 'Protocolo de suspensão de medicamentos comunicado por escrito', item_type: 'Obrigatório CFM' },
  ],
  'Check-in Dia da Cirurgia': [
    { label: 'Confirmação de jejum: 8h sólidos, 6h leite, 2h líquidos claros (protocolo ERAS)', item_type: 'Obrigatório CFM' },
    { label: 'Revisão de alergias e medicamentos em uso', item_type: 'Obrigatório CFM' },
    { label: 'Conferência de todos os exames no prontuário', item_type: 'Obrigatório CFM' },
    { label: 'TCI assinado — verificar se está no prontuário', item_type: 'Obrigatório CFM' },
    { label: 'Identificação da paciente — pulseira ou confirmação verbal nome + data de nascimento', item_type: 'Obrigatório CFM' },
    { label: 'Marcação cirúrgica realizada com paciente em pé', item_type: 'Obrigatório CFM' },
    { label: 'Registro fotográfico final pré-operatório com marcação', item_type: 'Recomendado' },
    { label: 'Acompanhante presente e ciente das orientações de alta', item_type: 'Recomendado' },
  ],
  'Checklist OMS': [
    { label: 'SIGN IN — Identidade do paciente confirmada', item_type: 'Obrigatório CFM' },
    { label: 'SIGN IN — Sítio cirúrgico confirmado', item_type: 'Obrigatório CFM' },
    { label: 'SIGN IN — Consentimento informado verificado', item_type: 'Obrigatório CFM' },
    { label: 'SIGN IN — Alergias revisadas', item_type: 'Obrigatório CFM' },
    { label: 'SIGN IN — Risco de via aérea difícil avaliado', item_type: 'Obrigatório CFM' },
    { label: 'TIME OUT — Toda a equipe confirmou paciente, procedimento e sítio', item_type: 'Obrigatório CFM' },
    { label: 'TIME OUT — Antibiótico profilático administrado', item_type: 'Obrigatório CFM' },
    { label: 'SIGN OUT — Contagem de compressas e instrumentos', item_type: 'Obrigatório CFM' },
    { label: 'SIGN OUT — Espécime para anatomopatológico (se aplicável)', item_type: 'Obrigatório CFM' },
    { label: 'SIGN OUT — Equipamentos com problema reportados', item_type: 'Recomendado' },
  ],
  'Alta Pós-anestésica': [
    { label: 'Escala de Aldrete-Kroulik: pontuação ≥ 9', item_type: 'Obrigatório CFM' },
    { label: 'SpO₂ > 92% em ar ambiente', item_type: 'Obrigatório CFM' },
    { label: 'Pressão arterial estável (±20% do pré-operatório)', item_type: 'Obrigatório CFM' },
    { label: 'Paciente orientado e responsivo', item_type: 'Obrigatório CFM' },
    { label: 'Dor controlada (escala 0–10, ≤ 4)', item_type: 'Obrigatório CFM' },
    { label: 'Medicação prescrita entregue e explicada ao acompanhante', item_type: 'Obrigatório CFM' },
    { label: 'Sinais de alerta explicados: febre >38°C, sangramento, dispneia', item_type: 'Obrigatório CFM' },
    { label: 'Restrições imediatas explicadas: não dirigir, não ficar sozinho 24h', item_type: 'Obrigatório CFM' },
    { label: 'Cuidados com curativo explicados', item_type: 'Obrigatório CFM' },
    { label: 'Contato de emergência da clínica entregue', item_type: 'Obrigatório CFM' },
    { label: 'Data e horário da primeira revisão agendados antes da alta', item_type: 'Recomendado' },
  ],
  'Pré-operatório Geral': [
    { label: 'Anamnese completa realizada', item_type: 'Obrigatório CFM' },
    { label: 'Registro fotográfico padronizado realizado (frente, perfil, 3/4)', item_type: 'Obrigatório CFM' },
    { label: 'Alinhamento de expectativa documentado', item_type: 'Obrigatório CFM' },
    { label: 'Técnica, riscos, recuperação e resultado esperado explicados ao paciente', item_type: 'Obrigatório CFM' },
    { label: 'Orçamento itemizado entregue e assinado', item_type: 'Obrigatório CFM' },
    { label: 'Formas de pagamento e financiamento apresentadas', item_type: 'Recomendado' },
    { label: 'Material informativo sobre o procedimento entregue ao paciente', item_type: 'Recomendado' },
  ],
};

export const POSTOP_FOLLOW_UP_SCHEDULE: { type: string; days: number; mandatory: boolean; description: string }[] = [
  { type: 'Pós-op 24-48h', days: 2, mandatory: true, description: 'Curativo, drenos, dor, sinais de infecção ou hematoma' },
  { type: 'Pós-op 7 dias', days: 7, mandatory: true, description: 'Retirada de pontos, avaliação de cicatrização, edema inicial' },
  { type: 'Pós-op 30 dias', days: 30, mandatory: true, description: 'Resultado inicial, edema residual, satisfação, início de atividade física leve' },
  { type: 'Pós-op 3-6 meses', days: 120, mandatory: false, description: 'Resultado consolidado, registro fotográfico pós-op, avaliação de cicatriz' },
  { type: 'Pós-op 12 meses', days: 365, mandatory: false, description: 'Fechamento do caso, resultado definitivo, NPS e foto de resultado' },
];

export const HOW_FOUND_CLINIC_OPTIONS = [
  'Indicação de paciente',
  'Instagram',
  'Google',
  'Facebook',
  'Site da clínica',
  'WhatsApp',
  'Indicação médica',
  'Outro',
];
