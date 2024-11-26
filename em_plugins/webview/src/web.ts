import { WebPlugin } from '@capacitor/core';

import type { WebviewBackgroundPlugin } from './definitions';

export class WebviewBackgroundWeb extends WebPlugin implements WebviewBackgroundPlugin {
  // async echo(options: { value: string }): Promise<{ value: string }> {
  //   console.log('ECHO', options);
  //   return options;
  // }
  async changeBackgroundColor(options: { color: string }): Promise<void>{
    console.log('Color changed: ', options.color)
  }
  
}
