import { WebPlugin } from '@capacitor/core';
export class WebviewBackgroundWeb extends WebPlugin {
    async changeBackgroundColor(options) {
        console.log('Color changed: ', options.color);
    }
}