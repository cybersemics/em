import classNames from 'classnames'
import React from 'react'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialNavigationButton = ({ classes, clickHandler, value, disabled = false }) => (
  <a
    className={classNames('tutorial-button button button-variable-width', classes)}
    disabled={disabled}
    onClick={clickHandler}
  >
    {value}
  </a>
)

export default TutorialNavigationButton
