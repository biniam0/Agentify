import { useEffect, useState } from 'react'

const slideImages = [
  { src: '/phone-slides/dashboard.png', alt: 'Dashboard' },
  { src: '/phone-slides/inbox.png', alt: 'Inbox' },
  { src: '/phone-slides/call.png', alt: 'Incoming Call' },
  { src: '/phone-slides/chat.png', alt: 'Chat' },
  { src: '/phone-slides/recording.png', alt: 'Recording' },
]

export function PhoneCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(true)

  const extendedSlides = [...slideImages, slideImages[0]]

  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true)
      setCurrentSlide((prev) => prev + 1)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (currentSlide === slideImages.length) {
      const timeout = setTimeout(() => {
        setIsTransitioning(false)
        setCurrentSlide(0)
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [currentSlide])

  return (
    <div className="relative h-[572px] w-[286px] overflow-hidden sm:h-[638px] sm:w-[319px]">
      <div
        className={`flex h-full w-full ${isTransitioning ? 'transition-transform duration-500 ease-in-out' : ''}`}
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {extendedSlides.map((slide, index) => (
          <div key={index} className="h-full w-full shrink-0">
            <img
              src={slide.src}
              alt={slide.alt}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
