import BrowserEngineKit
import Foundation
import Capacitor

/**
 * Please read the Capacitor iOS Plugin Development Guide
 * here: https://capacitorjs.com/docs/plugins/ios
 */
@objc(WebviewBackgroundPlugin)
public class WebviewBackgroundPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WebviewBackgroundPlugin"
    public let jsName = "WebviewBackground"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "changeBackgroundColor", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setHistoryAvailability", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentEditMenu", returnType: CAPPluginReturnPromise)
    ]

    /// Forwards native undo/redo gestures to the web layer as a `nativeHistory` event.
    ///
    /// Requires the bridge view controller to supply a `NativeHistoryWebView`; with any other web view the
    /// gesture stays with WebKit and no event is emitted. See `NativeHistoryUndoManager`.
    @objc override public func load() {
        (webView as? NativeHistoryWebView)?.onNativeHistory = { [weak self] type in
            self?.notifyListeners("nativeHistory", data: ["type": type.rawValue])
        }
    }

    @objc func changeBackgroundColor(_ call: CAPPluginCall) {
        let color = call.getString("color") ?? ""

        DispatchQueue.main.async {
            self.webView?.backgroundColor = UIColor(named: color)
            self.webView?.scrollView.backgroundColor = UIColor(named: color)
        }
    }

    /// Reports whether the app has an action to undo or redo, which determines whether iOS offers the
    /// native history gesture. Without it the undo manager would have to claim an availability it cannot
    /// honor, and iOS would confirm an undo or redo that does nothing. See `NativeHistoryUndoManager`.
    @objc func setHistoryAvailability(_ call: CAPPluginCall) {
        let canUndo = call.getBool("canUndo") ?? false
        let canRedo = call.getBool("canRedo") ?? false

        DispatchQueue.main.async {
            (self.webView as? NativeHistoryWebView)?.setHistoryAvailability(canUndo: canUndo, canRedo: canRedo)
            call.resolve()
        }
    }

    /// Presents WebKit's own edit menu (Cut, Copy, Paste, …) for the current text selection.
    ///
    /// WebKit dismisses the menu whenever the rendered rects of the selection change, and nothing in the web
    /// layer can present it again, so em calls this after an edit of its own moves the selected text, such as
    /// a letter case change (#5641). The menu is owned by the `BETextInteraction` that WebKit attaches to its
    /// content view; asking it to present keeps WebKit's own items and placement. `UIEditMenuInteraction`'s
    /// `presentEditMenu` shows nothing for a web view, and `UIMenuController` shows a different set of items.
    ///
    /// The content view is found by class name because WebKit does not expose it. If WebKit stops attaching a
    /// `BETextInteraction` to it, or on iOS before 17.4, this does nothing.
    @objc func presentEditMenu(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if #available(iOS 17.4, *),
               let contentView = self.webView?.scrollView.subviews.first(where: {
                   String(describing: type(of: $0)).hasPrefix("WKContentView")
               }),
               let textInteraction = contentView.interactions.compactMap({ $0 as? BETextInteraction }).first {
                textInteraction.presentEditMenuForSelection()
            }
            call.resolve()
        }
    }
}
