import { Button } from '@/components/ui/button'
import { Rocket, Menu, X } from 'lucide-react'
import { useState } from 'react'

interface NavbarProps {
  onCtaClick: () => void
}

export function Navbar({ onCtaClick }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="ob-dark-bg sticky top-0 z-50 border-b border-white/5 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600">
            <span className="text-lg font-bold text-white">X</span>
          </div>
          <span className="text-xl font-bold text-white">
            Agent<span className="text-emerald-400">X</span>
          </span>
        </a>

        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-gray-300 lg:flex">
          AgentX does not require a tech team to work
          <Rocket className="h-4 w-4 text-orange-400" />
        </div>

        <Button
          onClick={onCtaClick}
          variant="outline"
          className="hidden border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white sm:inline-flex"
        >
          Start Today - For Free
        </Button>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white sm:hidden"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/5 px-6 py-4 sm:hidden">
          <div className="mb-3 flex items-center gap-2 text-sm text-gray-400">
            AgentX does not require a tech team to work
            <Rocket className="h-4 w-4 text-orange-400" />
          </div>
          <Button
            onClick={() => {
              onCtaClick()
              setMobileOpen(false)
            }}
            variant="outline"
            className="w-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            Start Today - For Free
          </Button>
        </div>
      )}
    </nav>
  )
}
