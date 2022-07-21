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
import HomeLink from './HomeLink'
import Superscript from './Superscript'
import { ConnectedThoughtProps } from './Thought'

/** A static thought element with overlay bullet, context breadcrumbs, editable, and superscript. */
const StaticThought = ({
  cursorOffset,
  isEditing,
  isVisible,
  path,
  rank,
  showContextBreadcrumbs,
  style,
  simplePath,
  onEdit,
  editing,
}: ConnectedThoughtProps) => {
  const isRoot = simplePath.length === 1

  const state = store.getState()

  const showContexts = useSelector((state: State) => isContextViewActive(state, rootedParentOf(state, path)))
  const homeContext = showContexts && isRoot
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
            /* TODO: Add setting to enable tabIndex for accessibility */ onClick={() => {
              store.dispatch(expandContextThought(path))
            }}
          >
            ...{' '}
          </a>
        </span>
      ) : null}

      {homeContext ? (
        <HomeLink />
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
      )}

      <Superscript simplePath={simplePath} superscript={false} />
    </div>
  )
}

export default StaticThought
