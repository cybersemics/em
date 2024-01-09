import _ from 'lodash'
import React, { useEffect } from 'react'
import { useSelector } from 'react-redux'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import attributeEquals from '../selectors/attributeEquals'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import thoughtToPath from '../selectors/thoughtToPath'
import head from '../util/head'
import isDivider from '../util/isDivider'
import isDocumentEditable from '../util/isDocumentEditable'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import Divider from './Divider'
import Editable from './Editable'
import useMultiline from './Editable/useMultiline'
import Superscript from './Superscript'
import ThoughtAnnotation from './ThoughtAnnotation'
import HomeIcon from './icons/HomeIcon'

export interface ThoughtProps {
  allowSingleContext?: boolean
  debugIndex?: number
  editing?: boolean | null
  env?: LazyEnv
  // When context view is activated, some contexts may be pending
  // however since they were not loaded hierarchically there is not a pending thought in the thoughtIndex
  // getContexts will return ids that do not exist in the thoughtIndex
  // Subthoughts gets the special __PENDING__ value from getContexts and passes it through to Thought and Static Thought
  isContextPending?: boolean
  isEditing?: boolean
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
  style?: React.CSSProperties
  styleAnnotation?: React.CSSProperties
  styleContainer?: React.CSSProperties
  styleThought?: React.CSSProperties
  view?: string | null
}

/** A static thought element with overlay bullet, context breadcrumbs, editable, and superscript. */
const StaticThought = ({
  allowSingleContext,
  editing,
  // See: ThoughtProps['isContextPending']
  env,
  isContextPending,
  isEditing,
  isVisible,
  onEdit,
  path,
  rank,
  showContextBreadcrumbs,
  simplePath,
  style,
  styleThought,
  styleAnnotation,
  updateSize,
}: ThoughtProps) => {
  const showContexts = useSelector(state => isContextViewActive(state, rootedParentOf(state, path)))
  const fontSize = useSelector(state => state.fontSize)
  const homeContext = showContexts && isRoot(simplePath) && !isContextPending
  const value = useSelector(state => getThoughtById(state, head(simplePath)).value)
  // store ContentEditable ref to update DOM without re-rendering the Editable during editing
  const editableRef = React.useRef<HTMLInputElement>(null)
  const multiline = useMultiline(editableRef, simplePath, isEditing)

  useEffect(() => {
    updateSize?.()
  }, [multiline, updateSize])

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
        path={path}
        showContextBreadcrumbs={showContextBreadcrumbs}
        simplePath={showContexts ? parentOf(simplePath) : simplePath}
        style={styleThought}
        styleAnnotation={styleAnnotation || undefined}
      />
      <div
        aria-label='thought'
        className='thought'
        style={{
          // do not set a min-width on table column 1 since there is no room for additional click area
          minWidth: !isTableCol1 ? '3em' : undefined,
        }}
      >
        {homeContext ? (
          // left, top are eyeballed for different font sizes
          <HomeIcon style={{ position: 'relative', left: fontSize - 14, top: fontSize / 4 - 1 }} />
        ) : isDivider(value) ? (
          <Divider path={simplePathLive} />
        ) : /* insert padding equal to the Editable height while context ancestors are loading */ isContextPending ? (
          <div style={{ paddingTop: '2.8em' }}></div>
        ) : (
          <Editable
            editableRef={editableRef}
            multiline={multiline}
            path={path}
            disabled={!isDocumentEditable()}
            isEditing={isEditing}
            isVisible={isVisible}
            rank={rank}
            style={style}
            simplePath={simplePathLive}
            onEdit={onEdit}
          />
        )}

        <Superscript simplePath={simplePathLive} superscript={false} />
      </div>
    </>
  )
}

const StaticThoughtMemo = React.memo(StaticThought)
StaticThoughtMemo.displayName = 'StaticThought'

export default StaticThoughtMemo
