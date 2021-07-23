import React, { useEffect, useRef } from 'react'
import { ScrollView, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import Toolbar from './Toolbar'
import NavBar from './NavBar'
import ModalFeedback from './ModalFeedback'
import { toggleSidebar } from '../action-creators'
import { useDispatch, useSelector } from 'react-redux'
import { DrawerLayout } from 'react-native-gesture-handler'
import Sidebar from './Sidebar'
import ModalHelp from './ModalHelp'
import ModalWelcome from './ModalWelcome'
import ModalExport from './ModalExport'
import Alert from './Alert'
import Footer from './Footer'
import { useDimensions } from '@react-native-community/hooks'
import { SafeAreaView } from 'react-native-safe-area-context'
import { State } from '../@types'
import { commonStyles } from '../style/commonStyles'
import ModalAuth from './ModalAuth'
import ErrorMessage from './ErrorMessage'
import Content from './Content'

const { flexOne, darkBackground } = commonStyles

/**
 * AppComponent container.
 */
const AppComponent: React.FC = () => {
  const drawerRef = useRef<DrawerLayout>(null)
  const dispatch = useDispatch()
  const { height } = useDimensions().screen

  const showSidebar = useSelector((state: State) => state.showSidebar)
  const alert = useSelector((state: State) => state.alert)

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
      <SafeAreaView style={[flexOne, darkBackground]}>
        <DrawerLayout
          ref={drawerRef}
          drawerWidth={300}
          drawerType='front'
          onDrawerClose={onDrawerClose}
          renderNavigationView={Sidebar}
        >
          {alert && <Alert />}
          <ErrorMessage />
          <Toolbar />
          <ScrollView nestedScrollEnabled={true} style={flexOne}>
            <View style={contentHeight}>
              <ScrollView nestedScrollEnabled={true} style={flexOne}>
                <Content />
              </ScrollView>
              <NavBar position='top' />
            </View>

            <Footer />
          </ScrollView>

          <ModalAuth />
          <ModalFeedback />
          <ModalHelp />
          <ModalWelcome />
          <ModalExport />
        </DrawerLayout>
      </SafeAreaView>
    </>
  )
}

export default AppComponent
