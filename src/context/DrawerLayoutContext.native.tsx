import React, { useRef } from 'react'
import { SafeAreaView, StyleSheet } from 'react-native'
import DrawerLayout from 'react-native-gesture-handler/DrawerLayout'
import Sidebar from '../components/Sidebar'

export interface IDrawerLayoutContext {
  openDrawer: () => void
}

export const DrawerLayoutContext = React.createContext<IDrawerLayoutContext | null>(null)

/** UseDrawerLayoutContext hook. */
export const useDrawerLayoutContext = () => React.useContext(DrawerLayoutContext)

/** DrawerLayoutContext provider. */
export const DrawerLayoutProvider: React.FC = ({ children }) => {
  const drawerRef = useRef<DrawerLayout>(null)

  /** Open drawer menu. */
  const openDrawer = () => {
    drawerRef?.current?.openDrawer()
  }

  return (
    <DrawerLayoutContext.Provider value={{ openDrawer }}>
      <SafeAreaView style={styles.container}>
        <DrawerLayout ref={drawerRef} drawerWidth={300} drawerType='front' renderNavigationView={Sidebar}>
          {children}
        </DrawerLayout>
      </SafeAreaView>
    </DrawerLayoutContext.Provider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
})
