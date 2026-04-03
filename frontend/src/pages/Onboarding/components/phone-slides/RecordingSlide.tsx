import { Check, Pause, Trash2, X } from 'lucide-react'
import { GeometricX } from './GeometricX'

export function RecordingSlide() {
  return (
    <div className="flex h-full w-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-3">
        <span className="text-[15px] font-semibold text-gray-900">Acme Corp / Daniel Smith</span>
        <X className="h-5 w-5 text-gray-500" />
      </div>

      <div className="flex flex-1 flex-col px-4 pb-8 pt-4 overflow-hidden">
        {/* Main Card */}
        <div className="flex h-[60%] w-full flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-[#53A17D] to-[#428565] text-white shadow-xl shadow-[#53A17D]/20">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-md">
            <GeometricX className="h-10 w-auto" />
          </div>
          <h3 className="mb-3 text-[15px] font-medium text-white/90">Acme Corp / Daniel Smith</h3>
          <span className="text-4xl font-light tracking-wider">00 : 00 : 03</span>
        </div>

        {/* Waveform */}
        <div className="mt-8 flex w-full items-center justify-center gap-[3px]">
          {[...Array(40)].map((_, i) => (
            <div 
              key={i} 
              className="w-1 rounded-full bg-[#53A17D]/40" 
              style={{ height: `${Math.max(8, Math.random() * 40)}px` }} 
            />
          ))}
        </div>

        {/* Controls */}
        <div className="mt-auto flex items-center justify-between px-6">
          <button className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 text-[#53A17D]">
            <Trash2 className="h-5 w-5" />
          </button>
          <button className="flex h-16 w-16 items-center justify-center rounded-full bg-[#53A17D] text-white shadow-lg shadow-[#53A17D]/30">
            <Pause className="h-6 w-6" fill="currentColor" />
          </button>
          <button className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 text-[#53A17D]">
            <Check className="h-5 w-5" strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  )
}
