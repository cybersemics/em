import Capacitor
import Foundation
import WebKit

/// Storyboard-referenced bridge view controller, included in both debug and release builds.
///
/// In debug (development) builds it registers `DevServerCertPlugin`, which trusts the
/// development server's self-signed certificate. Registration happens in
/// `capacitorDidLoad()` — which Capacitor calls from `loadView()`, *before* the web view
/// loads the server URL in `viewDidLoad()` — so the plugin is in place for the very first
/// TLS challenge.
///
/// In release builds the debug-only code is compiled out by `#if DEBUG`, so production
/// certificate handling remains strict (the dev server is never used in release).
class DevServerViewController: CAPBridgeViewController {

    #if DEBUG
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(DevServerCertPlugin())
    }
    #endif
}

#if DEBUG
/// Accepts the development server's self-signed certificate.
///
/// Capacitor's `WebViewDelegationHandler` does not trust self-signed certs by default —
/// it routes each WKWebView auth challenge to every registered plugin via
/// `handleWKWebViewURLAuthenticationChallenge`, and rejects the challenge if no plugin
/// handles it. This plugin handles server-trust challenges by trusting the certificate.
///
/// DEV ONLY — never compiled into release builds. Do not generalize this to production.
@objc(DevServerCertPlugin)
public class DevServerCertPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DevServerCertPlugin"
    public let jsName = "DevServerCert"
    public let pluginMethods: [CAPPluginMethod] = []

    public override func handleWKWebViewURLAuthenticationChallenge(
        _ challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) -> Bool {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let serverTrust = challenge.protectionSpace.serverTrust else {
            // Not a server-trust challenge — let other handlers / default behavior apply.
            return false
        }
        completionHandler(.useCredential, URLCredential(trust: serverTrust))
        return true
    }
}
#endif
