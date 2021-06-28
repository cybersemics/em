/*

Test:

  - Gestures disabled during toolbar scroll
  - Overlay shown on hover/tap-and-hold after delay
  - Overlay hidden on toolbar scroll
  - Overlay hidden on touch "leave"

*/

import React, { useCallback } from 'react'
import { shortcutById } from '../shortcuts'
import { FlatList, ListRenderItem, TouchableOpacity, View, StyleSheet } from 'react-native'
// import { store } from '../store'
import { TOOLBAR_DEFAULT_SHORTCUTS } from '../constants'
import { Icon } from '../types'
import HamburgerMenu from './HamburgerMenu'

/** Toolbar component mobile. */
const Toolbar = (
  {
    dark = true,
    fontSize = 12,
    toolbarOverlay = null,
    scrollPrioritized = true,
    showTopControls = true,
  } /* : ReturnType<typeof mapStateToProps> */,
) => {
  const fillColor = dark ? 'white' : 'black'

  const shortcutIds = TOOLBAR_DEFAULT_SHORTCUTS

  const keyExtractor = useCallback((item: string) => item, [])
  const renderItem: ListRenderItem<string> = useCallback(({ item: id, index }) => {
    const { name, svg } = shortcutById(id)! ?? {}

    const SVG = svg as React.FC<Icon>

    return (
      <TouchableOpacity style={styles.button}>
        <SVG key={name} fill={fillColor} size={35} />
      </TouchableOpacity>
    )
  }, [])

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
