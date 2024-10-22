import { FC, useCallback } from 'react'
import { css } from '../../../styled-system/css'
import scrollTo from '../../device/scrollTo'
import scrollTopStore from '../../stores/scrollTop'
import TutorialNavigationButton from './TutorialNavigationButton'

/** A button to scroll up to the tutorial. */
const TutorialScrollUpButton: FC<{ show: boolean }> = ({ show }) => {
  const scrollTop = scrollTopStore.useState()

  /**
   * Scrolls to the top of the window.
   */
  const scrollUp = useCallback(() => {
    scrollTo('top', 'smooth')
  }, [])

  return (
    <div className={css({ position: 'absolute', left: 0, width: '100%' })} style={{ top: scrollTop }}>
      <div
        className={css({
          visibility: show ? 'visible' : 'hidden',
          opacity: show ? 1 : 0,
          width: '100%',
          position: 'absolute',
          top: show ? '0.5em' : '-2em',
          left: 0,
          transition: `opacity {durations.fastDuration} ease-in-out, visibility {durations.fastDuration} ease-in-out, top {durations.fastDuration} ease-in-out`,
          display: 'flex',
          justifyContent: 'center',
        })}
      >
        <TutorialNavigationButton clickHandler={scrollUp} value='Scroll up for tutorial' />
      </div>
    </div>
  )
}

export default TutorialScrollUpButton
