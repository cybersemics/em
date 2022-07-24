import React from 'react'
import { useSelector } from 'react-redux'
import State from '../@types/State'
import expandContextThought from '../action-creators/expandContextThought'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
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
  const isRoot = simplePath.length === 1

  const state = store.getState()

  const showContexts = useSelector((state: State) => isContextViewActive(state, rootedParentOf(state, path)))
  const homeContext = showContexts && isRoot && !isContextPending
  const value = useSelector((state: State) => getThoughtById(state, head(simplePath)).value)

  return (
    <div aria-label='thought' className='thought'>
      {showContextBreadcrumbs && !isRoot ? (
        <ContextBreadcrumbs
          simplePath={rootedParentOf(state, rootedParentOf(state, simplePath))}
          homeContext={homeContext}
        />
      ) : showContexts && simplePath.length > 2 ? (
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
        isContextPending ? null : homeContext ? (
          <HomeIcon />
        ) : isDivider(value) ? (
          <Divider path={simplePath} />
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
            simplePath={showContexts ? rootedParentOf(state, simplePath) : simplePath}
            onEdit={onEdit}
          />
        )
      }

      <Superscript simplePath={simplePath} superscript={false} />
    </div>
  )
}

export default StaticThought
