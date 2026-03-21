import { IEpic, IFeature, ITask, AppLocale } from '@/types';
import { addDays } from 'date-fns';
import { rollupFeatureDates, rollupEpicDates, snapToWorkday } from './dateUtils';
import { Types } from 'mongoose';

// ─── Types ───────────────────────────────────────────────────────────────────

type TaskTemplate = {
  name: Record<AppLocale, string>;
  offsetStart: number; // days relative to now
  offsetEnd: number;
  status: string;
  completionPct: number;
  hasActualStart: boolean;
  hasActualEnd: boolean;
};

type FeatureTemplate = {
  name: Record<AppLocale, string>;
  tasks: TaskTemplate[];
};

type EpicTemplate = {
  name: Record<AppLocale, string>;
  features: FeatureTemplate[];
};

type ProjectTemplate = {
  name: Record<AppLocale, string>;
  description: Record<AppLocale, string>;
  color: string;
  epics: EpicTemplate[];
};

export type IndustryKey = 'software' | 'marketing' | 'construction' | 'education' | 'events' | 'product' | 'other';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeDate(now: Date, offsetDays: number): Date {
  const d = addDays(now, offsetDays);
  return snapToWorkday(d, offsetDays < 0 ? 'backward' : 'forward');
}

function buildTask(t: TaskTemplate, locale: AppLocale, now: Date, ownerId: string): ITask {
  const plannedStart = relativeDate(now, t.offsetStart);
  const plannedEnd = relativeDate(now, t.offsetEnd);

  return {
    _id: new Types.ObjectId().toString(),
    name: t.name[locale],
    status: t.status,
    ownerId,
    completionPct: t.completionPct,
    plannedStart: plannedStart.toISOString(),
    plannedEnd: plannedEnd.toISOString(),
    actualStart: t.hasActualStart ? plannedStart.toISOString() : undefined,
    actualEnd: t.hasActualEnd ? plannedEnd.toISOString() : undefined,
  };
}

function buildFeature(f: FeatureTemplate, locale: AppLocale, now: Date, ownerId: string): IFeature {
  const tasks = f.tasks.map((t) => buildTask(t, locale, now, ownerId));
  const feature: IFeature = {
    _id: new Types.ObjectId().toString(),
    name: f.name[locale],
    status: 'todo',
    ownerId,
    completionPct: 0,
    plannedStart: now.toISOString(),
    plannedEnd: now.toISOString(),
    tasks,
  };
  return rollupFeatureDates(feature);
}

function buildEpic(e: EpicTemplate, locale: AppLocale, now: Date, ownerId: string): IEpic {
  const features = e.features.map((f) => buildFeature(f, locale, now, ownerId));
  const epic: IEpic = {
    _id: new Types.ObjectId().toString(),
    name: e.name[locale],
    status: 'todo',
    ownerId,
    completionPct: 0,
    plannedStart: now.toISOString(),
    plannedEnd: now.toISOString(),
    features,
  };
  return rollupEpicDates(epic);
}

// ─── Template Definitions ────────────────────────────────────────────────────

// Helper to define a done task (past)
function done(name: Record<AppLocale, string>, start: number, end: number): TaskTemplate {
  return { name, offsetStart: start, offsetEnd: end, status: 'done', completionPct: 100, hasActualStart: true, hasActualEnd: true };
}

// Helper to define an in-progress task (current)
function inProgress(name: Record<AppLocale, string>, start: number, end: number, pct: number): TaskTemplate {
  return { name, offsetStart: start, offsetEnd: end, status: 'in-progress', completionPct: pct, hasActualStart: true, hasActualEnd: false };
}

// Helper to define an overdue task (planned end in the past, still in progress)
function overdue(name: Record<AppLocale, string>, start: number, end: number, pct: number): TaskTemplate {
  return { name, offsetStart: start, offsetEnd: end, status: 'in-progress', completionPct: pct, hasActualStart: true, hasActualEnd: false };
}

// Helper to define a future todo task
function todo(name: Record<AppLocale, string>, start: number, end: number): TaskTemplate {
  return { name, offsetStart: start, offsetEnd: end, status: 'todo', completionPct: 0, hasActualStart: false, hasActualEnd: false };
}

// Helper to define a blocked task
function blocked(name: Record<AppLocale, string>, start: number, end: number): TaskTemplate {
  return { name, offsetStart: start, offsetEnd: end, status: 'blocked', completionPct: 0, hasActualStart: false, hasActualEnd: false };
}

