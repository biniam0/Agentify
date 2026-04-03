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
          <span className="text-5xl font-medium leading-none tracking-tight text-white">
            Agent
          </span>
          <svg
            className="h-[2rem] w-auto mt-1.5"
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

        <div className="relative hidden sm:inline-flex h-10 overflow-hidden rounded-md p-[1px]">
          <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#00E676_100%)]" />
          <Button
            onClick={onCtaClick}
            variant="outline"
            className="relative h-full w-full rounded-[5px] border-0 bg-[#0A0A0A] px-6 text-sm font-medium text-white hover:bg-[#1A1A1A] hover:text-white"
          >
            Start Today - For Free
          </Button>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white sm:hidden"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/5 px-6 py-4 sm:hidden">
          <div className="relative w-full overflow-hidden rounded-md p-[1px]">
            <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#00E676_100%)]" />
            <Button
              onClick={() => {
                onCtaClick()
                setMobileOpen(false)
              }}
              variant="outline"
              className="relative h-full w-full rounded-[5px] border-0 bg-[#0A0A0A] py-3 text-sm font-medium text-white hover:bg-[#1A1A1A] hover:text-white"
            >
              Start Today - For Free
            </Button>
          </div>
        </div>
      )}
    </nav>
  )
}
