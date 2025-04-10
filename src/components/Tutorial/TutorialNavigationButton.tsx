import React from 'react'
import { cx } from '../../../styled-system/css'
import { anchorButtonRecipe } from '../../../styled-system/recipes'

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
    className={cx(anchorButtonRecipe({ variableWidth: true, smallGapX: true }), classes)}
    {...{ disabled }}
    onClick={clickHandler}
    role='button'
    ref={ref}
  >
    {value}
  </a>
))

TutorialNavigationButton.displayName = 'TutorialNavigationButton'

export default TutorialNavigationButton
