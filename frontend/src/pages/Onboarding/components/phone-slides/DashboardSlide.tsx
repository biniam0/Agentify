import { Bell, Calendar, ChevronDown, Phone } from 'lucide-react'
import { BottomNav } from './BottomNav'
import { GeometricX } from './GeometricX'

export function DashboardSlide() {
  return (
    <div className="relative flex h-full w-full flex-col bg-[#F8F9FA] pb-16">
      {/* Header */}
      <div className="flex items-center justify-between bg-white px-5 pt-12 pb-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="text-xl font-bold tracking-tight text-gray-900">Agent</span>
          <GeometricX className="h-[1.1rem] w-auto" />
        </div>
        <button className="relative flex h-8 w-8 items-center justify-center rounded-full border border-gray-200">
          <Bell className="h-4 w-4 text-gray-600" />
          <div className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>
      </div>

      <div className="flex-1 px-4 pt-5 overflow-hidden">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Good morning</h3>
            <p className="text-[13px] text-gray-500">Here's your day at a glance</p>
          </div>
          <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 shadow-sm">
            <Calendar className="h-3.5 w-3.5 text-gray-500" />
            Today
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-3.5">
          {/* Meeting Card 1 */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">Product X RFP Meeting</h4>
                <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16"/><path d="M15 3v18"/><path d="M3 21h18"/></svg>
                    CloudNine
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
                    $125,000
                  </span>
                </div>
              </div>
              <div className="text-right text-[11px] font-medium text-gray-500">
                <p className="text-gray-900">10:00 AM</p>
                <p>11:30 AM</p>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="mb-1.5 flex justify-between text-[12px] font-medium">
                <span className="text-gray-500">BarrierX Score</span>
                <span className="text-gray-900">80%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div className="h-2 w-[80%] rounded-full bg-[#00D287]"></div>
              </div>
            </div>

            <div className="mb-4">
              <span className="mb-2 block text-[11px] font-medium text-gray-400">Attendees</span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <img src="https://i.pravatar.cc/150?u=1" alt="Sarah" className="h-5 w-5 rounded-full object-cover" />
                  <span className="text-[11px] font-medium text-gray-700">Sarah Chen</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <img src="https://i.pravatar.cc/150?u=2" alt="John" className="h-5 w-5 rounded-full object-cover" />
                  <span className="text-[11px] font-medium text-gray-700">John Smith</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <img src="https://i.pravatar.cc/150?u=3" alt="Mike" className="h-5 w-5 rounded-full object-cover" />
                  <span className="text-[11px] font-medium text-gray-700">Mike Roberts</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-[13px] font-semibold text-gray-700">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                  Preparation
                </button>
                <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#428565] py-2 text-[13px] font-semibold text-white">
                  <Phone className="h-3 w-3.5" />
                  Call Agent X
                </button>
              </div>
              <button className="w-full rounded-xl bg-gray-50 py-2 text-[13px] font-semibold text-gray-700">
                Meeting details
              </button>
            </div>
          </div>

          {/* Meeting Card 2 */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm opacity-60">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">Deal SAAS</h4>
                <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16"/><path d="M15 3v18"/><path d="M3 21h18"/></svg>
                    CloudNine
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
                    $125,000
                  </span>
                </div>
              </div>
              <div className="text-right text-[11px] font-medium text-gray-500">
                <p className="text-gray-900">10:00 AM</p>
                <p>10:30 AM</p>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="mb-1.5 flex justify-between text-[12px] font-medium">
                <span className="text-gray-500">BarrierX Score</span>
                <span className="text-gray-900">20%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div className="h-2 w-[20%] rounded-full bg-[#E53E3E]"></div>
              </div>
            </div>

            <div className="mb-4">
              <span className="mb-2 block text-[11px] font-medium text-gray-400">Attendees</span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <img src="https://i.pravatar.cc/150?u=1" alt="Sarah" className="h-5 w-5 rounded-full object-cover" />
                  <span className="text-[11px] font-medium text-gray-700">Sarah Chen</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <img src="https://i.pravatar.cc/150?u=2" alt="John" className="h-5 w-5 rounded-full object-cover" />
                  <span className="text-[11px] font-medium text-gray-700">John Smith</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <img src="https://i.pravatar.cc/150?u=3" alt="Mike" className="h-5 w-5 rounded-full object-cover" />
                  <span className="text-[11px] font-medium text-gray-700">Mike Roberts</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-[13px] font-semibold text-gray-700">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                  Preparation
                </button>
                <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#428565] py-2 text-[13px] font-semibold text-white">
                  <Phone className="h-3.5 w-3.5" />
                  Call Agent X
                </button>
              </div>
              <button className="w-full rounded-xl bg-gray-50 py-2 text-[13px] font-semibold text-gray-700">
                Meeting details
              </button>
            </div>
          </div>
        </div>
      </div>

      <BottomNav activeTab="home" />
    </div>
  )
}
