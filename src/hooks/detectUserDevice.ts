import { useEffect, useState } from 'react'

/** Custom hook detectUserDevice.ts to detect user device. */
const DetectUserDevice = () => {
  const [isMobile, setMobile] = useState(false)
  /** Use navigator to detect if on mobile. Or use window innerWidth to detect resize width. */
  const handleResize = () => {
    const mobile = !!navigator.maxTouchPoints || window.innerWidth <= 991
    setMobile(mobile)
  }

  useEffect(() => {
    // Add event listener
    window.addEventListener('resize', handleResize)

    // Call handler right away so state gets updated with initial window size
    handleResize()

    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize)
  }, [isMobile])

  return { isMobile }
}

export default DetectUserDevice
