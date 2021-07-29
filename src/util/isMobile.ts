import { Platform } from 'react-native'

/** Checks if app is running on mobile env. */
export const isMobile = () => Platform.OS !== 'web'
