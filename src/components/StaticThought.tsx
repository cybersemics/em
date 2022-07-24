import React from 'react'
import { useSelector } from 'react-redux'
import State from '../@types/State'
import expandContextThought from '../action-creators/expandContextThought'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import thoughtToPath from '../selectors/thoughtToPath'
import { store } from '../store'
import head from '../util/head'
import isDivider from '../util/isDivider'
import isDocumentEditable from '../util/isDocumentEditable'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import Divider from './Divider'
import Editable from './Editable'
import Superscript from './Superscript'
import { ConnectedThoughtProps } from './Thought'
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
}: ConnectedThoughtProps) => {
  const isParentRoot = simplePath.length === 1

  const state = store.getState()

  const showContexts = useSelector((state: State) => isContextViewActive(state, rootedParentOf(state, path)))
  const homeContext = showContexts && isParentRoot && !isContextPending
  const value = useSelector((state: State) => getThoughtById(state, head(simplePath)).value)

  // if this thought is in the context view, simplePath may be incomplete as ancestors are partially loaded
  // use thoughtToPath to re-calculate the SimplePath as ancestors load
  // Editable and ContextBreadcrumbs can handle Paths with missing ancestors
  // eventually the complete SimplePath will be loaded
  // TODO: Should this be done in Thought so that Thought is reloaded?
  const simplePathLive = useSelector((state: State) => thoughtToPath(state, head(simplePath)))

  return (
    <div aria-label='thought' className='thought'>
      {showContextBreadcrumbs && !isParentRoot ? (
        <ContextBreadcrumbs
          simplePath={rootedParentOf(state, rootedParentOf(state, simplePathLive))}
          homeContext={homeContext}
        />
      ) : showContexts && simplePathLive.length > 2 ? (
        <span className='ellipsis'>
          <a
            tabIndex={-1}
            onClick={() => {
              store.dispatch(expandContextThought(path))
            }}
          >
            ...{' '}
          </a>
        </span>
      ) : null}

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
            simplePath={showContexts ? rootedParentOf(state, simplePathLive) : simplePathLive}
            onEdit={onEdit}
          />
        )
      }

      <Superscript simplePath={simplePath} superscript={false} />
    </div>
  )
}

export default StaticThought
