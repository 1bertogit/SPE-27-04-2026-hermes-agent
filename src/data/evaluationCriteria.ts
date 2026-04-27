import type { EvaluationStep } from '../lib/types';

export const EVALUATION_STEPS: EvaluationStep[] = [
  {
    id: 0,
    title: 'Anamnese',
    description: 'Histórico clínico e queixas do paciente',
    criteria: [
      {
        key: 'queixa_principal',
        label: 'Queixa Principal',
        maxScore: 3,
        options: [
          { label: 'Sem queixa funcional', value: 'sem_queixa', score: 3 },
          { label: 'Queixa estética leve', value: 'estetica_leve', score: 2 },
          { label: 'Queixa funcional moderada', value: 'funcional_mod', score: 1 },
          { label: 'Queixa funcional grave', value: 'funcional_grave', score: 0 },
        ],
      },
      {
        key: 'historico_cirurgico',
        label: 'Histórico Cirúrgico Prévio',
        maxScore: 3,
        options: [
          { label: 'Sem cirurgias prévias', value: 'sem_cirurgias', score: 3 },
          { label: '1 cirurgia prévia sem complicações', value: 'uma_sem_comp', score: 2 },
          { label: 'Múltiplas cirurgias prévias', value: 'multiplas', score: 1 },
          { label: 'Cirurgias com complicações', value: 'com_complicacoes', score: 0 },
        ],
      },
      {
        key: 'comorbidades',
        label: 'Comorbidades',
        maxScore: 3,
        options: [
          { label: 'Sem comorbidades', value: 'sem', score: 3 },
          { label: 'Comorbidades controladas', value: 'controladas', score: 2 },
          { label: 'Comorbidades parcialmente controladas', value: 'parciais', score: 1 },
          { label: 'Comorbidades descompensadas', value: 'descompensadas', score: 0 },
        ],
      },
      {
        key: 'uso_medicamentos',
        label: 'Uso de Medicamentos',
        maxScore: 3,
        options: [
          { label: 'Sem medicações de uso contínuo', value: 'sem_med', score: 3 },
          { label: 'Medicações sem interferência cirúrgica', value: 'sem_interferencia', score: 2 },
          { label: 'Anticoagulantes/antiplaquetários', value: 'anticoagulantes', score: 1 },
          { label: 'Múltiplas medicações de risco', value: 'multiplas_risco', score: 0 },
        ],
      },
      {
        key: 'alergias',
        label: 'Alergias',
        maxScore: 2,
        options: [
          { label: 'Sem alergias conhecidas', value: 'sem_alergias', score: 2 },
          { label: 'Alergias não relacionadas', value: 'nao_relacionadas', score: 1 },
          { label: 'Alergia a anestésicos ou látex', value: 'anestesicos', score: 0 },
        ],
      },
    ],
  },
  {
    id: 1,
    title: 'Exame Físico',
    description: 'Avaliação física e achados clínicos',
    criteria: [
      {
        key: 'estado_geral',
        label: 'Estado Geral',
        maxScore: 3,
        options: [
          { label: 'Bom estado geral (BEG)', value: 'beg', score: 3 },
          { label: 'Regular estado geral (REG)', value: 'reg', score: 2 },
          { label: 'Mau estado geral (MEG)', value: 'meg', score: 0 },
        ],
      },
      {
        key: 'imc',
        label: 'Índice de Massa Corporal (IMC)',
        maxScore: 3,
        options: [
          { label: 'Normal (18.5 - 24.9)', value: 'normal', score: 3 },
          { label: 'Sobrepeso (25 - 29.9)', value: 'sobrepeso', score: 2 },
          { label: 'Obesidade grau I (30 - 34.9)', value: 'obesidade_1', score: 1 },
          { label: 'Obesidade grau II/III (>35)', value: 'obesidade_23', score: 0 },
        ],
      },
      {
        key: 'qualidade_pele',
        label: 'Qualidade da Pele',
        maxScore: 3,
        options: [
          { label: 'Pele com boa elasticidade', value: 'boa', score: 3 },
          { label: 'Elasticidade moderada', value: 'moderada', score: 2 },
          { label: 'Pele com elasticidade reduzida', value: 'reduzida', score: 1 },
          { label: 'Pele com elasticidade muito comprometida', value: 'comprometida', score: 0 },
        ],
      },
      {
        key: 'simetria',
        label: 'Simetria Facial/Corporal',
        maxScore: 3,
        options: [
          { label: 'Simetria adequada', value: 'adequada', score: 3 },
          { label: 'Assimetria leve', value: 'leve', score: 2 },
          { label: 'Assimetria moderada', value: 'moderada', score: 1 },
          { label: 'Assimetria severa', value: 'severa', score: 0 },
        ],
      },
      {
        key: 'cicatrizacao',
        label: 'Histórico de Cicatrização',
        maxScore: 2,
        options: [
          { label: 'Cicatrização normal', value: 'normal', score: 2 },
          { label: 'Cicatriz hipertrófica prévia', value: 'hipertrofica', score: 1 },
          { label: 'Queloide prévio', value: 'queloide', score: 0 },
        ],
      },
    ],
  },
  {
    id: 2,
    title: 'Classificação de Risco',
    description: 'Avaliação de risco cirúrgico e anestésico',
    criteria: [
      {
        key: 'asa',
        label: 'Classificação ASA',
        maxScore: 4,
        options: [
          { label: 'ASA I - Paciente saudável', value: 'asa1', score: 4 },
          { label: 'ASA II - Doença sistêmica leve', value: 'asa2', score: 3 },
          { label: 'ASA III - Doença sistêmica grave', value: 'asa3', score: 1 },
          { label: 'ASA IV - Doença sistêmica grave com ameaça à vida', value: 'asa4', score: 0 },
        ],
      },
      {
        key: 'mallampati',
        label: 'Classificação de Mallampati',
        maxScore: 3,
        options: [
          { label: 'Classe I - Palato mole, fauces, úvula e pilares visíveis', value: 'mp1', score: 3 },
          { label: 'Classe II - Palato mole, fauces e úvula visíveis', value: 'mp2', score: 2 },
          { label: 'Classe III - Palato mole e base da úvula visíveis', value: 'mp3', score: 1 },
          { label: 'Classe IV - Palato mole não visível', value: 'mp4', score: 0 },
        ],
      },
      {
        key: 'risco_tromboembolico',
        label: 'Risco Tromboembólico',
        maxScore: 3,
        options: [
          { label: 'Risco baixo', value: 'baixo', score: 3 },
          { label: 'Risco moderado', value: 'moderado', score: 2 },
          { label: 'Risco alto', value: 'alto', score: 1 },
          { label: 'Risco muito alto', value: 'muito_alto', score: 0 },
        ],
      },
      {
        key: 'risco_cardiaco',
        label: 'Risco Cardíaco (Goldman)',
        maxScore: 3,
        options: [
          { label: 'Classe I - Risco mínimo', value: 'gc1', score: 3 },
          { label: 'Classe II - Risco baixo', value: 'gc2', score: 2 },
          { label: 'Classe III - Risco moderado', value: 'gc3', score: 1 },
          { label: 'Classe IV - Risco alto', value: 'gc4', score: 0 },
        ],
      },
    ],
  },
  {
    id: 3,
    title: 'Planejamento Cirúrgico',
    description: 'Definição da técnica e abordagem cirúrgica',
    criteria: [
      {
        key: 'complexidade',
        label: 'Complexidade do Procedimento',
        maxScore: 3,
        options: [
          { label: 'Procedimento simples', value: 'simples', score: 3 },
          { label: 'Procedimento moderado', value: 'moderado', score: 2 },
          { label: 'Procedimento complexo', value: 'complexo', score: 1 },
          { label: 'Procedimento de alta complexidade', value: 'alta_complex', score: 0 },
        ],
      },
      {
        key: 'tempo_estimado',
        label: 'Tempo Cirúrgico Estimado',
        maxScore: 3,
        options: [
          { label: 'Até 1 hora', value: 'ate_1h', score: 3 },
          { label: '1 a 2 horas', value: '1a2h', score: 2 },
          { label: '2 a 4 horas', value: '2a4h', score: 1 },
          { label: 'Mais de 4 horas', value: 'mais_4h', score: 0 },
        ],
      },
      {
        key: 'tipo_anestesia',
        label: 'Tipo de Anestesia',
        maxScore: 3,
        options: [
          { label: 'Local', value: 'local', score: 3 },
          { label: 'Local com sedação', value: 'local_sedacao', score: 2 },
          { label: 'Regional (raqui/peridural)', value: 'regional', score: 1 },
          { label: 'Geral', value: 'geral', score: 0 },
        ],
      },
      {
        key: 'expectativa_resultado',
        label: 'Expectativa do Paciente vs. Resultado Esperado',
        maxScore: 3,
        options: [
          { label: 'Expectativas realistas e alinhadas', value: 'realistas', score: 3 },
          { label: 'Expectativas ligeiramente elevadas', value: 'elevadas', score: 2 },
          { label: 'Expectativas moderadamente irreais', value: 'irreais_mod', score: 1 },
          { label: 'Expectativas completamente irreais', value: 'irreais', score: 0 },
        ],
      },
    ],
  },
  {
    id: 4,
    title: 'Revisão Final',
    description: 'Revisão geral e decisão sobre o procedimento',
    criteria: [
      {
        key: 'exames_laboratoriais',
        label: 'Exames Laboratoriais',
        maxScore: 3,
        options: [
          { label: 'Todos normais', value: 'normais', score: 3 },
          { label: 'Alterações leves sem impacto cirúrgico', value: 'leves', score: 2 },
          { label: 'Alterações que requerem ajuste', value: 'ajuste', score: 1 },
          { label: 'Alterações que contraindicam cirurgia', value: 'contraindicam', score: 0 },
        ],
      },
      {
        key: 'consentimento',
        label: 'Consentimento Informado',
        maxScore: 2,
        options: [
          { label: 'Paciente bem informado e consentido', value: 'informado', score: 2 },
          { label: 'Paciente com dúvidas residuais', value: 'duvidas', score: 1 },
          { label: 'Paciente não consentiu adequadamente', value: 'nao_consentiu', score: 0 },
        ],
      },
      {
        key: 'preparo_preop',
        label: 'Preparo Pré-Operatório',
        maxScore: 3,
        options: [
          { label: 'Preparo completo e adequado', value: 'completo', score: 3 },
          { label: 'Preparo parcial - ajustes necessários', value: 'parcial', score: 2 },
          { label: 'Preparo insuficiente - adiar procedimento', value: 'insuficiente', score: 0 },
        ],
      },
      {
        key: 'decisao_final',
        label: 'Decisão Cirúrgica Final',
        maxScore: 3,
        options: [
          { label: 'Apto para cirurgia - prosseguir', value: 'apto', score: 3 },
          { label: 'Apto com ressalvas - monitorar', value: 'ressalvas', score: 2 },
          { label: 'Necessário adiar - otimizar condições', value: 'adiar', score: 1 },
          { label: 'Contraindicado no momento', value: 'contraindicado', score: 0 },
        ],
      },
    ],
  },
];

export function getTotalMaxScore(): number {
  return EVALUATION_STEPS.reduce(
    (total, step) => total + step.criteria.reduce((sum, c) => sum + c.maxScore, 0),
    0
  );
}

export function getStepMaxScore(stepId: number): number {
  const step = EVALUATION_STEPS[stepId];
  if (!step) return 0;
  return step.criteria.reduce((sum, c) => sum + c.maxScore, 0);
}
