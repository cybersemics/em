import { css, cx } from '../../styled-system/css'
import { multilineRecipe } from '../../styled-system/recipes'
import { SystemStyleObject } from '../../styled-system/types'
import { MIN_CONTENT_WIDTH_EM } from '../constants'
import isAttribute from '../util/isAttribute'
import FauxCaret from './FauxCaret'

type ThoughtAnnotationWrapperPlaceholderProps = {
  asPlaceholder: true
  children?: never
  ellipsizedUrl?: undefined
  multiline?: undefined
  value?: undefined
  styleAnnotation?: undefined
  cssRaw?: undefined
  style?: undefined
  isTableCol1: boolean
  textMarkup?: undefined
  placeholder?: undefined
}

type ThoughtAnnotationWrapperVisibleProps = {
  asPlaceholder?: false
  ellipsizedUrl?: boolean
  multiline?: boolean
  value: string
  styleAnnotation?: React.CSSProperties
  cssRaw?: SystemStyleObject
  style?: React.CSSProperties
  children: React.ReactNode
  isTableCol1: boolean
  textMarkup: string
  placeholder?: string
}

type ThoughtAnnotationWrapperProps = ThoughtAnnotationWrapperPlaceholderProps | ThoughtAnnotationWrapperVisibleProps

/**
 * Shared component used by ThoughtAnnotation and BulletCursorOverlay.
 * In BulletCursorOverlay, it mirrors the real thought position to compute the overlay cursor position.
 */
export default function ThoughtAnnotationWrapper({
  asPlaceholder = false,
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
}: ThoughtAnnotationWrapperProps) {
  return (
    <div
      aria-label='thought-annotation'
      className={css({
        position: 'absolute',
        pointerEvents: 'none',
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
        maxWidth: multiline ? 'calc(100% - 2em)' : '100%',
        '@media (max-width: 500px)': {
          marginTop: { _android: '-2.1px' },
          marginLeft: { _android: '0.5em' },
        },
        '@media (min-width: 560px) and (max-width: 1024px)': {
          marginTop: { _android: '-0.1px' },
          marginLeft: { _android: '0.5em' },
        },
      })}
      style={{
        ...(asPlaceholder
          ? {
              visibility: 'hidden',
            }
          : {}),
      }}
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
              padding: '0 0.333em',
              boxSizing: 'border-box',
              whiteSpace: ellipsizedUrl ? 'nowrap' : undefined,
              /*
                    Since .editable-annotation-text is display: inline the margin only gets applied to its first line, and not later lines.
                    To make sure all lines are aligned need to apply the margin here, and remove margin from the .editable-annotation-text
                  */
              margin: '-0.5px 0 0 calc(1em - 18px)',
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
          <FauxCaret caretType='thoughtStart' />
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
