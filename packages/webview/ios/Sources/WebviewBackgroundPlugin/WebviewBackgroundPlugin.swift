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

    @objc func changeBackgroundColor(_ call: CAPPluginCall) {
        let color = call.getString("color") ?? ""

        DispatchQueue.main.async {
            self.webView?.backgroundColor = UIColor(named: color)
            self.webView?.scrollView.backgroundColor = UIColor(named: color)
        }
    }
}
