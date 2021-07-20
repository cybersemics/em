import React from 'react'
import { isTouch } from '../browser'
import { store } from '../store'
import { rootedParentOf } from '../selectors'
import { expandContextThought } from '../action-creators'
import { headValue, isDivider, isDocumentEditable } from '../util'

// components
import BulletCursorOverlay from './BulletCursorOverlay'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import Divider from './Divider'
import Editable from './Editable'
import HomeLink from './HomeLink'
import Superscript from './Superscript'
import { ConnectedThoughtProps } from './Thought'
import { View } from 'moti'
import { Text } from 'react-native'

/** A static thought element with overlay bullet, context breadcrumbs, editable, and superscript. */
const StaticThought = ({
  cursorOffset,
  env,
  hideBullet,
  homeContext,
  isDragging,
  isEditing,
  isLeaf,
  path,
  publish,
  rank,
  showContextBreadcrumbs,
  showContexts,
  style,
  simplePath,
  toggleTopControlsAndBreadcrumbs,
}: ConnectedThoughtProps) => {
  const isRoot = simplePath.length === 1
  const isRootChildLeaf = simplePath.length === 2 && isLeaf

  const state = store.getState()

  return (
    <View>
      {!(publish && (isRoot || isRootChildLeaf)) && !hideBullet && (
        <BulletCursorOverlay simplePath={simplePath} isDragging={isDragging} />
      )}

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
      ) : isDivider(headValue(simplePath)) ? (
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
          onKeyDownAction={isTouch ? undefined : toggleTopControlsAndBreadcrumbs}
        />
      )}

      <Superscript simplePath={simplePath} showContexts={showContexts} superscript={false} />
    </View>
  )
}

export default StaticThought
