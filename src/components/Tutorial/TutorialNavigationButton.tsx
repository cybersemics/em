import classNames from 'classnames'
import Index from '../../@types/IndexType'
import fastClick from '../../util/fastClick'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialNavigationButton = ({
  classes,
  clickHandler,
  value,
  disabled = false,
}: {
  classes?: string | Index<boolean>
  clickHandler: () => void
  value: string
  disabled?: boolean
}) => (
  <a
    className={classNames('tutorial-button button button-variable-width', classes)}
    onClick={clickHandler}
    {...{ disabled }}
    {...fastClick(clickHandler)}
  >
    {value}
  </a>
)

export default TutorialNavigationButton
