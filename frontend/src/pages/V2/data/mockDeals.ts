import { V2Deal } from './types';

export const MOCK_DEALS: V2Deal[] = [
  {
    id: '1',
    companyName: 'Gebroeders Blokland',
    companySubtitle: 'Universiteit Wageningen, Wageningen',
    companyLogoColor: '#4CAF50',
    status: 'Closed Lost',
    value: 45000,
    barrierScore: 12,
    riskLevel: 'Low risk',
    nextStep: 'Review loss analysis',
    contact: {
      name: 'Joris Everts',
      email: 'j.everts@omrt.tech',
      phone: '+31-619079024',
    },
    workflowStatus: {
      current: 'Lost Deal Analysis',
      lastCallDate: 'Feb 12, 2026',
    },
    dealExternalId: '428141796558',
    conversationId: 'conv_3901kk9k4on...',
    duration: '1m 4s',
    analysisTag: 'Lost Deal Analysis',
    dealOutcome: 'Deal Lost',
    dealOutcomeReason: 'Internal decision (economic buyer)',
    insight: {
      whyLost: 'No scope and little understanding of how the platform concept works.',
      competitor: 'Internal decision (economic buyer)',
      whatToDoNext: 'Get the economic buyer to the table faster.',
    },
    aiAnalysis: {
      summary:
        'Deal lost due to a lack of scope and insufficient understanding of the platform concept by the economic buyer. The contact indicated that the decision-maker was never properly engaged during the sales process.',
      impact:
        'Missed opportunity to educate the economic buyer early — similar pattern seen in 3 other lost deals this quarter.',
      recommendation:
        'Introduce an executive briefing step before proposal stage to align economic buyers on platform value.',
    },
    recommendedNextSteps: [
      { id: '1', title: 'Review Similar Deal', description: 'Find deals lost to internal decisions', icon: 'search' },
      { id: '2', title: 'Update Sales Playbook', description: 'Add executive briefing step', icon: 'document' },
      { id: '3', title: 'Schedule Team Review', description: 'Discuss pattern with sales team', icon: 'calendar' },
    ],
    timeline: [
      { id: '1', title: 'Scheduler Job Run', description: 'Feb 12, 2026 14:05:00', completed: true },
      { id: '2', title: 'Invite your team', description: 'Start collaborating with your team', completed: false },
    ],
    totalTimelineEvents: 7,
  },
  {
    id: '2',
    companyName: 'Greystar',
    companySubtitle: 'Development PvE',
    companyLogoColor: '#9C27B0',
    status: 'Budgetary Letter',
    value: 12500,
    barrierScore: 45,
    riskLevel: 'Medium risk',
    nextStep: 'Follow up call',
    contact: {
      name: 'Mark de Vries',
      email: 'm.devries@greystar.com',
      phone: '+31-620145678',
    },
    workflowStatus: {
      current: 'Follow-up Sequence',
      lastCallDate: 'Mar 5, 2026',
    },
  },
  {
    id: '3',
    companyName: 'Orion Investment Partners',
    companySubtitle: 'Rembrandt park bouwfysica, Amsterdam',
    companyLogoColor: '#2196F3',
    status: 'Negotiation',
    value: 85000,
    barrierScore: 30,
    riskLevel: 'Low risk',
    nextStep: 'Send proposal',
    contact: {
      name: 'Anna Bakker',
      email: 'a.bakker@orion-ip.nl',
      phone: '+31-631098765',
    },
    workflowStatus: {
      current: 'Contract Negotiation',
      lastCallDate: 'Mar 10, 2026',
    },
  },
  {
    id: '4',
    companyName: 'Grehamer & Company',
    companySubtitle: 'Pilot + assessment, Apeldoorn NL',
    companyLogoColor: '#00BCD4',
    status: 'Proposal',
    value: 120000,
    barrierScore: 82,
    riskLevel: 'High risk',
    nextStep: 'Send contract',
    contact: {
      name: 'Pieter Grehamer',
      email: 'p.grehamer@grehamer.nl',
      phone: '+31-642987654',
    },
    workflowStatus: {
      current: 'Initial Outreach',
      lastCallDate: 'Mar 8, 2026',
    },
  },
  {
    id: '5',
    companyName: 'Jansen Bouwontwikkeling',
    companySubtitle: 'Ewijk West, Daan Jansen',
    companyLogoColor: '#2196F3',
    status: 'Verbal Agreement',
    value: 95000,
    barrierScore: 68,
    riskLevel: 'High risk',
    nextStep: 'Schedule meeting',
    contact: {
      name: 'Daan Jansen',
      email: 'd.jansen@jansenbouw.nl',
      phone: '+31-653876543',
    },
    workflowStatus: {
      current: 'Contract Negotiation',
      lastCallDate: 'Mar 14, 2026',
    },
  },
];
