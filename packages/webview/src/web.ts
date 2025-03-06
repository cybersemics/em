import { WebPlugin } from '@capacitor/core'

import type { WebviewBackgroundPlugin } from './definitions'

/** The web implementation of the webview-background plugin. */
export default class WebviewBackgroundWeb extends WebPlugin implements WebviewBackgroundPlugin {

  async changeBackgroundColor(_options: { color: string }): Promise<void>{}
  
}