// ─── Software Development ────────────────────────────────────────────────────

const softwareTemplate: ProjectTemplate = {
  name: { en: 'Website Redesign', 'pt-BR': 'Redesign do Website', es: 'Rediseno del Sitio Web' },
  description: {
    en: 'Sample project: Full-stack website redesign with modern tech stack.',
    'pt-BR': 'Projeto exemplo: Redesign full-stack do website com stack moderna.',
    es: 'Proyecto de ejemplo: Rediseno full-stack del sitio web con stack moderno.',
  },
  color: '#6366f1',
  epics: [
    {
      name: { en: 'Backend API', 'pt-BR': 'API Backend', es: 'API Backend' },
      features: [
        {
          name: { en: 'Authentication', 'pt-BR': 'Autenticacao', es: 'Autenticacion' },
          tasks: [
            done({ en: 'Design auth flow', 'pt-BR': 'Projetar fluxo de autenticacao', es: 'Disenar flujo de autenticacion' }, -30, -25),
            done({ en: 'Implement JWT auth', 'pt-BR': 'Implementar autenticacao JWT', es: 'Implementar autenticacion JWT' }, -24, -18),
            done({ en: 'Write auth tests', 'pt-BR': 'Escrever testes de autenticacao', es: 'Escribir pruebas de autenticacion' }, -17, -15),
          ],
        },
        {
          name: { en: 'User Management', 'pt-BR': 'Gestao de Usuarios', es: 'Gestion de Usuarios' },
          tasks: [
            inProgress({ en: 'CRUD endpoints', 'pt-BR': 'Endpoints CRUD', es: 'Endpoints CRUD' }, -5, 3, 60),
            todo({ en: 'Role permissions', 'pt-BR': 'Permissoes por funcao', es: 'Permisos por rol' }, 4, 8),
          ],
        },
      ],
    },
    {
      name: { en: 'Frontend', 'pt-BR': 'Frontend', es: 'Frontend' },
      features: [
        {
          name: { en: 'Design System', 'pt-BR': 'Design System', es: 'Sistema de Diseno' },
          tasks: [
            done({ en: 'Create component library', 'pt-BR': 'Criar biblioteca de componentes', es: 'Crear libreria de componentes' }, -28, -23),
            done({ en: 'Build responsive layouts', 'pt-BR': 'Construir layouts responsivos', es: 'Construir layouts responsivos' }, -22, -20),
          ],
        },
        {
          name: { en: 'User Dashboard', 'pt-BR': 'Painel do Usuario', es: 'Panel del Usuario' },
          tasks: [
            overdue({ en: 'Dashboard wireframes', 'pt-BR': 'Wireframes do painel', es: 'Wireframes del panel' }, -10, -3, 70),
            inProgress({ en: 'Implement dashboard', 'pt-BR': 'Implementar painel', es: 'Implementar panel' }, -2, 10, 40),
            todo({ en: 'Dashboard tests', 'pt-BR': 'Testes do painel', es: 'Pruebas del panel' }, 11, 20),
          ],
        },
      ],
    },
    {
      name: { en: 'Launch Preparation', 'pt-BR': 'Preparacao para Lancamento', es: 'Preparacion para Lanzamiento' },
      features: [
        {
          name: { en: 'QA & Testing', 'pt-BR': 'QA e Testes', es: 'QA y Pruebas' },
          tasks: [
            blocked({ en: 'Integration tests', 'pt-BR': 'Testes de integracao', es: 'Pruebas de integracion' }, 10, 15),
            todo({ en: 'Performance testing', 'pt-BR': 'Testes de performance', es: 'Pruebas de rendimiento' }, 16, 20),
          ],
        },
        {
          name: { en: 'Deployment', 'pt-BR': 'Deploy', es: 'Despliegue' },
          tasks: [
            todo({ en: 'CI/CD setup', 'pt-BR': 'Configurar CI/CD', es: 'Configurar CI/CD' }, 21, 25),
            todo({ en: 'Production deploy', 'pt-BR': 'Deploy em producao', es: 'Despliegue en produccion' }, 26, 30),
          ],
        },
      ],
    },
  ],
};

// ─── Marketing ───────────────────────────────────────────────────────────────

