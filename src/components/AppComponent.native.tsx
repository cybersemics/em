import React, { useEffect, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import Toolbar from './Toolbar'
import NavBar from './NavBar'
import ModalFeedback from './ModalFeedback'
import { toggleSidebar, alert } from '../action-creators'
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
import { Direction, GesturePath, State } from '../@types'
import { commonStyles } from '../style/commonStyles'
import ModalAuth from './ModalAuth'
import ErrorMessage from './ErrorMessage'
import Content from './Content.native'

import MultiGesture from './MultiGesture'
import { store } from '../store'
import { isGestureHint, inputHandlers } from '../shortcuts'

const { flexOne, darkBackground, flexGrow } = commonStyles

const { handleGestureEnd, handleGestureSegment } = inputHandlers(store)

/** Cancel gesture if there is an active text selection on active drag. */
const shouldCancelGesture = () => store?.getState().dragInProgress

/** Dismiss gesture hint that is shown by alert. */
const handleGestureCancel = () => {
  store.dispatch((dispatch, getState) => {
    if (isGestureHint(getState())) {
      dispatch(alert(null))
    }
  })
}

/**
 * AppComponent container.
 */
const AppComponent: React.FC = () => {
  const drawerRef = useRef<DrawerLayout>(null)

  const dispatch = useDispatch()
  const { height } = useDimensions().screen
  const [isGestureActive, setIsGestureActive] = useState(false)

  const showSidebar = useSelector((state: State) => state.showSidebar)
  const showAlert = useSelector((state: State) => state.alert)

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
    showSidebar ? openDrawer() : drawerRef?.current?.closeDrawer()
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
          {showAlert && <Alert />}
          <ErrorMessage />
          <Toolbar />
          <ScrollView
            scrollEnabled={!isGestureActive}
            nestedScrollEnabled={true}
            contentContainerStyle={flexGrow}
            style={flexOne}
          >
            <View style={contentHeight}>
              <MultiGesture
                onGesture={(g: Direction | null, path: GesturePath) => {
                  setIsGestureActive(true)
                  handleGestureSegment(g, path)
                }}
                onEnd={(...args) => {
                  setIsGestureActive(false)
                  handleGestureEnd(...args)
                }}
                shouldCancelGesture={shouldCancelGesture}
                onCancel={() => {
                  setIsGestureActive(false)
                  handleGestureCancel()
                }}
              >
                <Content scrollEnabled={!isGestureActive} />
              </MultiGesture>
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
