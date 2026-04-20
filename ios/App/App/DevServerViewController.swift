import Capacitor
import WebKit

/// This storyboard-referenced view controller is included in both debug and
/// release builds.
///
/// In debug (development) builds, it customizes `CAPBridgeViewController` to
/// ignore the warnings that come with using a self-signed certificate for the
/// development server.
///
/// In release builds, the debug-only SSL handling is compiled out by `#if
/// DEBUG`, so production behavior remains strict.
class DevServerViewController: CAPBridgeViewController {

    #if DEBUG
    override func viewDidLoad() {
        super.viewDidLoad()

        /// Set the app's WKWebView's navigation delegate to self
        /// so we can handle SSL challenges.
        webView?.navigationDelegate = self
    }
    #endif
}

#if DEBUG
extension DevServerViewController: WKNavigationDelegate {
    func webView(
        _ webView: WKWebView,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        if let serverTrust = challenge.protectionSpace.serverTrust {
            /// Blindly trust the server's certificate.
            /// This is only for development and should never be used in production.
            completionHandler(.useCredential, URLCredential(trust: serverTrust))
        } else {
            /// For any other security challenges, use default handling.
            completionHandler(.performDefaultHandling, nil)
        }
    }
}
#endif
