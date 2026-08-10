# webview-background

A small plugin to change the background of a webview.

## Install

```bash
npm install webview-background
npx cap sync
```

## API

<docgen-index>

* [`changeBackgroundColor(...)`](#changebackgroundcolor)
* [`addListener('nativeHistory', ...)`](#addlistenernativehistory-)
* [`removeAllListeners()`](#removealllisteners)
* [Interfaces](#interfaces)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

### changeBackgroundColor(...)

```typescript
changeBackgroundColor(options: { color: string; }) => Promise<void>
```

| Param         | Type                            |
| ------------- | ------------------------------- |
| **`options`** | <code>{ color: string; }</code> |

--------------------


### addListener('nativeHistory', ...)

```typescript
addListener(eventName: 'nativeHistory', listenerFunc: (event: NativeHistoryEvent) => void) => Promise<PluginListenerHandle>
```

Emitted when the user performs a native undo/redo gesture on iOS (three-finger swipe, shake-to-undo,
or the Edit menu). The webview's own undo is never run, so the app is free to apply its own.

| Param              | Type                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------- |
| **`eventName`**    | <code>'nativeHistory'</code>                                                          |
| **`listenerFunc`** | <code>(event: <a href="#nativehistoryevent">NativeHistoryEvent</a>) =&gt; void</code> |

**Returns:** <code>Promise&lt;<a href="#pluginlistenerhandle">PluginListenerHandle</a>&gt;</code>

--------------------


### removeAllListeners()

```typescript
removeAllListeners() => Promise<void>
```

Removes all listeners registered on this plugin.

--------------------


### Interfaces


#### PluginListenerHandle

| Prop         | Type                                      |
| ------------ | ----------------------------------------- |
| **`remove`** | <code>() =&gt; Promise&lt;void&gt;</code> |


#### NativeHistoryEvent

| Prop       | Type                          | Description                                 |
| ---------- | ----------------------------- | ------------------------------------------- |
| **`type`** | <code>'undo' \| 'redo'</code> | Which native history gesture was performed. |

</docgen-api>