const marketingTemplate: ProjectTemplate = {
  name: { en: 'Q2 Marketing Campaign', 'pt-BR': 'Campanha de Marketing Q2', es: 'Campana de Marketing Q2' },
  description: {
    en: 'Sample project: Multi-channel marketing campaign plan.',
    'pt-BR': 'Projeto exemplo: Plano de campanha de marketing multicanal.',
    es: 'Proyecto de ejemplo: Plan de campana de marketing multicanal.',
  },
  color: '#ec4899',
  epics: [
    {
      name: { en: 'Market Research', 'pt-BR': 'Pesquisa de Mercado', es: 'Investigacion de Mercado' },
      features: [
        {
          name: { en: 'Competitor Analysis', 'pt-BR': 'Analise de Concorrentes', es: 'Analisis de Competencia' },
          tasks: [
            done({ en: 'Identify top competitors', 'pt-BR': 'Identificar principais concorrentes', es: 'Identificar principales competidores' }, -25, -20),
            done({ en: 'SWOT analysis report', 'pt-BR': 'Relatorio analise SWOT', es: 'Informe analisis FODA' }, -19, -14),
          ],
        },
        {
          name: { en: 'Customer Surveys', 'pt-BR': 'Pesquisas com Clientes', es: 'Encuestas a Clientes' },
          tasks: [
            done({ en: 'Design survey questions', 'pt-BR': 'Elaborar perguntas da pesquisa', es: 'Disenar preguntas de encuesta' }, -22, -18),
            done({ en: 'Distribute & collect responses', 'pt-BR': 'Distribuir e coletar respostas', es: 'Distribuir y recopilar respuestas' }, -17, -8),
            inProgress({ en: 'Analyze results', 'pt-BR': 'Analisar resultados', es: 'Analizar resultados' }, -7, 2, 55),
          ],
        },
      ],
    },
    {
      name: { en: 'Content Creation', 'pt-BR': 'Criacao de Conteudo', es: 'Creacion de Contenido' },
      features: [
        {
          name: { en: 'Blog Posts', 'pt-BR': 'Posts do Blog', es: 'Publicaciones del Blog' },
          tasks: [
            overdue({ en: 'Write SEO strategy post', 'pt-BR': 'Escrever post sobre estrategia SEO', es: 'Escribir post sobre estrategia SEO' }, -8, -2, 60),
            todo({ en: 'Write product comparison', 'pt-BR': 'Escrever comparativo de produtos', es: 'Escribir comparativa de productos' }, 1, 5),
          ],
        },
        {
          name: { en: 'Social Media', 'pt-BR': 'Redes Sociais', es: 'Redes Sociales' },
          tasks: [
            inProgress({ en: 'Create content calendar', 'pt-BR': 'Criar calendario de conteudo', es: 'Crear calendario de contenido' }, -3, 4, 45),
            todo({ en: 'Design graphics', 'pt-BR': 'Criar artes graficas', es: 'Disenar graficos' }, 5, 10),
            todo({ en: 'Schedule posts', 'pt-BR': 'Agendar publicacoes', es: 'Programar publicaciones' }, 11, 15),
          ],
        },
      ],
    },
    {
      name: { en: 'Campaign Launch', 'pt-BR': 'Lancamento da Campanha', es: 'Lanzamiento de Campana' },
      features: [
        {
          name: { en: 'Email Marketing', 'pt-BR': 'E-mail Marketing', es: 'Email Marketing' },
          tasks: [
            blocked({ en: 'Design email templates', 'pt-BR': 'Criar templates de e-mail', es: 'Disenar plantillas de email' }, 8, 14),
            todo({ en: 'Set up automation', 'pt-BR': 'Configurar automacao', es: 'Configurar automatizacion' }, 15, 20),
          ],
        },
        {
          name: { en: 'Analytics & Tracking', 'pt-BR': 'Analise e Rastreamento', es: 'Analitica y Seguimiento' },
          tasks: [
            todo({ en: 'Set up tracking pixels', 'pt-BR': 'Configurar pixels de rastreamento', es: 'Configurar pixeles de seguimiento' }, 18, 24),
            todo({ en: 'Build reporting dashboard', 'pt-BR': 'Construir painel de relatorios', es: 'Construir panel de informes' }, 25, 30),
          ],
        },
      ],
    },
  ],
};

// ─── Construction ────────────────────────────────────────────────────────────

