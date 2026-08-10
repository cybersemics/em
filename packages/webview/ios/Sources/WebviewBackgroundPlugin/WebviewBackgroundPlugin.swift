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
        CAPPluginMethod(name: "changeBackgroundColor", returnType: CAPPluginReturnPromise)
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
}
