import { WebPlugin } from '@capacitor/core';
export class WebviewBackgroundWeb extends WebPlugin {
    // async echo(options: { value: string }): Promise<{ value: string }> {
    //   console.log('ECHO', options);
    //   return options;
    // }
    async changeBackgroundColor(options) {
        console.log('Color changed: ', options.color);
    }
}
//# sourceMappingURL=web.js.map