const constructionTemplate: ProjectTemplate = {
  name: { en: 'Office Renovation', 'pt-BR': 'Reforma do Escritorio', es: 'Renovacion de Oficina' },
  description: {
    en: 'Sample project: Commercial office renovation project.',
    'pt-BR': 'Projeto exemplo: Reforma de escritorio comercial.',
    es: 'Proyecto de ejemplo: Renovacion de oficina comercial.',
  },
  color: '#f97316',
  epics: [
    {
      name: { en: 'Planning & Permits', 'pt-BR': 'Planejamento e Licencas', es: 'Planificacion y Permisos' },
      features: [
        {
          name: { en: 'Design Phase', 'pt-BR': 'Fase de Projeto', es: 'Fase de Diseno' },
          tasks: [
            done({ en: 'Architectural drawings', 'pt-BR': 'Desenhos arquitetonicos', es: 'Dibujos arquitectonicos' }, -35, -28),
            done({ en: 'Structural engineering review', 'pt-BR': 'Revisao de engenharia estrutural', es: 'Revision de ingenieria estructural' }, -27, -22),
          ],
        },
        {
          name: { en: 'Permits', 'pt-BR': 'Licencas', es: 'Permisos' },
          tasks: [
            done({ en: 'Building permit application', 'pt-BR': 'Solicitacao de alvara', es: 'Solicitud de permiso de obra' }, -21, -15),
            overdue({ en: 'Permit approval wait', 'pt-BR': 'Aguardar aprovacao do alvara', es: 'Espera de aprobacion de permiso' }, -14, -5, 80),
          ],
        },
      ],
    },
    {
      name: { en: 'Demolition & Structure', 'pt-BR': 'Demolicao e Estrutura', es: 'Demolicion y Estructura' },
      features: [
        {
          name: { en: 'Interior Demolition', 'pt-BR': 'Demolicao Interna', es: 'Demolicion Interior' },
          tasks: [
            inProgress({ en: 'Remove old fixtures', 'pt-BR': 'Remover instalacoes antigas', es: 'Retirar instalaciones antiguas' }, -3, 5, 50),
            todo({ en: 'Waste disposal', 'pt-BR': 'Descarte de residuos', es: 'Eliminacion de residuos' }, 3, 7),
          ],
        },
        {
          name: { en: 'Structural Work', 'pt-BR': 'Obra Estrutural', es: 'Trabajo Estructural' },
          tasks: [
            todo({ en: 'Steel reinforcement', 'pt-BR': 'Reforco de aco', es: 'Refuerzo de acero' }, 8, 18),
            todo({ en: 'Concrete pouring', 'pt-BR': 'Concretagem', es: 'Vertido de concreto' }, 19, 25),
          ],
        },
      ],
    },
    {
      name: { en: 'Finishing', 'pt-BR': 'Acabamento', es: 'Acabados' },
      features: [
        {
          name: { en: 'Electrical & Plumbing', 'pt-BR': 'Eletrica e Hidraulica', es: 'Electricidad y Fontaneria' },
          tasks: [
            blocked({ en: 'Electrical wiring', 'pt-BR': 'Instalacao eletrica', es: 'Cableado electrico' }, 20, 28),
            todo({ en: 'Plumbing installation', 'pt-BR': 'Instalacao hidraulica', es: 'Instalacion de fontaneria' }, 25, 32),
          ],
        },
        {
          name: { en: 'Interior Finish', 'pt-BR': 'Acabamento Interno', es: 'Acabado Interior' },
          tasks: [
            todo({ en: 'Flooring installation', 'pt-BR': 'Instalacao de piso', es: 'Instalacion de pisos' }, 33, 38),
            todo({ en: 'Painting & decoration', 'pt-BR': 'Pintura e decoracao', es: 'Pintura y decoracion' }, 39, 45),
          ],
        },
      ],
    },
  ],
};

// ─── Education ───────────────────────────────────────────────────────────────

