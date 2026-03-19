import { Play, Plus, Info, Send, FileText, PhoneOutgoing } from 'lucide-react';
import { useState } from 'react';

interface Workflow {
  id: string;
  title: string;
  description: string;
  readyCount: number;
  icon: React.ReactNode;
}

const WORKFLOWS: Workflow[] = [
  {
    id: 'initial-outreach',
    title: 'Initial Outreach',
    description: 'Send intro emails and schedule first calls.',
    readyCount: 12,
    icon: <PhoneOutgoing className="h-4 w-4 text-brand" />,
  },
  {
    id: 'follow-up',
    title: 'Follow-up Sequence',
    description: 'Automated follow-ups for unresponsive leads.',
    readyCount: 5,
    icon: <Send className="h-4 w-4 text-brand" />,
  },
  {
    id: 'contract-negotiation',
    title: 'Contract Negotiation',
    description: 'Prepare and send standard contract templates.',
    readyCount: 3,
    icon: <FileText className="h-4 w-4 text-brand" />,
  },
];

const WorkflowCard = ({ workflow }: { workflow: Workflow }) => (
  <div className="bg-white rounded-xl border border-default p-5 flex flex-col">
    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4 bg-brand-light">
      {workflow.icon}
    </div>

    <h3 className="text-sm font-semibold text-heading mb-1">{workflow.title}</h3>
    <p className="text-sm text-subtle mb-4 flex-1">{workflow.description}</p>

    <p className="text-xs font-medium text-brand mb-3">{workflow.readyCount} deals ready</p>

    <button className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
      <Play className="h-3.5 w-3.5 fill-current" />
      Run workflow
    </button>
  </div>
);

const WorkflowActions = () => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-heading">Workflow Actions</h2>
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="p-0.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Info className="h-4 w-4 text-gray-400" />
            </button>
            {showTooltip && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-10">
                You can have a maximum of 8 active workflow templates at a time to maintain system performance
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
              </div>
            )}
          </div>
        </div>
        <button className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 border border-emerald-600 hover:bg-emerald-50 px-3.5 py-2 rounded-lg transition-colors">
          <Plus className="h-4 w-4" />
          Add workflow
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {WORKFLOWS.map((workflow) => (
          <WorkflowCard key={workflow.id} workflow={workflow} />
        ))}
      </div>
    </div>
  );
};

export default WorkflowActions;
