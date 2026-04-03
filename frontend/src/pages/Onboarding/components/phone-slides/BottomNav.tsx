import { Home, Inbox, CheckSquare, Settings } from 'lucide-react'

export function BottomNav({ activeTab }: { activeTab: 'home' | 'inbox' | 'tasks' | 'settings' }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 flex h-16 items-center justify-around border-t border-gray-100 bg-white px-6 pb-4 pt-2">
      <button className={`flex flex-col items-center justify-center gap-1 ${activeTab === 'home' ? 'text-[#00D287]' : 'text-gray-400'}`}>
        <Home className="h-5 w-5" strokeWidth={activeTab === 'home' ? 2.5 : 2} />
        {activeTab === 'home' && <div className="h-1 w-8 rounded-full bg-[#00D287] absolute bottom-1" />}
      </button>
      <button className={`flex flex-col items-center justify-center gap-1 ${activeTab === 'inbox' ? 'text-[#00D287]' : 'text-gray-400'}`}>
        <Inbox className="h-5 w-5" strokeWidth={activeTab === 'inbox' ? 2.5 : 2} />
        {activeTab === 'inbox' && <div className="h-1 w-8 rounded-full bg-[#00D287] absolute bottom-1" />}
      </button>
      <button className={`flex flex-col items-center justify-center gap-1 ${activeTab === 'tasks' ? 'text-[#00D287]' : 'text-gray-400'}`}>
        <CheckSquare className="h-5 w-5" strokeWidth={activeTab === 'tasks' ? 2.5 : 2} />
        {activeTab === 'tasks' && <div className="h-1 w-8 rounded-full bg-[#00D287] absolute bottom-1" />}
      </button>
      <button className={`flex flex-col items-center justify-center gap-1 ${activeTab === 'settings' ? 'text-[#00D287]' : 'text-gray-400'}`}>
        <Settings className="h-5 w-5" strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
        {activeTab === 'settings' && <div className="h-1 w-8 rounded-full bg-[#00D287] absolute bottom-1" />}
      </button>
    </div>
  )
}
