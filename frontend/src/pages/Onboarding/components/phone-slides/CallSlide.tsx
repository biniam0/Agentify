import { Bell, MessageSquare, Phone } from 'lucide-react'
import { GeometricX } from './GeometricX'

export function CallSlide() {
  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-b from-[#1A1A24] via-[#2A3A4A] to-[#1A1A24] pb-12 pt-20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-8 pt-12">
        <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-white shadow-2xl">
          <GeometricX className="h-8 w-auto" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-[28px] font-medium text-white tracking-tight leading-tight">Agent X</h2>
          <p className="text-[17px] text-white/60">connecting...</p>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-auto w-full px-8">
        <div className="mb-12 grid grid-cols-2 gap-x-8">
          <div className="flex flex-col items-center gap-2">
            <button className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
              <Bell className="h-6 w-6 text-white" />
            </button>
            <span className="text-[13px] text-white/90">Remind Me</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
              <MessageSquare className="h-6 w-6 text-white" />
            </button>
            <span className="text-[13px] text-white/90">Message</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8">
          <div className="flex flex-col items-center gap-2">
            <button className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#FF3B30] shadow-lg shadow-[#FF3B30]/30">
              <Phone className="h-8 w-8 rotate-[135deg] text-white" fill="currentColor" />
            </button>
            <span className="text-[13px] text-white/90">Decline</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#34C759] shadow-lg shadow-[#34C759]/30">
              <Phone className="h-8 w-8 text-white" fill="currentColor" />
            </button>
            <span className="text-[13px] text-white/90">Accept</span>
          </div>
        </div>
      </div>
    </div>
  )
}
