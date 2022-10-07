import _ from 'lodash'
import React from 'react'
import { useSelector } from 'react-redux'
import State from '../@types/State'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import thoughtToPath from '../selectors/thoughtToPath'
import head from '../util/head'
import isDivider from '../util/isDivider'
import isDocumentEditable from '../util/isDocumentEditable'
import Divider from './Divider'
import Editable from './Editable'
import Superscript from './Superscript'
import { ThoughtProps } from './Thought'
import HomeIcon from './icons/HomeIcon'

/** A static thought element with overlay bullet, context breadcrumbs, editable, and superscript. */
const StaticThought = ({
  cursorOffset,
  editing,
  // See: ThoughtProps['isContextPending']
  isContextPending,
  isEditing,
  isVisible,
  onEdit,
  path,
  rank,
  showContextBreadcrumbs,
  simplePath,
  style,
}: ThoughtProps) => {
  const isParentRoot = simplePath.length === 1

  const showContexts = useSelector((state: State) => isContextViewActive(state, rootedParentOf(state, path)))
  const homeContext = showContexts && isParentRoot && !isContextPending
  const value = useSelector((state: State) => getThoughtById(state, head(simplePath)).value)

  // if this thought is in the context view, simplePath may be incomplete as ancestors are partially loaded
  // use thoughtToPath to re-calculate the SimplePath as ancestors load
  // Editable and ContextBreadcrumbs can handle Paths with missing ancestors
  // eventually the complete SimplePath will be loaded
  // TODO: Should this be done in Thought so that Thought is reloaded?
  const simplePathLive = useSelector(
    (state: State) => (showContexts ? rootedParentOf(state, thoughtToPath(state, head(simplePath))) : simplePath),
    _.isEqual,
  )

  // console.info('<StaticThought> ' + prettyPath(store.getState(), simplePath))
  // useWhyDidYouUpdate('<StaticThought> ' + prettyPath(store.getState(), simplePath), {
  //   cursorOffset,
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
    <div aria-label='thought' className='thought'>
      {
        // render nothing if it is a pending context since we have no value
        homeContext ? (
          <HomeIcon />
        ) : isDivider(value) ? (
          <Divider path={simplePathLive} />
        ) : /* insert padding equal to the Editable height while context ancestors are loading */ isContextPending ? (
          <div style={{ paddingTop: '2.8em' }}></div>
        ) : (
          <Editable
            path={path}
            cursorOffset={cursorOffset}
            editing={editing}
            disabled={!isDocumentEditable()}
            isEditing={isEditing}
            isVisible={isVisible}
            rank={rank}
            style={style}
            simplePath={simplePathLive}
            onEdit={onEdit}
          />
        )
      }

      <Superscript simplePath={simplePathLive} superscript={false} />
    </div>
  )
}

export default StaticThought