const educationTemplate: ProjectTemplate = {
  name: { en: 'New Course Development', 'pt-BR': 'Desenvolvimento de Novo Curso', es: 'Desarrollo de Nuevo Curso' },
  description: {
    en: 'Sample project: Online course design and launch.',
    'pt-BR': 'Projeto exemplo: Design e lancamento de curso online.',
    es: 'Proyecto de ejemplo: Diseno y lanzamiento de curso en linea.',
  },
  color: '#10b981',
  epics: [
    {
      name: { en: 'Curriculum Design', 'pt-BR': 'Design Curricular', es: 'Diseno Curricular' },
      features: [
        {
          name: { en: 'Course Outline', 'pt-BR': 'Estrutura do Curso', es: 'Esquema del Curso' },
          tasks: [
            done({ en: 'Define learning objectives', 'pt-BR': 'Definir objetivos de aprendizagem', es: 'Definir objetivos de aprendizaje' }, -28, -23),
            done({ en: 'Create module structure', 'pt-BR': 'Criar estrutura de modulos', es: 'Crear estructura de modulos' }, -22, -18),
            done({ en: 'Design assessment criteria', 'pt-BR': 'Definir criterios de avaliacao', es: 'Disenar criterios de evaluacion' }, -17, -14),
          ],
        },
        {
          name: { en: 'Content Research', 'pt-BR': 'Pesquisa de Conteudo', es: 'Investigacion de Contenido' },
          tasks: [
            done({ en: 'Gather reference materials', 'pt-BR': 'Reunir materiais de referencia', es: 'Reunir materiales de referencia' }, -20, -12),
            inProgress({ en: 'Review industry best practices', 'pt-BR': 'Revisar melhores praticas do setor', es: 'Revisar mejores practicas del sector' }, -8, 1, 65),
          ],
        },
      ],
    },
    {
      name: { en: 'Content Production', 'pt-BR': 'Producao de Conteudo', es: 'Produccion de Contenido' },
      features: [
        {
          name: { en: 'Video Lessons', 'pt-BR': 'Videoaulas', es: 'Video Lecciones' },
          tasks: [
            overdue({ en: 'Script writing', 'pt-BR': 'Elaboracao de roteiros', es: 'Redaccion de guiones' }, -10, -4, 75),
            inProgress({ en: 'Record video content', 'pt-BR': 'Gravar conteudo em video', es: 'Grabar contenido en video' }, -3, 8, 35),
            todo({ en: 'Edit and post-production', 'pt-BR': 'Edicao e pos-producao', es: 'Edicion y posproduccion' }, 9, 18),
          ],
        },
        {
          name: { en: 'Supplementary Materials', 'pt-BR': 'Materiais Complementares', es: 'Materiales Complementarios' },
          tasks: [
            todo({ en: 'Create worksheets', 'pt-BR': 'Criar fichas de exercicios', es: 'Crear hojas de trabajo' }, 12, 18),
            todo({ en: 'Build quizzes', 'pt-BR': 'Criar questionarios', es: 'Crear cuestionarios' }, 19, 24),
          ],
        },
      ],
    },
    {
      name: { en: 'Launch & Assessment', 'pt-BR': 'Lancamento e Avaliacao', es: 'Lanzamiento y Evaluacion' },
      features: [
        {
          name: { en: 'Platform Setup', 'pt-BR': 'Configuracao da Plataforma', es: 'Configuracion de Plataforma' },
          tasks: [
            blocked({ en: 'Upload content to LMS', 'pt-BR': 'Enviar conteudo para o LMS', es: 'Subir contenido al LMS' }, 20, 25),
            todo({ en: 'Configure enrollment', 'pt-BR': 'Configurar matriculas', es: 'Configurar inscripciones' }, 26, 28),
          ],
        },
        {
          name: { en: 'Beta Testing', 'pt-BR': 'Testes Beta', es: 'Pruebas Beta' },
          tasks: [
            todo({ en: 'Recruit beta students', 'pt-BR': 'Recrutar alunos beta', es: 'Reclutar estudiantes beta' }, 25, 28),
            todo({ en: 'Collect feedback & iterate', 'pt-BR': 'Coletar feedback e iterar', es: 'Recopilar feedback e iterar' }, 29, 35),
          ],
        },
      ],
    },
  ],
};

// ─── Event Planning ──────────────────────────────────────────────────────────

