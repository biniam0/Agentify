import { useEffect, useState } from 'react'
import { DashboardSlide } from './phone-slides/DashboardSlide'
import { InboxSlide } from './phone-slides/InboxSlide'
import { ChatSlide } from './phone-slides/ChatSlide'
import { RecordingSlide } from './phone-slides/RecordingSlide'
import { CallSlide } from './phone-slides/CallSlide'

export function PhoneCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(true)

  const slides = [<DashboardSlide />, <InboxSlide />, <ChatSlide />, <RecordingSlide />, <CallSlide />]
  // Append the first slide to the end to create a seamless loop
  const extendedSlides = [...slides, slides[0]]

  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true)
      setCurrentSlide((prev) => prev + 1)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // When we reach the cloned first slide (at the very end)
    if (currentSlide === slides.length) {
      // Wait for the slide transition to finish (500ms)
      const timeout = setTimeout(() => {
        // Disable transition and instantly snap back to the actual first slide
        setIsTransitioning(false)
        setCurrentSlide(0)
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [currentSlide, slides.length])

  // Determine the logical slide index for styling (e.g., status bar color)
  const logicalSlideIndex = currentSlide % slides.length

  return (
    <div className="relative h-[572px] w-[286px] overflow-hidden rounded-[40px] border-[5px] border-gray-800 bg-white shadow-2xl sm:h-[638px] sm:w-[319px] sm:rounded-[44px] sm:border-[7px]">
      {/* Hardware Notch */}
      <div className="absolute left-1/2 top-0 z-50 h-7 w-36 -translate-x-1/2 rounded-b-2xl bg-gray-800" />

      {/* Status Bar */}
      <div className="absolute left-0 right-0 top-0 z-40 flex items-center justify-between px-6 pt-2.5">
        <span className={`text-[11px] font-medium ${logicalSlideIndex === 4 ? 'text-white' : 'text-gray-900'}`}>9:41</span>
        <div className="flex items-center gap-1">
          <div className={`h-[9px] w-[14px] rounded-[3px] border-[1.5px] ${logicalSlideIndex === 4 ? 'border-white' : 'border-gray-900'}`} />
        </div>
      </div>

      {/* Slides Container */}
      <div 
        className={`flex h-full w-full ${isTransitioning ? 'transition-transform duration-500 ease-in-out' : ''}`}
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {extendedSlides.map((slide, index) => (
          <div key={index} className="h-full w-full shrink-0">
            {slide}
          </div>
        ))}
      </div>

      {/* Home Indicator */}
      <div className="absolute bottom-2.5 left-1/2 z-50 h-1.5 w-32 -translate-x-1/2 rounded-full bg-gray-300 sm:w-36" />
    </div>
  )
}
