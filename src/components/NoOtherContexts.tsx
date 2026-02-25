import { css, cx } from '../../styled-system/css'
import { textNoteRecipe } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import SimplePath from '../@types/SimplePath'
import { isTouch } from '../browser'
import { formatKeyboardShortcut, gestureString } from '../commands'
import toggleContextViewCommand from '../commands/toggleContextView'
import GestureDiagram from '../components/GestureDiagram'

/** A message that explains that the thought is no other contexts and provides a hint for adding it to a context. */
const NoOtherContexts = ({ allowSingleContext }: { allowSingleContext?: boolean; simplePath: SimplePath }) => {
  // const value = useSelector(state => getThoughtById(state, head(simplePath))?.value)

  return (
    <div
      className={cx(
        textNoteRecipe(),
        css({
          fontSize: 'sm',
          lineHeight: '2',
          // use padding instead of margin to ensure it affects height for LayoutTree node y calculation
          paddingBottom: '0.75em',
        }),
      )}
    >
      <p className={css({ marginTop: 0 })}>This thought is not found in any other contexts.</p>
      {/* <div>
        {isTouch ? (
          <span>
            Swipe <GestureDiagram path={subthoughtCommand.gesture} size={30} color='darkgray' />
          </span>
        ) : (
          <span>Type {formatKeyboardShortcut(subthoughtCommand.keyboard!)}</span>
        )}{' '}
        to add "{value}" to a new context.
      </div> */}
      {allowSingleContext ? (
        'A floating context... how interesting.'
      ) : (
        <div>
          {isTouch ? (
            <span>
              Swipe{' '}
              <GestureDiagram
                inGestureContainer
                path={gestureString(toggleContextViewCommand)}
                size={30}
                color={token('colors.gray66')}
              />
            </span>
          ) : (
            <span>Type {formatKeyboardShortcut(toggleContextViewCommand.keyboard!)}</span>
          )}{' '}
          to toggle context view off.
        </div>
      )}
    </div>
  )
}

export default NoOtherContexts
