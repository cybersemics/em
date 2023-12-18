import GesturePath from '../@types/GesturePath'
import SimplePath from '../@types/SimplePath'
import { isTouch } from '../browser'
import GestureDiagram from '../components/GestureDiagram'
import { formatKeyboardShortcut, shortcutById } from '../shortcuts'

const toggleContextViewShortcut = shortcutById('toggleContextView')

/** A message that explains that the thought is no other contexts and provides a hint for adding it to a context. */
const NoOtherContexts = ({
  allowSingleContext,
  simplePath,
}: {
  allowSingleContext?: boolean
  simplePath: SimplePath
}) => {
  // const value = useSelector(state => getThoughtById(state, head(simplePath))?.value)

  return (
    <div
      className='text-note text-small'
      style={{
        lineHeight: 1.72,
        // use padding instead of margin to ensure it affects height for LayoutTree node y calculation
        paddingBottom: '0.75em',
      }}
    >
      <p style={{ marginTop: 0 }}>This thought is not found in any other contexts.</p>
      {/* <div>
        {isTouch ? (
          <span className='gesture-container'>
            Swipe <GestureDiagram path={subthoughtShortcut.gesture as GesturePath} size={30} color='darkgray' />
          </span>
        ) : (
          <span>Type {formatKeyboardShortcut(subthoughtShortcut.keyboard!)}</span>
        )}{' '}
        to add "{value}" to a new context.
      </div> */}
      {allowSingleContext ? (
        'A floating context... how interesting.'
      ) : (
        <div>
          {isTouch ? (
            <span className='gesture-container'>
              Swipe{' '}
              <GestureDiagram path={toggleContextViewShortcut.gesture as GesturePath} size={30} color='darkgray' />
            </span>
          ) : (
            <span>Type {formatKeyboardShortcut(toggleContextViewShortcut.keyboard!)}</span>
          )}{' '}
          to toggle context view off.
        </div>
      )}
    </div>
  )
}

export default NoOtherContexts
