/*

Test:

  - Gestures disabled during toolbar scroll
  - Overlay shown on hover/tap-and-hold after delay
  - Overlay hidden on toolbar scroll
  - Overlay hidden on touch "leave"

*/
import React, { FC, useCallback } from 'react'
import { FlatList, GestureResponderEvent, ListRenderItem, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useSelector } from 'react-redux'
import { createSelector } from 'reselect'
import Icon from '../@types/Icon'
import State from '../@types/State'
import { TOOLBAR_DEFAULT_SHORTCUTS } from '../constants'
import { shortcutById } from '../shortcuts'
import { store } from '../store'
import HamburgerMenu from './HamburgerMenu'

/**
 * Selects thoughts from the state.
 */
const thoughtsSelector = (state: State) => state.thoughts
/**
 * Selects cursor from the state.
 */
const cursorSelector = (state: State) => state.cursor

/**
 * Creates new memoized selector with a boolean function as a tranform function. It  only recomputes on change in thoughts and cursor.
 */
const makeBooleanSelector = (check: () => boolean) => createSelector([thoughtsSelector, cursorSelector], () => check())

interface ToolbarIconsProps {
  shortcutId: string
  fillColor: string
}

/**
 * ToolbarIcon component.
 */
const ToolbarIcon: FC<ToolbarIconsProps> = ({ shortcutId, fillColor }) => {
  const { svg, exec, isActive } = shortcutById(shortcutId)! ?? {}

  const isActiveSelector = useCallback(isActive ? makeBooleanSelector(() => isActive(store.getState)) : () => true, [
    isActive,
  ])

  const isButtonActive = useSelector((state: State) => isActiveSelector(state))

  const SVG = svg as React.FC<Icon>

  return (
    <TouchableOpacity
      onPress={(e: GestureResponderEvent) => exec(store.dispatch, store.getState, e, { type: 'toolbar' })}
      style={styles.button}
    >
      <SVG fill={isButtonActive ? fillColor : 'grey'} size={35} />
    </TouchableOpacity>
  )
}

/** Toolbar component mobile. */
const Toolbar = ({
  dark = true,
  fontSize = 12,
  toolbarOverlay = null,
  scrollPrioritized = true,
  showTopControls = true,
}) => {
  const wholeStore = useSelector((state: State) => state)

  const fillColor = dark ? 'white' : 'black'

  const shortcutIds = TOOLBAR_DEFAULT_SHORTCUTS

  const keyExtractor = useCallback((item: string) => item, [])

  // Todo: Fix re-render by adding a isActive methods within the main Icon component
  const renderItem: ListRenderItem<string> = useCallback(
    ({ item: id }) => <ToolbarIcon key={id} shortcutId={id} fillColor={fillColor} />,
    [wholeStore],
  )

  /**********************************************************************
   * Render
   **********************************************************************/
  return (
    <View style={styles.container}>
      <HamburgerMenu />
      <FlatList<string>
        style={styles.flexGrow}
        data={shortcutIds}
        horizontal={true}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignContent: 'center' },
  flexGrow: { flexGrow: 0 },
  button: { margin: 8 },
})

export default Toolbar
