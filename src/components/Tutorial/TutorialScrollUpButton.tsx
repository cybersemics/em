import { FC, useCallback } from 'react'
import TutorialNavigationButton from './TutorialNavigationButton'

interface TutorialScrollUpButtonProps {
  show: boolean
}

/** A button to scroll up to the tutorial. */
const TutorialScrollUpButton: FC<TutorialScrollUpButtonProps> = ({ show }) => {
  /**
   * Scrolls to the top of the window.
   */
  const scrollUp = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }, [])

  return (
    <div
      style={{
        visibility: show ? 'visible' : 'hidden',
        opacity: show ? 1 : 0,
        width: '100%',
        position: 'fixed',
        top: show ? '0.5em' : '-2em',
        left: 0,
        transition: 'opacity 0.25s ease-in-out, visibility 0.25s ease-in-out, top 0.25s ease-in-out',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <TutorialNavigationButton clickHandler={scrollUp} value='Scroll up for tutorial' />
    </div>
  )
}

export default TutorialScrollUpButton
