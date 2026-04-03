import { GeometricX } from "./phone-slides/GeometricX";

export function Footer() {
  return (
    <footer
      className="ob-dark-bg relative py-10 md:py-15"

    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center justify-center gap-0.5">
          <span className="text-5xl font-semibold text-white tracking-tight">Barrier</span>
          <GeometricX className="h-9 mt-1 w-auto" />
        </div>

        <p className="mt-6 text-left text-xs text-gray-500 mb-0">
          &copy; 2025. Designed by Agent Workforce
        </p>
      </div>
    </footer>
  )
}
