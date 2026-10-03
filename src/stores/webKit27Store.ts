import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { isSafari } from '../browser'
import ministore from './ministore'

/** True on WebKit 27 or later, which can withhold a touch's touchend (#5660). Safari reports it only as `Version/27`, since its OS token is frozen at 18. The Capacitor app's WKWebView reports no `Version/`, so there init reads the iOS version instead, and until it answers this is false. */
const webKit27Store = ministore(isSafari() && Number(navigator.userAgent.match(/Version\/(\d+)/)?.[1] ?? 0) >= 27)

/** Reads the iOS version in the Capacitor app. An app built before the Device plugin was added has no way to tell, and stays false. */
export const init = async () => {
  if (Capacitor.getPlatform() !== 'ios' || !Capacitor.isPluginAvailable('Device')) return
  const { osVersion } = await Device.getInfo()
  webKit27Store.update(parseInt(osVersion) >= 27)
}

export default webKit27Store
