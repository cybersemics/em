import { View } from 'moti'
import React from 'react'
import { Text } from 'react-native'
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
import HomeLink from './HomeLink'
import Superscript from './Superscript'
import { ThoughtProps } from './Thought'

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
}: ThoughtProps) => {
  const isRoot = simplePath.length === 1

  const state = store.getState()

  const showContexts = useSelector((state: State) => isContextViewActive(state, rootedParentOf(state, path)))
  const value = useSelector((state: State) => getThoughtById(state, head(simplePath)).value)
  const homeContext = showContexts && isRoot

  // if this thought is in the context view, simplePath may be incomplete as ancestors are partially loaded
  // use thoughtToPath to re-calculate the SimplePath as ancestors load
  // Editable and ContextBreadcrumbs can handle Paths with missing ancestors
  // eventually the complete SimplePath will be loaded
  // TODO: Should this be done in Thought so that Thought is reloaded?
  const simplePathLive = useSelector((state: State) => thoughtToPath(state, head(simplePath)))

  return (
    <View>
      {showContextBreadcrumbs && !isRoot ? (
        <ContextBreadcrumbs
          simplePath={rootedParentOf(state, rootedParentOf(state, simplePathLive))}
          homeContext={homeContext}
        />
      ) : showContexts && simplePathLive.length > 2 ? (
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
        <Divider path={simplePathLive} />
      ) : (
        // cannot use simplePathLive here else Editable gets re-rendered during editing
        <Editable
          path={path}
          cursorOffset={cursorOffset}
          disabled={!isDocumentEditable()}
          isEditing={isEditing}
          rank={rank}
          style={style}
          simplePath={simplePathLive}
          onEdit={onEdit}
        />
      )}

      <Superscript simplePath={simplePathLive} superscript={false} />
    </View>
  )
}

export default StaticThought
