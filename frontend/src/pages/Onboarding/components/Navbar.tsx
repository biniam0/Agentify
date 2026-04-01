import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

interface NavbarProps {
  onCtaClick: () => void
}

export function Navbar({ onCtaClick }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="ob-dark-bg sticky top-0 z-50 border-b border-white/5 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-1.5">
          <span className="text-4xl font-medium leading-none tracking-tight text-white">
            Agent
          </span>
          <svg
            className="h-[1.5rem] w-auto mt-1.5"
            viewBox="0 0 42 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M42 28H28V14L42 28Z" fill="#53A17D" />
            <path d="M28 14V0L42 2.00272e-06L28 14Z" fill="#2D6A4F" />
            <path d="M14 28V14H28L14 28Z" fill="#2D6A4F" />
            <path d="M28 14H14V0L28 14Z" fill="#53A17D" />
            <path d="M14 28H0L14 14V28Z" fill="#53A17D" />
            <path d="M14 14L0 0H14V14Z" fill="#53A17D" />
          </svg>
        </a>

        <Button
          onClick={onCtaClick}
          variant="outline"
          className="hidden border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white sm:inline-flex rounded-md px-6 py-2 h-auto text-sm font-medium"
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
          <Button
            onClick={() => {
              onCtaClick()
              setMobileOpen(false)
            }}
            variant="outline"
            className="w-full border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white rounded-md h-auto py-3"
          >
            Start Today - For Free
          </Button>
        </div>
      )}
    </nav>
  )
}
