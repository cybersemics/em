import _ from 'lodash'
import React from 'react'
import { ConnectDragSource } from 'react-dnd'
import { useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { thoughtRecipe } from '../../styled-system/recipes'
import { SystemStyleObject } from '../../styled-system/types'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import { isSafari, isTouch } from '../browser'
import { MIN_CONTENT_WIDTH_EM } from '../constants'
import useLayoutAnimationFrameEffect from '../hooks/useLayoutAnimationFrameEffect'
import { LongPressProps } from '../hooks/useLongPress'
import attributeEquals from '../selectors/attributeEquals'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import theme from '../selectors/theme'
import thoughtToPath from '../selectors/thoughtToPath'
import dndRef from '../util/dndRef'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isDivider from '../util/isDivider'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import Divider from './Divider'
import Editable from './Editable'
import useMultiline from './Editable/useMultiline'
import usePlaceholder from './Editable/usePlaceholder'
import ThoughtAnnotation from './ThoughtAnnotation'
import HomeIcon from './icons/HomeIcon'

export interface ThoughtProps {
  allowSingleContext?: boolean
  debugIndex?: number
  dragSource: ConnectDragSource
  longPressProps?: LongPressProps
  editing?: boolean | null
  env?: LazyEnv
  // When context view is activated, some contexts may be pending
  // however since they were not loaded hierarchically there is not a pending thought in the thoughtIndex
  // getContexts will return ids that do not exist in the thoughtIndex
  // Subthoughts gets the special __PENDING__ value from getContexts and passes it through to Thought and Static Thought
  isContextPending?: boolean
  isEditing: boolean
  ellipsizedUrl?: boolean
  isPublishChild?: boolean
  // true if the thought is not hidden by autofocus, i.e. actualDistance < 2
  // currently this does not control visibility, but merely tracks it
  isVisible?: boolean
  leaf?: boolean
  onEdit?: (args: { newValue: string; oldValue: string }) => void
  updateSize?: () => void
  path: Path
  rank: number
  showContextBreadcrumbs?: boolean
  showContexts?: boolean
  simplePath: SimplePath
  cssRaw?: SystemStyleObject
  cssRawThought?: SystemStyleObject
  style?: React.CSSProperties
  styleAnnotation?: React.CSSProperties
  styleContainer?: React.CSSProperties
  styleThought?: React.CSSProperties
  view?: string | null
}

/** Returns true if a color is white, in rgb, rgba, hex, or color name. */
const isWhite = (color: string | undefined) => {
  switch (color) {
    case 'rgb(255, 255, 255)':
    case 'rgba(255, 255, 255, 1)':
    case '#fff':
    case '#ffffff':
    case 'white':
      return true
    default:
      return false
  }
}

/** Returns true if a color is black, in rgb, rgba, hex, or color name. */
const isBlack = (color: string | undefined) => {
  switch (color) {
    case 'rgb(0, 0, 0)':
    case 'rgba(0, 0, 0, 1)':
    case '#000':
    case '#000000':
    case 'black':
      return true
    default:
      return false
  }
}

/** A static thought element with overlay bullet, context breadcrumbs, editable, and superscript. */
const StaticThought = ({
  allowSingleContext,
  dragSource,
  longPressProps,
  // See: ThoughtProps['isContextPending']
  env,
  isContextPending,
  isEditing,
  ellipsizedUrl,
  isVisible,
  onEdit,
  path,
  rank,
  showContextBreadcrumbs,
  simplePath,
  cssRaw,
  cssRawThought,
  style,
  styleThought,
  styleAnnotation,
  updateSize,
}: ThoughtProps) => {
  const showContexts = useSelector(state => isContextViewActive(state, rootedParentOf(state, path)))
  const fontSize = useSelector(state => state.fontSize)
  const dark = useSelector(state => theme(state) !== 'Light')
  const homeContext = isRoot(simplePath) && !isContextPending
  const value = useSelector(state => getThoughtById(state, head(simplePath))?.value) ?? ''
  // store ContentEditable ref to update DOM without re-rendering the Editable during editing
  const editableRef = React.useRef<HTMLInputElement>(null)
  const multiline = useMultiline(editableRef, simplePath, isEditing)
  const placeholder = usePlaceholder({ isEditing, simplePath })

  useLayoutAnimationFrameEffect(updateSize, [multiline])

  // if this thought is in the context view, simplePath may be incomplete as ancestors are partially loaded
  // use thoughtToPath to re-calculate the SimplePath as ancestors load
  // Editable and ContextBreadcrumbs can handle Paths with missing ancestors
  // eventually the complete SimplePath will be loaded
  // TODO: Should this be done in Thought so that Thought is reloaded?
  const simplePathLive = useSelector(
    state => (showContexts ? thoughtToPath(state, head(simplePath)) : simplePath),
    _.isEqual,
  )

  const isTableCol1 = useSelector(state => attributeEquals(state, head(parentOf(simplePath)), '=view', 'Table'))

  // console.info('<StaticThought> ' + prettyPath(store.getState(), simplePath))
  // useWhyDidYouUpdate('<StaticThought> ' + prettyPath(store.getState(), simplePath), {
  //   editing,
  //   isContextPending,
  //   isEditing,
  //   isVisible,
  //   onEdit,
  //   path,
  //   rank,
  //   showContextBreadcrumbs,
  //   simplePath,
  //   style,
  //   // hooks
  //   showContexts,
  //   value,
  //   simplePathLive: simplePathLive.join('/'),
  // })

  return (
    <>
      <ThoughtAnnotation
        env={env}
        minContexts={allowSingleContext ? 0 : 2}
        multiline={multiline}
        ellipsizedUrl={ellipsizedUrl}
        placeholder={placeholder}
        path={path}
        showContextBreadcrumbs={showContextBreadcrumbs}
        simplePath={simplePath}
        cssRaw={cssRawThought}
        style={styleThought}
        styleAnnotation={styleAnnotation || undefined}
      />
      <div
        aria-label='thought'
        {...longPressProps}
        className={cx(
          thoughtRecipe({
            ellipsizedUrl,
            inverse: (dark && isBlack(styleAnnotation?.color)) || (!dark && isWhite(styleAnnotation?.color)),
          }),
        )}
        // HTML5Backend will override this to be "true" on platforms that use it.
        // iOS Safari needs it to be true to disable native long press behavior. (#2953, #2931, #2964)
        // Android works better if draggable is false.
        draggable={!!longPressProps && isSafari()}
        ref={isTouch ? dndRef(ref => dragSource(ref)) : undefined}
        style={{ minWidth: `${MIN_CONTENT_WIDTH_EM}em` }}
      >
        {homeContext ? (
          // left, top are eyeballed for different font sizes
          <HomeIcon className={css({ position: 'relative' })} style={{ left: fontSize - 14, top: fontSize / 4 - 1 }} />
        ) : isDivider(value) ? (
          <Divider path={simplePathLive} />
        ) : /* insert padding equal to the Editable height while context ancestors are loading */ isContextPending ? (
          <div className={css({ paddingTop: '2.8em' })}></div>
        ) : (
          <Editable
            editableRef={editableRef}
            multiline={multiline}
            placeholder={placeholder}
            path={path}
            isEditing={isEditing}
            isVisible={isVisible}
            rank={rank}
            style={style}
            simplePath={simplePathLive}
            onEdit={onEdit}
            className={css(
              {
                ...(isTableCol1 && { maxWidth: '100%' }),
                ...(isAttribute(value) && { fontFamily: 'monospace' }),
                ...(ellipsizedUrl && {
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
          />
        )}
      </div>
    </>
  )
}

const StaticThoughtMemo = React.memo(StaticThought)
StaticThoughtMemo.displayName = 'StaticThought'

export default StaticThoughtMemo
