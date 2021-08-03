import React, { createRef, useEffect, useRef } from 'react'
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
import { State } from '../@types'
import { commonStyles } from '../style/commonStyles'
import ModalAuth from './ModalAuth'
import ErrorMessage from './ErrorMessage'
import Content from './Content'

import MultiGesture, { MultiGestureRef } from './MultiGesture.native'
import { store } from '../store'
import { isGestureHint, inputHandlers } from '../shortcuts'

const { flexOne, darkBackground } = commonStyles

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
  const multiGestureRef = createRef<MultiGestureRef>()
  const dispatch = useDispatch()
  const { height } = useDimensions().screen

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
          {showAlert && <Alert />}
          <ErrorMessage />
          <Toolbar />
          <MultiGesture
            ref={multiGestureRef}
            onGesture={handleGestureSegment}
            onEnd={handleGestureEnd}
            shouldCancelGesture={shouldCancelGesture}
            onCancel={handleGestureCancel}
          >
            <View style={contentHeight}>
              <ScrollView scrollEnabled={multiGestureRef.current?.scrolling} nestedScrollEnabled={true} style={flexOne}>
                <Content />
              </ScrollView>

              <NavBar position='top' />
            </View>

            <Footer />
          </MultiGesture>

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
