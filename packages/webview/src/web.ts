import { WebPlugin } from '@capacitor/core';

import type { WebviewBackgroundPlugin } from './definitions';

export class WebviewBackgroundWeb extends WebPlugin implements WebviewBackgroundPlugin {

  async changeBackgroundColor(options: { color: string }): Promise<void>{}
  
}
