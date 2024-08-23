import classNames from 'classnames'
import React from 'react'
import fastClick from '../../util/fastClick'

const TutorialNavigationButton = React.forwardRef<
  HTMLAnchorElement,
  {
    clickHandler: () => void
    value: string
    disabled?: boolean
    classes?: string
  }
>(({ clickHandler, value, disabled = false, classes }, ref) => (
  <a
    className={classNames('tutorial-button button button-variable-width', classes)}
    onClick={clickHandler}
    {...{ disabled }}
    {...fastClick(clickHandler)}
    ref={ref}
  >
    {value}
  </a>
))

TutorialNavigationButton.displayName = 'TutorialNavigationButton'

export default TutorialNavigationButton
