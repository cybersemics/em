import { FC, PropsWithChildren } from 'react'
import { css } from '../../styled-system/css'
import isAttribute from '../util/isAttribute'

/**
 * Shared component used by ThoughtAnnotation and BulletCursorOverlay.
 * In BulletCursorOverlay, we’re using it to fix a misalignment between the cursor overlay and the bullet position that only appears for certain thoughts (and not consistently).
 * The root cause is that one child inside ThoughtAnnotation is “leaking” its height into the parent and causing some inconsistencies that affecting the other components as well. Because of that, we’ve had to mimic ThoughtAnnotation to keep the cursor overlay’s position accurate.
 */
const ThoughtAnnotationWrapper: FC<
  PropsWithChildren<{
    stylePosition?: React.CSSProperties
    ellipsizedUrl?: boolean
    multiline?: boolean
    value?: string
    styleAnnotation?: React.CSSProperties
    isTableCol1?: boolean
  }>
> = ({ ellipsizedUrl, multiline, value, styleAnnotation, stylePosition, children }) => {
  return (
    <div
      aria-label='thought-annotation'
      className={css({
        position: 'absolute',
        pointerEvents: 'none',
        userSelect: 'none',
        boxSizing: 'border-box',
        lineHeight: multiline ? 1.25 : undefined,
        // For single-line thoughts, the caret is positioned about 7.5px (at 18px font size) down from the top of the line (vertical-align: top).
        // That is the position that gets measured in usePositionedAnnotation, and so it needs to be bumped up here because, for some reason,
        // offsetting the top position directly doesn't work. The multiline margin was already set on the children, and doesn't seem to require
        // as much adjustment, possibly due to the difference between single-line line height (2em) and multiline line height (1.25em).
        // Perhaps the aggregate top margins add up to 50% of the difference between 1em and line-height, and could be consolidated further.
        marginTop: multiline ? 'calc(-0.12em - 0.5px)' : value ? '-0.425em' : undefined,
        marginLeft: 'calc(0.666em - 18px)',
        display: 'inline-block',
        textAlign: 'left',
        verticalAlign: 'top',
        whiteSpace: 'pre-wrap',
        /* override editable-annotation's single line to have same width with .editable. 100% - 1em since .editable has padding-right 1em */
        maxWidth: ellipsizedUrl ? 'calc(100% - 2em)' : '100%',
        '@media (max-width: 500px)': {
          marginTop: { _android: '-2.1px' },
          marginLeft: { _android: '0.5em' },
        },
        '@media (min-width: 560px) and (max-width: 1024px)': {
          marginTop: { _android: '-0.1px' },
          marginLeft: { _android: '0.5em' },
        },
      })}
      style={stylePosition}
    >
      <div
        className={
          css({
            ...(value &&
              isAttribute(value) && {
                backgroundColor: 'thoughtAnnotation',
                fontFamily: 'monospace',
              }),
            display: 'inline-block',
            maxWidth: '100%',
            padding: '0 0.333em',
            boxSizing: 'border-box',
            whiteSpace: ellipsizedUrl ? 'nowrap' : undefined,
            paddingRight: multiline ? '1em' : '0.333em',
          }) // disable intrathought linking until add, edit, delete, and expansion can be implemented
          // 'subthought-highlight': isEditing && focusOffset != null && subthought.contexts.length > (subthought.text === value ? 1 : 0) && subthoughtUnderSelection() && subthought.text === subthoughtUnderSelection().text
          // .subthought-highlight {
          //   border-bottom: solid 1px;
          // }
        }
        style={{
          ...styleAnnotation,
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default ThoughtAnnotationWrapper
