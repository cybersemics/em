import { View } from 'moti'
import React from 'react'
import { Text } from 'react-native'
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
  path,
  rank,
  showContextBreadcrumbs,
  style,
  simplePath,
  onEdit,
}: ConnectedThoughtProps) => {
  const isRoot = simplePath.length === 1

  const state = store.getState()

  const showContexts = useSelector((state: State) => isContextViewActive(state, rootedParentOf(state, path)))
  const value = useSelector((state: State) => getThoughtById(state, head(simplePath)).value)
  const homeContext = showContexts && isRoot

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
            onMagicTap={() => {
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
          style={style}
          simplePath={simplePath}
          onEdit={onEdit}
        />
      )}

      <Superscript simplePath={simplePath} superscript={false} />
    </View>
  )
}

export default StaticThought
