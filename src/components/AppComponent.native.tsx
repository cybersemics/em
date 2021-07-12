import React, { useEffect, useRef } from 'react'
import { StyleSheet, ScrollView, View, Dimensions } from 'react-native'
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
import ModalExport from './ModalExport'
import Footer from './Footer'
import { Text } from './Text.native'
import { useDimensions } from '@react-native-community/hooks'
import { SafeAreaView } from 'react-native-safe-area-context'

/**
 * AppComponent container.
 */
const AppComponent: React.FC = () => {
  const drawerRef = useRef<DrawerLayout>(null)
  const dispatch = useDispatch()
  const { height } = useDimensions().screen

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

  const contentHeight = {
    height: height - 125,
  }

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
          <ScrollView nestedScrollEnabled={true} style={styles.flexOne}>
            <View style={contentHeight}>
              <ScrollView nestedScrollEnabled={true} style={styles.flexOne}>
                {Array(50)
                  .fill(1)
                  .map((_, index) => {
                    return (
                      <Text key={index} style={styles.text}>
                        hello World - em thoughts {index}
                      </Text>
                    )
                  })}
              </ScrollView>
              <NavBar position='top' />
            </View>

            <Footer />
          </ScrollView>

          <ModalFeedback />
          <ModalHelp />
          <ModalWelcome />
          <ModalExport />
        </DrawerLayout>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    // marginTop: RNStatusBar.currentHeight,
  },
  flexOne: { flex: 1 },
  content: {
    height: Dimensions.get('screen').height - 120,
  },
  text: {
    color: '#fff',
  },
})

export default AppComponent
