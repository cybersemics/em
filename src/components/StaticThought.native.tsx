import { View } from 'moti'
import React from 'react'
import { Text } from 'react-native'
import expandContextThought from '../action-creators/expandContextThought'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import { store } from '../store'
import head from '../util/head'
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
  path,
  rank,
  showContextBreadcrumbs,
  showContexts,
  style,
  simplePath,
  onEdit,
}: ConnectedThoughtProps) => {
  const isRoot = simplePath.length === 1

  const state = store.getState()

  const { value } = getThoughtById(state, head(simplePath))

  return (
    <View>
      {showContextBreadcrumbs && !isRoot ? (
        <ContextBreadcrumbs
          simplePath={rootedParentOf(state, rootedParentOf(state, simplePath))}
          homeContext={homeContext}
        />
      ) : showContexts && simplePath.length > 2 ? (
        <Text>
          <Text
            // tabIndex={-1}
            /* TODO: Add setting to enable tabIndex for accessibility */ onMagicTap={() => {
              store.dispatch(expandContextThought(path))
            }}
          >
            ...{' '}
          </Text>
        </Text>
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
          disabled={!isDocumentEditable()}
          isEditing={isEditing}
          rank={rank}
          showContexts={showContexts}
          style={style}
          simplePath={simplePath}
          onEdit={onEdit}
        />
      )}

      <Superscript simplePath={simplePath} showContexts={showContexts} superscript={false} />
    </View>
  )
}

export default StaticThought
