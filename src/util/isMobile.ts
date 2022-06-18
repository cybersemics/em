import { Platform } from 'react-native'

/** Checks if app is running on mobile env. */
const isMobile = () => Platform.OS !== 'web'

export default isMobile
