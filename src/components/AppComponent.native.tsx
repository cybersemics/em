import React, { useEffect, useRef } from 'react'
import { Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import Toolbar from './Toolbar'
import NavBar from './NavBar'
import ModalFeedback from './ModalFeedback'
import { toggleSidebar } from '../action-creators'
import { useDispatch, useSelector } from 'react-redux'
import { State } from '../util/initialState'
import { DrawerLayout } from 'react-native-gesture-handler'
import Sidebar from './Sidebar'
import ModalHelp from './ModalHelp'
import ModalWelcome from './ModalWelcome'

/**
 * AppComponent container.
 */
const AppComponent: React.FC = () => {
  const drawerRef = useRef<DrawerLayout>(null)
  const dispatch = useDispatch()

  const showSidebar = useSelector((state: State) => state.showSidebar)

  /** Open drawer menu. */
  const openDrawer = () => {
    drawerRef?.current?.openDrawer()
  }

  /** On drawer close. */
  const onDrawerClose = () => {
    dispatch(toggleSidebar({ value: false }))
  }

  /** List to show sidebar. */
  useEffect(() => {
    if (showSidebar) return openDrawer()
  }, [showSidebar])

  return (
    <>
      <StatusBar
        // eslint-disable-next-line react/style-prop-object
        style='light'
      />
      <SafeAreaView style={styles.container}>
        <DrawerLayout
          ref={drawerRef}
          drawerWidth={300}
          drawerType='front'
          onDrawerClose={onDrawerClose}
          renderNavigationView={Sidebar}
        >
          <Toolbar />
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.text}>hello World - em thoughts</Text>
          </ScrollView>
          <NavBar position='top' />
          <ModalFeedback />

          <ModalHelp />
          <ModalWelcome />
        </DrawerLayout>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 20,
  },
})

export default AppComponent
