import { WebPlugin } from '@capacitor/core'

import type { WebviewBackgroundPlugin } from './definitions'

/** The web implementation of the webview-background plugin. */
export default class WebviewBackgroundWeb extends WebPlugin implements WebviewBackgroundPlugin {

  async changeBackgroundColor(_options: { color: string }): Promise<void>{}

  /** Leaves scrolling to the browser, which has no native UIScrollView to cancel. */
  async stopScrollMomentum(): Promise<void>{}

  async setHistoryAvailability(_options: { canUndo: boolean; canRedo: boolean }): Promise<void>{}
  
}