const eventsTemplate: ProjectTemplate = {
  name: { en: 'Annual Conference', 'pt-BR': 'Conferencia Anual', es: 'Conferencia Anual' },
  description: {
    en: 'Sample project: Corporate conference planning and execution.',
    'pt-BR': 'Projeto exemplo: Planejamento e execucao de conferencia corporativa.',
    es: 'Proyecto de ejemplo: Planificacion y ejecucion de conferencia corporativa.',
  },
  color: '#8b5cf6',
  epics: [
    {
      name: { en: 'Venue & Logistics', 'pt-BR': 'Local e Logistica', es: 'Lugar y Logistica' },
      features: [
        {
          name: { en: 'Venue Selection', 'pt-BR': 'Selecao do Local', es: 'Seleccion del Lugar' },
          tasks: [
            done({ en: 'Research venue options', 'pt-BR': 'Pesquisar opcoes de local', es: 'Investigar opciones de lugar' }, -30, -24),
            done({ en: 'Negotiate contract', 'pt-BR': 'Negociar contrato', es: 'Negociar contrato' }, -23, -18),
            done({ en: 'Sign venue agreement', 'pt-BR': 'Assinar contrato do local', es: 'Firmar acuerdo del lugar' }, -17, -15),
          ],
        },
        {
          name: { en: 'Catering & AV', 'pt-BR': 'Catering e Audiovisual', es: 'Catering y Audiovisual' },
          tasks: [
            inProgress({ en: 'Select catering vendor', 'pt-BR': 'Selecionar fornecedor de catering', es: 'Seleccionar proveedor de catering' }, -5, 3, 50),
            todo({ en: 'AV equipment rental', 'pt-BR': 'Aluguel de equipamento AV', es: 'Alquiler de equipo AV' }, 4, 10),
          ],
        },
      ],
    },
    {
      name: { en: 'Program & Speakers', 'pt-BR': 'Programa e Palestrantes', es: 'Programa y Ponentes' },
      features: [
        {
          name: { en: 'Speaker Management', 'pt-BR': 'Gestao de Palestrantes', es: 'Gestion de Ponentes' },
          tasks: [
            done({ en: 'Create speaker shortlist', 'pt-BR': 'Criar lista de palestrantes', es: 'Crear lista de ponentes' }, -26, -20),
            overdue({ en: 'Confirm speaker lineup', 'pt-BR': 'Confirmar lineup de palestrantes', es: 'Confirmar lineup de ponentes' }, -12, -4, 70),
            inProgress({ en: 'Collect speaker bios & materials', 'pt-BR': 'Coletar bios e materiais', es: 'Recopilar bios y materiales' }, -3, 6, 40),
          ],
        },
        {
          name: { en: 'Agenda Design', 'pt-BR': 'Design da Agenda', es: 'Diseno de Agenda' },
          tasks: [
            todo({ en: 'Draft session schedule', 'pt-BR': 'Rascunhar cronograma das sessoes', es: 'Crear borrador del cronograma' }, 5, 12),
            todo({ en: 'Design printed program', 'pt-BR': 'Design do programa impresso', es: 'Disenar programa impreso' }, 13, 18),
          ],
        },
      ],
    },
    {
      name: { en: 'Marketing & Registration', 'pt-BR': 'Marketing e Inscricoes', es: 'Marketing e Inscripciones' },
      features: [
        {
          name: { en: 'Promotion', 'pt-BR': 'Promocao', es: 'Promocion' },
          tasks: [
            blocked({ en: 'Launch event website', 'pt-BR': 'Lancar site do evento', es: 'Lanzar sitio web del evento' }, 10, 16),
            todo({ en: 'Email campaign to attendees', 'pt-BR': 'Campanha de e-mail para participantes', es: 'Campana de email a asistentes' }, 17, 22),
          ],
        },
        {
          name: { en: 'Registration', 'pt-BR': 'Inscricoes', es: 'Inscripciones' },
          tasks: [
            todo({ en: 'Set up registration platform', 'pt-BR': 'Configurar plataforma de inscricoes', es: 'Configurar plataforma de inscripciones' }, 20, 25),
            todo({ en: 'Manage early-bird tickets', 'pt-BR': 'Gerenciar ingressos early-bird', es: 'Gestionar entradas early-bird' }, 26, 32),
          ],
        },
      ],
    },
  ],
};

// ─── Product Launch ──────────────────────────────────────────────────────────

