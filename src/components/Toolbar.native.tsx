/*

Test:

  - Gestures disabled during toolbar scroll
  - Overlay shown on hover/tap-and-hold after delay
  - Overlay hidden on toolbar scroll
  - Overlay hidden on touch "leave"

*/

import React, { useCallback } from 'react'
import { shortcutById } from '../shortcuts'
import { FlatList, ListRenderItem, TouchableOpacity, View, StyleSheet, GestureResponderEvent } from 'react-native'
// import { store } from '../store'
import { TOOLBAR_DEFAULT_SHORTCUTS } from '../constants'
import { Icon, State } from '../@types'
import HamburgerMenu from './HamburgerMenu'
import { store } from '../store'
import { useSelector } from 'react-redux'

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
    ({ item: id }) => {
      const { svg, exec, isActive } = shortcutById(id)! ?? {}

      const isButtonActive = !isActive || isActive(store.getState)

      const SVG = svg as React.FC<Icon>

      return (
        <TouchableOpacity
          key={id}
          onPress={(e: GestureResponderEvent) => exec(store.dispatch, store.getState, e, { type: 'toolbar' })}
          style={styles.button}
        >
          <SVG fill={isButtonActive ? fillColor : 'grey'} size={35} />
        </TouchableOpacity>
      )
    },
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
