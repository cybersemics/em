import Capacitor
import Foundation
import UIKit
import WebKit
import WebviewBackground

/// Storyboard-referenced bridge view controller, included in both debug and release builds.
///
/// It supplies the app's web view: a `NativeHistoryWebView`, which routes iOS native undo/redo gestures
/// (three-finger swipe, shake-to-undo, and the Edit menu) to the web layer as a `nativeHistory` event
/// rather than letting them run against WebKit's own undo stack. On iOS 27 it also disables the web view's
/// double-tap recognizers, which otherwise leave later touches without `touchmove` (#6104).
///
/// In debug (development) builds it also registers `DevServerCertPlugin`, which trusts the
/// development server's self-signed certificate. Registration happens in
/// `capacitorDidLoad()` — which Capacitor calls from `loadView()`, *before* the web view
/// loads the server URL in `viewDidLoad()` — so the plugin is in place for the very first
/// TLS challenge.
///
/// In release builds the debug-only code is compiled out by `#if DEBUG`, so production
/// certificate handling remains strict (the dev server is never used in release).
class DevServerViewController: CAPBridgeViewController {

    override func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
        return NativeHistoryWebView(frame: frame, configuration: configuration)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        disableDoubleTapRecognizers()
        // Text interaction installs its recognizers on the content view when editing begins, after the web view
        // has loaded, so they are disabled again whenever the keyboard comes up.
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillShow),
            name: UIResponder.keyboardWillShowNotification,
            object: nil
        )
    }

    @objc private func keyboardWillShow() {
        disableDoubleTapRecognizers()
    }

    /// Disables WebKit's one-finger double-tap recognizers on iOS 27.
    ///
    /// On iOS 27 a double tap on the caret of a focused editable leaves WebKit withholding `touchmove`, `touchend`
    /// and `pointerup` from later touches on or near the thought until the app is quit, so no gesture can be
    /// recognized there (#6104, #5660, WebKit bug 322561). Calling `preventDefault` on the double tap's touches
    /// does not stop it, since the double tap is recognized natively, before the page sees it. Double tapping a
    /// word no longer selects it, while a long press and the selection handles still do.
    private func disableDoubleTapRecognizers() {
        guard #available(iOS 27, *) else { return }
        guard let scrollView = webView?.scrollView else { return }
        for view in [scrollView] + scrollView.subviews {
            for case let tap as UITapGestureRecognizer in view.gestureRecognizers ?? []
            where tap.numberOfTapsRequired == 2 && tap.numberOfTouchesRequired == 1 {
                tap.isEnabled = false
            }
        }
    }

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
