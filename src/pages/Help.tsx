import { useState } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { Search, ChevronDown, Mail, HelpCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

const FAQ_SECTIONS = [
  {
    title: 'Primeiros Passos',
    items: [
      {
        question: 'Como criar minha conta no SPE-M?',
        answer:
          'Acesse a página de registro, preencha seu nome completo, e-mail, número do CRM e crie uma senha segura. Após o cadastro, você será redirecionado automaticamente para o dashboard.',
      },
      {
        question: 'Como acessar o sistema pela primeira vez?',
        answer:
          'Após criar sua conta, faça login com seu e-mail e senha. O sistema exibirá o dashboard principal com uma visão geral de todos os seus pacientes e avaliações.',
      },
      {
        question: 'Quais navegadores são suportados?',
        answer:
          'O SPE-M funciona em todos os navegadores modernos: Chrome, Firefox, Safari e Edge. Recomendamos manter seu navegador atualizado para a melhor experiência.',
      },
    ],
  },
  {
    title: 'Gerenciamento de Pacientes',
    items: [
      {
        question: 'Como cadastrar um novo paciente?',
        answer:
          'Acesse a seção "Pacientes" no menu superior e clique em "Novo Paciente". Preencha os dados pessoais, contato, endereço e histórico médico. O CPF e o nome completo são obrigatórios.',
      },
      {
        question: 'Como editar os dados de um paciente?',
        answer:
          'Na lista de pacientes, clique nos três pontos ao lado do paciente e selecione "Editar". Você também pode acessar a página de detalhes do paciente e clicar no botão "Editar".',
      },
      {
        question: 'Como funciona a classificação dos pacientes?',
        answer:
          'Os pacientes são classificados em 4 níveis (I a IV) baseados no risco cirúrgico. Classe I indica menor risco, enquanto Classe IV indica maior risco. Esta classificação auxilia no planejamento cirúrgico.',
      },
      {
        question: 'Posso filtrar e buscar pacientes?',
        answer:
          'Sim. Na lista de pacientes, utilize a barra de busca para pesquisar por nome ou CPF. Você também pode filtrar por classificação e ordenar por nome ou data de cadastro.',
      },
    ],
  },
  {
    title: 'Avaliações',
    items: [
      {
        question: 'Como iniciar uma nova avaliação?',
        answer:
          'Acesse a página de detalhes do paciente e clique em "Nova Avaliação". O sistema criará uma ficha de avaliação e abrirá o wizard com as etapas de avaliação.',
      },
      {
        question: 'Quais são as etapas da avaliação?',
        answer:
          'A avaliação possui 5 etapas: Anamnese, Exame Físico, Classificação de Risco, Planejamento Cirúrgico e Revisão Final. Cada etapa contém critérios específicos com pontuações.',
      },
      {
        question: 'Como funciona o sistema de scoring?',
        answer:
          'Cada critério possui opções com pontuações diferentes. O score total é calculado em tempo real e exibido no painel lateral. Scores acima de 80% indicam risco baixo, entre 50-80% risco moderado, e abaixo de 50% risco elevado.',
      },
      {
        question: 'Posso salvar e continuar uma avaliação depois?',
        answer:
          'Sim. Clique no botão "Salvar" a qualquer momento. A avaliação ficará com status "Em Andamento" e você pode continuá-la quando desejar acessando a lista de avaliações.',
      },
    ],
  },
  {
    title: 'Fotos e Anotações',
    items: [
      {
        question: 'Como adicionar fotos de um paciente?',
        answer:
          'Acesse a seção "Fotos", selecione o paciente desejado e faça upload das fotos em cada viewport (Frontal, Lateral, Oblíqua). Arraste a imagem ou clique na área de upload.',
      },
      {
        question: 'Como fazer anotações nas fotos?',
        answer:
          'Clique em uma foto já enviada para abrir o editor de anotações. Use as ferramentas de desenho (caneta, borracha, cores) para marcar áreas de interesse. Clique em "Salvar" ao finalizar.',
      },
      {
        question: 'Quais formatos de imagem são aceitos?',
        answer:
          'O sistema aceita imagens nos formatos JPG, PNG e WebP. Recomendamos imagens com boa resolução para melhor visualização e anotação.',
      },
    ],
  },
  {
    title: 'Relatórios',
    items: [
      {
        question: 'Que tipo de relatórios estão disponíveis?',
        answer:
          'O sistema oferece gráficos de avaliações ao longo do tempo, distribuição de pacientes por classificação e scores médios por critério de avaliação.',
      },
      {
        question: 'Posso filtrar relatórios por período?',
        answer:
          'Sim. Na página de relatórios, utilize os campos de data para definir o período desejado. Todos os gráficos serão atualizados automaticamente.',
      },
    ],
  },
  {
    title: 'Conta e Configurações',
    items: [
      {
        question: 'Como alterar meus dados pessoais?',
        answer:
          'Acesse "Configurações" no menu do perfil (canto superior direito). Na aba "Perfil", você pode atualizar seu nome, CRM, especialidade e telefone.',
      },
      {
        question: 'Como alterar dados da clínica?',
        answer:
          'Nas Configurações, acesse a aba "Clínica" para atualizar o nome, endereço e informações do local de atendimento.',
      },
      {
        question: 'Como recuperar minha senha?',
        answer:
          'Na tela de login, clique em "Esqueceu a senha?" e informe seu e-mail. Você receberá um link para redefinir sua senha.',
      },
    ],
  },
];

export default function Help() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSections = FAQ_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold font-serif text-editorial-navy dark:text-editorial-cream">Central de Ajuda</h1>
        <p className="text-sm text-editorial-muted mt-1">Encontre respostas para suas dúvidas</p>
      </div>

      <Input
        placeholder="Buscar ajuda..."
        icon={<Search className="h-4 w-4" />}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {filteredSections.length === 0 ? (
        <Card className="text-center py-12">
          <HelpCircle className="h-10 w-10 text-editorial-warm mx-auto mb-3" />
          <p className="text-sm text-editorial-muted">Nenhum resultado encontrado</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSections.map((section) => (
            <Card key={section.title} padding={false}>
              <div className="px-6 pt-5 pb-3">
                <h2 className="text-base font-semibold font-serif text-editorial-navy dark:text-editorial-cream">{section.title}</h2>
              </div>
              <Accordion.Root type="multiple" className="divide-y divide-editorial-cream dark:divide-editorial-navy-light/20">
                {section.items.map((item, index) => (
                  <Accordion.Item key={index} value={`${section.title}-${index}`}>
                    <Accordion.Trigger className="flex items-center justify-between w-full px-6 py-4 text-left text-sm text-editorial-navy/80 dark:text-editorial-cream/80 hover:text-editorial-navy dark:hover:text-editorial-cream transition-colors group">
                      <span>{item.question}</span>
                      <ChevronDown className="h-4 w-4 text-editorial-muted shrink-0 ml-4 transition-transform group-data-[state=open]:rotate-180" />
                    </Accordion.Trigger>
                    <Accordion.Content className="overflow-hidden data-[state=open]:animate-slide-down data-[state=closed]:animate-fade-in">
                      <p className="px-6 pb-4 text-sm text-editorial-muted leading-relaxed">
                        {item.answer}
                      </p>
                    </Accordion.Content>
                  </Accordion.Item>
                ))}
              </Accordion.Root>
            </Card>
          ))}
        </div>
      )}

      <Card className="text-center">
        <Mail className="h-8 w-8 text-editorial-warm mx-auto mb-3" />
        <h3 className="text-base font-semibold font-serif text-editorial-navy dark:text-editorial-cream mb-1">Precisa de mais ajuda?</h3>
        <p className="text-sm text-editorial-muted mb-4">
          Entre em contato com nossa equipe de suporte
        </p>
        <a
          href="mailto:suporte@spem.com.br"
          className="inline-flex items-center gap-2 text-sm text-editorial-gold hover:text-editorial-gold-light transition-colors"
        >
          <Mail className="h-4 w-4" />
          suporte@spem.com.br
        </a>
      </Card>
    </div>
  );
}
