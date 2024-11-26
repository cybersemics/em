import { WebPlugin } from '@capacitor/core';
import type { WebviewBackgroundPlugin } from './definitions';
export declare class WebviewBackgroundWeb extends WebPlugin implements WebviewBackgroundPlugin {
    changeBackgroundColor(options: {
        color: string;
    }): Promise<void>;
}
