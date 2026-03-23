import { useEffect, useState } from 'react';
import { X, Sparkles, Target, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AddWorkflowModalProps {
  onClose: () => void;
}

const AddWorkflowModal = ({ onClose }: AddWorkflowModalProps) => {
  const [prompt, setPrompt] = useState('');

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-[720px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded bg-emerald-50 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Workflow Creator</h2>
            </div>
            <p className="text-sm text-gray-500">
              Describe the workflow you want to create in plain English.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-4">
          {/* Suggestions Cards */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50/50 border border-gray-100 rounded-xl p-5">
            {/* Column 1 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-emerald-500">Client Check-ins & Interactions</h3>
              </div>
              <ul className="space-y-2.5">
                <li className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-emerald-300 mt-2 flex-shrink-0" />
                  "Call Andreja about the Bosa Properties deal"
                </li>
                <li className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-emerald-300 mt-2 flex-shrink-0" />
                  "Client check in with Tamirat for BarrierX deal"
                </li>
                <li className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-emerald-300 mt-2 flex-shrink-0" />
                  "Schedule check-in with the owner of Wesgroup deal"
                </li>
              </ul>
            </div>

            {/* Column 2 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-emerald-500">Filter by Deal Stage</h3>
              </div>
              <ul className="space-y-2.5">
                <li className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-emerald-300 mt-2 flex-shrink-0" />
                  "Call all owners of Lost deals"
                </li>
                <li className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-emerald-300 mt-2 flex-shrink-0" />
                  "Call everyone with deals in Negotiation"
                </li>
                <li className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-emerald-300 mt-2 flex-shrink-0" />
                  "Call owners of Closed Lost deals to ask why"
                </li>
              </ul>
            </div>
          </div>

          {/* Text Area */}
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Call Andreja about his Bosa Properties deal..."
              className="w-full min-h-[120px] p-4 text-sm bg-white border border-emerald-400 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-gray-400"
            />
            {/* Resize handle visual indicator */}
            <div className="absolute bottom-2 right-2 flex flex-col gap-0.5 opacity-30 pointer-events-none">
              <div className="w-2 h-[1px] bg-gray-600 rotate-45 transform origin-right" />
              <div className="w-3 h-[1px] bg-gray-600 rotate-45 transform origin-right" />
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-2">
            <Button
              disabled={!prompt.trim()}
              className={cn(
                "gap-2 px-6 py-2.5 h-auto font-medium rounded-lg transition-all",
                prompt.trim() 
                  ? "bg-brand hover:bg-brand-hover text-white" 
                  : "bg-gray-100 text-gray-400 hover:bg-gray-100 cursor-not-allowed"
              )}
            >
              <Sparkles className="h-4 w-4" />
              Generate Workflow
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddWorkflowModal;