const productTemplate: ProjectTemplate = {
  name: { en: 'Product v2.0 Launch', 'pt-BR': 'Lancamento Produto v2.0', es: 'Lanzamiento Producto v2.0' },
  description: {
    en: 'Sample project: Major product version launch plan.',
    'pt-BR': 'Projeto exemplo: Plano de lancamento de versao principal do produto.',
    es: 'Proyecto de ejemplo: Plan de lanzamiento de version principal del producto.',
  },
  color: '#0ea5e9',
  epics: [
    {
      name: { en: 'Development', 'pt-BR': 'Desenvolvimento', es: 'Desarrollo' },
      features: [
        {
          name: { en: 'Core Features', 'pt-BR': 'Funcionalidades Principais', es: 'Funcionalidades Principales' },
          tasks: [
            done({ en: 'Feature specifications', 'pt-BR': 'Especificacoes das funcionalidades', es: 'Especificaciones de funcionalidades' }, -30, -24),
            done({ en: 'Backend implementation', 'pt-BR': 'Implementacao backend', es: 'Implementacion backend' }, -23, -12),
            done({ en: 'Frontend implementation', 'pt-BR': 'Implementacao frontend', es: 'Implementacion frontend' }, -18, -8),
          ],
        },
        {
          name: { en: 'Testing & QA', 'pt-BR': 'Testes e QA', es: 'Pruebas y QA' },
          tasks: [
            overdue({ en: 'Unit & integration tests', 'pt-BR': 'Testes unitarios e de integracao', es: 'Pruebas unitarias y de integracion' }, -10, -3, 65),
            inProgress({ en: 'User acceptance testing', 'pt-BR': 'Testes de aceitacao do usuario', es: 'Pruebas de aceptacion del usuario' }, -2, 5, 40),
            todo({ en: 'Bug fixes & polish', 'pt-BR': 'Correcao de bugs e polimento', es: 'Correccion de bugs y pulido' }, 6, 12),
          ],
        },
      ],
    },
    {
      name: { en: 'Go-to-Market', 'pt-BR': 'Go-to-Market', es: 'Go-to-Market' },
      features: [
        {
          name: { en: 'Marketing Materials', 'pt-BR': 'Materiais de Marketing', es: 'Materiales de Marketing' },
          tasks: [
            inProgress({ en: 'Landing page copy', 'pt-BR': 'Texto da landing page', es: 'Texto de la landing page' }, -4, 4, 55),
            todo({ en: 'Product demo video', 'pt-BR': 'Video de demonstracao', es: 'Video de demostracion' }, 5, 12),
          ],
        },
        {
          name: { en: 'Sales Enablement', 'pt-BR': 'Habilitacao de Vendas', es: 'Habilitacion de Ventas' },
          tasks: [
            todo({ en: 'Update sales deck', 'pt-BR': 'Atualizar deck de vendas', es: 'Actualizar deck de ventas' }, 8, 14),
            todo({ en: 'Train sales team', 'pt-BR': 'Treinar equipe de vendas', es: 'Capacitar equipo de ventas' }, 15, 20),
          ],
        },
      ],
    },
    {
      name: { en: 'Launch Execution', 'pt-BR': 'Execucao do Lancamento', es: 'Ejecucion del Lanzamiento' },
      features: [
        {
          name: { en: 'Release Management', 'pt-BR': 'Gestao de Release', es: 'Gestion de Release' },
          tasks: [
            blocked({ en: 'Staging deployment', 'pt-BR': 'Deploy em staging', es: 'Despliegue en staging' }, 18, 22),
            todo({ en: 'Production rollout', 'pt-BR': 'Rollout em producao', es: 'Rollout en produccion' }, 23, 26),
          ],
        },
        {
          name: { en: 'Post-Launch', 'pt-BR': 'Pos-Lancamento', es: 'Post-Lanzamiento' },
          tasks: [
            todo({ en: 'Monitor metrics & errors', 'pt-BR': 'Monitorar metricas e erros', es: 'Monitorear metricas y errores' }, 27, 32),
            todo({ en: 'Customer feedback collection', 'pt-BR': 'Coleta de feedback de clientes', es: 'Recopilacion de feedback de clientes' }, 28, 35),
          ],
        },
      ],
    },
  ],
};

// ─── Other / General ─────────────────────────────────────────────────────────

