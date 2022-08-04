import { useDimensions } from '@react-native-community/hooks'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { DrawerLayout } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'
import State from '../@types/State'
import alert from '../action-creators/alert'
import toggleSidebar from '../action-creators/toggleSidebar'
import * as selection from '../device/selection'
import isTutorial from '../selectors/isTutorial'
import { inputHandlers } from '../shortcuts'
import { store } from '../store'
import { commonStyles } from '../style/commonStyles'
import storage from '../util/storage'
import Alert from './Alert'
import Content from './Content.native'
import ErrorMessage from './ErrorMessage'
import Footer from './Footer'
import ModalAuth from './ModalAuth'
import ModalExport from './ModalExport'
import ModalFeedback from './ModalFeedback'
import ModalHelp from './ModalHelp'
import ModalWelcome from './ModalWelcome'
import MultiGesture from './MultiGesture'
import NavBar from './NavBar'
import Sidebar from './Sidebar'
import Toolbar from './Toolbar'
import Tutorial from './Tutorial'

const tutorialLocal = storage.getItem('Settings/Tutorial') === 'On'

const { flexOne, darkBackground, flexGrow } = commonStyles

const { handleGestureEnd, handleGestureSegment } = inputHandlers(store)

/** Cancel gesture if there is an active text selection on active drag. */
const shouldCancelGesture = () => selection.isActive() || store?.getState().dragInProgress

/** Dismiss gesture hint that is shown by alert. */
const handleGestureCancel = () => {
  store.dispatch((dispatch, getState) => {
    if (getState().alert?.alertType === 'gestureHintExtended') {
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
  const tutorialSettings = useSelector(isTutorial)

  const showSidebar = useSelector((state: State) => state.showSidebar)
  const showAlert = useSelector((state: State) => state.alert)
  const isLoading = useSelector((state: State) => state.isLoading)

  const tutorial = isLoading ? tutorialLocal : tutorialSettings

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
          {tutorial && <Tutorial />}
          {!tutorial && <Toolbar />}

          <ErrorMessage />
          <ScrollView
            scrollEnabled={!isGestureActive}
            nestedScrollEnabled={true}
            contentContainerStyle={flexGrow}
            style={flexOne}
          >
            <View style={contentHeight}>
              <MultiGesture
                onGesture={args => {
                  setIsGestureActive(true)
                  handleGestureSegment(args)
                }}
                onEnd={args => {
                  setIsGestureActive(false)
                  handleGestureEnd(args)
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
