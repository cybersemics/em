import { FC, PropsWithChildren } from 'react'
import { css, cx } from '../../styled-system/css'
import { multilineRecipe } from '../../styled-system/recipes'
import { SystemStyleObject } from '../../styled-system/types'
import { MIN_CONTENT_WIDTH_EM } from '../constants'
import isAttribute from '../util/isAttribute'
import FauxCaret from './FauxCaret'

/**
 * Shared component used by ThoughtAnnotation and BulletCursorOverlay.
 * In BulletCursorOverlay, we’re using it to fix a misalignment between the cursor overlay and the bullet position that only appears for certain thoughts (and not consistently).
 * The root cause is that one child inside ThoughtAnnotation is “leaking” its height into the parent and causing some inconsistencies that affecting the other components as well. Because of that, we’ve had to mimic ThoughtAnnotation to keep the cursor overlay’s position accurate.
 */
const ThoughtAnnotationWrapper: FC<
  PropsWithChildren<{
    cursorOverlay?: boolean
    ellipsizedUrl?: boolean
    multiline?: boolean
    value?: string
    styleAnnotation?: React.CSSProperties
    cssRaw?: SystemStyleObject
    style?: React.CSSProperties
    isTableCol1?: boolean
    textMarkup?: string
    placeholder?: string
  }>
> = ({
  cursorOverlay,
  ellipsizedUrl,
  multiline,
  value,
  styleAnnotation,
  cssRaw,
  style,
  children,
  isTableCol1,
  textMarkup,
  placeholder,
}) => {
  return (
    <div
      aria-label='thought-annotation'
      className={css({
        position: 'absolute',
        userSelect: 'none',
        boxSizing: 'border-box',
        width: '100%',
        // maxWidth: '100%',
        marginTop: '0',
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
    >
      <div
        className={
          cx(
            multiline ? multilineRecipe() : null,
            css({
              ...(value &&
                isAttribute(value) && {
                  backgroundColor: 'thoughtAnnotation',
                  fontFamily: 'monospace',
                }),
              display: 'inline-block',
              maxWidth: '100%',
              paddingLeft: '0.333em',
              boxSizing: 'border-box',
              whiteSpace: ellipsizedUrl ? 'nowrap' : undefined,
              /*
                  Since .editable-annotation-text is display: inline the margin only gets applied to its first line, and not later lines.
                  To make sure all lines are aligned need to apply the margin here, and remove margin from the .editable-annotation-text.
                  This margin should match the margin set in editableRecipe (#3353).
                */
              margin: '-0.5px calc(18px - 1em) 0 calc(1em - 18px)',
              paddingRight: multiline ? '1em' : '0.333em',
              textAlign: isTableCol1 ? 'right' : 'left',
            }),
          )
          // disable intrathought linking until add, edit, delete, and expansion can be implemented
          // 'subthought-highlight': isEditing && focusOffset != null && subthought.contexts.length > (subthought.text === value ? 1 : 0) && subthoughtUnderSelection() && subthought.text === subthoughtUnderSelection().text
          // .subthought-highlight {
          //   border-bottom: solid 1px;
          // }
        }
        style={{
          ...styleAnnotation,
          minWidth: `${MIN_CONTENT_WIDTH_EM - 0.333 - 0.333}em`, // min width of thought (3em) - 0.333em left padding - 0.333em right padding
        }}
      >
        <span
          className={css({
            fontSize: '1.25em',
            margin: '-0.375em 0 0 -0.05em',
            position: 'absolute',
          })}
        >
          {/* only render FauxCaret for original component */}
          {!cursorOverlay && <FauxCaret caretType='thoughtStart' />}
        </span>
        <span
          className={css(
            {
              visibility: 'hidden',
              position: 'relative',
              clipPath: 'inset(0.001px 0 0.1em 0)',
              wordBreak: 'break-word',
              ...(ellipsizedUrl && {
                display: 'inline-block',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
                /*
                    vertical-align: top; - This fixes the height difference problem of .thought-annotation and .thought
                    Here is the reference to the reason.
                    https://stackoverflow.com/questions/20310690/overflowhidden-on-inline-block-adds-height-to-parent
                */
                verticalAlign: 'top',
              }),
            },
            cssRaw,
          )}
          style={style}
          dangerouslySetInnerHTML={{ __html: textMarkup || placeholder || '&ZeroWidthSpace;' }}
        />
        {children}
      </div>
    </div>
  )
}

export default ThoughtAnnotationWrapper
