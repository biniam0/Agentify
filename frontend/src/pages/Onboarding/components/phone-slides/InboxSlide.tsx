import { Edit, Search } from 'lucide-react'
import { BottomNav } from './BottomNav'

export function InboxSlide() {
  return (
    <div className="relative flex h-full w-full flex-col bg-white pb-16">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">Inbox</h1>
          <span className="flex h-5 items-center justify-center rounded-full bg-blue-50 px-2 text-[11px] font-semibold text-blue-600">
            40
          </span>
        </div>
        <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200">
          <Edit className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Search */}
      <div className="px-5 pb-4">
        <div className="relative flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2.5">
          <Search className="h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search" 
            className="ml-2 w-full bg-transparent text-[15px] outline-none placeholder:text-gray-400"
            readOnly
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-hidden">
        {[
          { color: 'bg-emerald-600', icon: 'M4 6h16M4 12h16M4 18h7' },
          { color: 'bg-purple-600', icon: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z' },
          { color: 'bg-blue-500', icon: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z' },
          { color: 'bg-gray-900', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
          { color: 'bg-blue-600', icon: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z' },
          { color: 'bg-purple-500', icon: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z' },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3 border-b border-gray-50 px-5 py-4">
            <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
            <div className="relative shrink-0">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${item.color} text-white`}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#00D287]" />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between">
                <h4 className="truncate text-[15px] font-semibold text-gray-900">Follow up meeting</h4>
                <span className="shrink-0 text-[13px] text-gray-500">5min ago</span>
              </div>
              <p className="text-[13px] text-gray-500">Acme Corp</p>
              <p className="mt-1 truncate text-[14px] text-gray-600">Thanks for the great discussion today. Can you s...</p>
            </div>
          </div>
        ))}
      </div>

      <BottomNav activeTab="inbox" />
    </div>
  )
}
