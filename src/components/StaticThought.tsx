import React from 'react'
import { store } from '../store'
import pathToThought from '../selectors/pathToThought'
import rootedParentOf from '../selectors/rootedParentOf'
import expandContextThought from '../action-creators/expandContextThought'
import isDivider from '../util/isDivider'
import isDocumentEditable from '../util/isDocumentEditable'

// components
import ContextBreadcrumbs from './ContextBreadcrumbs'
import Divider from './Divider'
import Editable from './Editable'
import HomeLink from './HomeLink'
import Superscript from './Superscript'
import { ConnectedThoughtProps } from './Thought'

/** A static thought element with overlay bullet, context breadcrumbs, editable, and superscript. */
const StaticThought = ({
  cursorOffset,
  homeContext,
  isEditing,
  isVisible,
  path,
  rank,
  showContextBreadcrumbs,
  showContexts,
  style,
  simplePath,
  onEdit,
  editing,
}: ConnectedThoughtProps) => {
  const isRoot = simplePath.length === 1

  const state = store.getState()

  const { value } = pathToThought(state, simplePath)

  return (
    <div className='thought'>
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
        // cannot use simplePathLive here else Editable gets re-rendered during editing
        <Editable
          path={path}
          cursorOffset={cursorOffset}
          editing={editing}
          disabled={!isDocumentEditable()}
          isEditing={isEditing}
          isVisible={isVisible}
          rank={rank}
          showContexts={showContexts}
          style={style}
          simplePath={simplePath}
          onEdit={onEdit}
        />
      )}

      <Superscript simplePath={simplePath} showContexts={showContexts} superscript={false} />
    </div>
  )
}

export default StaticThought
