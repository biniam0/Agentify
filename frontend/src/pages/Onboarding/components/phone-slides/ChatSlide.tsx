import { ArrowLeft, ChevronRight, Play } from 'lucide-react'
import { GeometricX } from './GeometricX'

export function ChatSlide() {
  return (
    <div className="flex h-full w-full flex-col bg-[#F8F9FA]">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white px-4 pt-12 pb-3 shadow-sm">
        <ArrowLeft className="h-5 w-5 text-gray-600" />
        <div className="flex items-center gap-2">
          <GeometricX className="h-[1.2rem] w-auto" />
          <span className="text-[17px] font-semibold text-gray-900">Agent X</span>
        </div>
      </div>

      <div className="flex-1 px-4 pb-6 pt-4 overflow-hidden">
        {/* Date Separator */}
        <div className="mb-6 flex items-center justify-center">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="px-3 text-[11px] font-medium text-gray-500">Today</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="space-y-4">
          {/* Call Log */}
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-1 rounded-full bg-[#00D287]" />
              <div>
                <h4 className="text-[15px] font-medium text-gray-900">Voice call</h4>
                <p className="text-[13px] text-gray-500">00:15:49</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>

          {/* Note Log */}
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-1 rounded-full bg-blue-500" />
              <div>
                <h4 className="text-[15px] font-medium text-gray-900">Note created</h4>
                <p className="text-[13px] text-gray-500">Summary from "Follow up meeting / ...</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>

          {/* Audio Waveform 1 */}
          <div className="flex justify-start">
            <div className="flex items-center gap-3 rounded-2xl rounded-tl-sm border border-gray-100 bg-white p-2 pr-4 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#53A17D]">
                <Play className="h-4 w-4 ml-0.5 text-white" fill="currentColor" />
              </div>
              <div className="flex items-center gap-0.5">
                {[...Array(30)].map((_, i) => (
                  <div
                    key={i}
                    className="w-[2px] rounded-full bg-[#53A17D]/40"
                    style={{ height: `${Math.max(4, Math.random() * 20)}px` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Text Bubble 1 */}
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#53A17D] px-4 py-2.5 text-[14px] text-white">
              Got it! I'm still missing the contact details of the assistant manager.
            </div>
          </div>

          {/* Audio Waveform 2 */}
          <div className="flex justify-start">
            <div className="flex items-center gap-3 rounded-2xl rounded-tl-sm border border-gray-100 bg-white p-2 pr-4 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#53A17D]">
                <Play className="h-4 w-4 ml-0.5 text-white" fill="currentColor" />
              </div>
              <div className="flex items-center gap-0.5">
                {[...Array(30)].map((_, i) => (
                  <div
                    key={i}
                    className="w-[2px] rounded-full bg-[#53A17D]/40"
                    style={{ height: `${Math.max(4, Math.random() * 20)}px` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Text Bubble 2 */}
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#53A17D] px-4 py-2.5 text-[14px] text-white">
              Thanks! I've added Daniel Smith to the report. Do you also want me to create a draft email for Daniel?
            </div>
          </div>

          {/* User Text Bubble */}
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#E9ECEF] px-4 py-2.5 text-[14px] text-gray-800">
              Yes please, but make sure to address Daniel as the assistant manager!
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
