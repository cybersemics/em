import { registerPlugin } from '@capacitor/core';
const WebviewBackground = registerPlugin('WebviewBackground', {
    web: () => import('./web').then((m) => new m.WebviewBackgroundWeb()),
});
export * from './definitions';
export { WebviewBackground };
//# sourceMappingURL=index.js.map