const otherTemplate: ProjectTemplate = {
  name: { en: 'Sample Project', 'pt-BR': 'Projeto Exemplo', es: 'Proyecto de Ejemplo' },
  description: {
    en: 'Sample project to help you explore GanttFlow features.',
    'pt-BR': 'Projeto exemplo para ajudar voce a explorar os recursos do GanttFlow.',
    es: 'Proyecto de ejemplo para ayudarte a explorar las funciones de GanttFlow.',
  },
  color: '#6366f1',
  epics: [
    {
      name: { en: 'Planning', 'pt-BR': 'Planejamento', es: 'Planificacion' },
      features: [
        {
          name: { en: 'Requirements', 'pt-BR': 'Requisitos', es: 'Requisitos' },
          tasks: [
            done({ en: 'Gather requirements', 'pt-BR': 'Levantar requisitos', es: 'Recopilar requisitos' }, -28, -22),
            done({ en: 'Define scope', 'pt-BR': 'Definir escopo', es: 'Definir alcance' }, -21, -17),
            done({ en: 'Create project plan', 'pt-BR': 'Criar plano do projeto', es: 'Crear plan del proyecto' }, -16, -12),
          ],
        },
        {
          name: { en: 'Resource Allocation', 'pt-BR': 'Alocacao de Recursos', es: 'Asignacion de Recursos' },
          tasks: [
            done({ en: 'Identify team members', 'pt-BR': 'Identificar membros da equipe', es: 'Identificar miembros del equipo' }, -18, -14),
            inProgress({ en: 'Assign responsibilities', 'pt-BR': 'Atribuir responsabilidades', es: 'Asignar responsabilidades' }, -5, 2, 60),
          ],
        },
      ],
    },
    {
      name: { en: 'Execution', 'pt-BR': 'Execucao', es: 'Ejecucion' },
      features: [
        {
          name: { en: 'Phase 1', 'pt-BR': 'Fase 1', es: 'Fase 1' },
          tasks: [
            overdue({ en: 'Initial deliverables', 'pt-BR': 'Entregas iniciais', es: 'Entregables iniciales' }, -10, -3, 70),
            inProgress({ en: 'Core implementation', 'pt-BR': 'Implementacao principal', es: 'Implementacion principal' }, -2, 8, 35),
          ],
        },
        {
          name: { en: 'Phase 2', 'pt-BR': 'Fase 2', es: 'Fase 2' },
          tasks: [
            todo({ en: 'Secondary deliverables', 'pt-BR': 'Entregas secundarias', es: 'Entregables secundarios' }, 9, 18),
            todo({ en: 'Final integration', 'pt-BR': 'Integracao final', es: 'Integracion final' }, 19, 25),
          ],
        },
      ],
    },
    {
      name: { en: 'Closure', 'pt-BR': 'Encerramento', es: 'Cierre' },
      features: [
        {
          name: { en: 'Review', 'pt-BR': 'Revisao', es: 'Revision' },
          tasks: [
            blocked({ en: 'Quality review', 'pt-BR': 'Revisao de qualidade', es: 'Revision de calidad' }, 20, 25),
            todo({ en: 'Stakeholder sign-off', 'pt-BR': 'Aprovacao das partes interessadas', es: 'Aprobacion de partes interesadas' }, 26, 28),
          ],
        },
        {
          name: { en: 'Documentation', 'pt-BR': 'Documentacao', es: 'Documentacion' },
          tasks: [
            todo({ en: 'Final documentation', 'pt-BR': 'Documentacao final', es: 'Documentacion final' }, 27, 32),
            todo({ en: 'Lessons learned report', 'pt-BR': 'Relatorio de licoes aprendidas', es: 'Informe de lecciones aprendidas' }, 33, 36),
          ],
        },
      ],
    },
  ],
};

// ─── Template Registry ───────────────────────────────────────────────────────

const TEMPLATES: Record<IndustryKey, ProjectTemplate> = {
  software: softwareTemplate,
  marketing: marketingTemplate,
  construction: constructionTemplate,
  education: educationTemplate,
  events: eventsTemplate,
  product: productTemplate,
  other: otherTemplate,
};

// ─── Public API ──────────────────────────────────────────────────────────────

export function generateSampleProject(options: {
  industry: IndustryKey;
  locale: AppLocale;
  userId: string;
  now?: Date;
}): {
  name: string;
  description: string;
  color: string;
  currentVersion: string;
  epics: IEpic[];
} {
  const { industry, locale, userId, now = new Date() } = options;
  const template = TEMPLATES[industry] ?? TEMPLATES.other;

  const epics = template.epics.map((e) => buildEpic(e, locale, now, userId));

  return {
    name: template.name[locale],
    description: template.description[locale],
    color: template.color,
    currentVersion: 'Live',
    epics,
  };
}
