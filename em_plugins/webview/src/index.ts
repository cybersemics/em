import { registerPlugin } from '@capacitor/core';

import type { WebviewBackgroundPlugin } from './definitions';

const WebviewBackground = registerPlugin<WebviewBackgroundPlugin>('WebviewBackground', {
  web: () => import('./web').then((m) => new m.WebviewBackgroundWeb()),
});

export * from './definitions';
export { WebviewBackground };
