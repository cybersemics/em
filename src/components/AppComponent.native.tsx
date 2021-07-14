import { useDimensions } from '@react-native-community/hooks'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useRef } from 'react'
import { ScrollView, View } from 'react-native'
import { DrawerLayout } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'
import { State } from '../@types'
import { toggleSidebar } from '../action-creators'
import { commonStyles } from '../style/commonStyles'
import Alert from './Alert'
import Footer from './Footer'
import ModalAuth from './ModalAuth'
import ModalExport from './ModalExport'
import ModalFeedback from './ModalFeedback'
import ModalHelp from './ModalHelp'
import ModalWelcome from './ModalWelcome'
import NavBar from './NavBar'
import Sidebar from './Sidebar'
import { Text } from './Text.native'
import Toolbar from './Toolbar'

const { flexOne, darkBackground, whiteText } = commonStyles

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
          <Toolbar />
          <ScrollView nestedScrollEnabled={true} style={flexOne}>
            <View style={contentHeight}>
              <ScrollView nestedScrollEnabled={true} style={flexOne}>
                {Array(50)
                  .fill(1)
                  .map((_, index) => {
                    return (
                      <Text key={index} style={whiteText}>
                        hello World - em thoughts {index}
                      </Text>
                    )
                  })}
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
