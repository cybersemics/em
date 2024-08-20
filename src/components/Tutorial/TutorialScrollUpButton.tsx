import { FC, useCallback } from 'react'
import scrollTo from '../../device/scrollTo'
import useScrollPosition from '../../hooks/useScrollPosition'
import TutorialNavigationButton from './TutorialNavigationButton'

interface TutorialScrollUpButtonProps {
  show: boolean
}

/** A button to scroll up to the tutorial. */
const TutorialScrollUpButton: FC<TutorialScrollUpButtonProps> = ({ show }) => {
  const scrollPosition = useScrollPosition()

  /**
   * Scrolls to the top of the window.
   */
  const scrollUp = useCallback(() => {
    scrollTo('top', 'smooth')
  }, [])

  return (
    <div
      style={{
        visibility: show ? 'visible' : 'hidden',
        opacity: show ? 1 : 0,
        width: '100%',
        position: 'absolute',
        top: show ? `calc(${scrollPosition}px + 0.5em)` : '-2em',
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
