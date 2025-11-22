import { css } from '../../styled-system/css'
import Path from '../@types/Path'
import hashPath from '../util/hashPath'

/**
 * A wrapper used inside the Thought component and BulletCursorOverlay.
 * In BulletCursorOverlay, it’s used to maintain the height of the thought,
 * which helps determine the cursor overlay’s position.
 */
const ThoughtPositioner = ({
  children,
  path,
  hideBullet,
  cursorOverlay,
}: {
  children: React.ReactNode
  path: Path
  hideBullet?: boolean
  cursorOverlay?: boolean
}) => {
  return (
    <div
      aria-label={cursorOverlay ? 'cursor-overlay-thought-wrapper' : 'thought-container'}
      data-testid={cursorOverlay ? 'cursor-overlay-thought-wrapper' : 'thought-' + hashPath(path)}
      className={css({
        /* Use line-height to vertically center the text and bullet. We cannot use padding since it messes up the selection. This needs to be overwritten on multiline elements. See ".child .editable" below. */
        /* must match value used in Editable useMultiline */
        lineHeight: '2',
        // ensure that ThoughtAnnotation is positioned correctly
        position: 'relative',
        ...(hideBullet ? { marginLeft: -12 } : null),
      })}
    >
      {children}
    </div>
  )
}

export default ThoughtPositioner
