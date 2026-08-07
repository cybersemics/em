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
class DevServerViewController: CAPBridgeViewController, WKScriptMessageHandler {

    #if DEBUG
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(DevServerCertPlugin())
    }
    #endif

    // MARK: - Keyboard autoscroll control (issue #4526)
    //
    // On iOS Capacitor with `Keyboard: { resize: 'none' }`, WKWebView scrolls the focused
    // contenteditable toward the top of the viewport every time focus moves between thoughts —
    // iOS re-shows the keyboard on each cursor change, and its native "scroll the selection into
    // view" fires against the full-height viewport (it ignores contentInset for the selection
    // reveal). The result is a jarring autoscroll jump and a mobile toolbar that visibly hops.
    //
    // em manages its own scroll-into-view (preventAutoscroll + scrollCursorIntoView) and wants to
    // be the sole authority on scroll position while the keyboard is open. So:
    //
    //   1. For a short window after each keyboardWillShow we revert any *programmatic* scroll
    //      (never a user drag) back to a locked offset — this cancels the native jump and keeps
    //      the toolbar immobile.
    //   2. em performs its own scrolls through the `emScroll` script message instead of
    //      window.scrollTo (see src/device/scrollWindowTo.ts). The handler sets the locked offset
    //      to em's target and moves there, so em's scroll is adopted rather than reverted.
    //
    // User drags, deceleration, and touch tracking are never suppressed.

    /// The scroll offset the suppressor holds while active. Updated to em's target on each emScroll.
    private var lockedOffset: CGPoint = .zero
    /// Programmatic scrolls are reverted to lockedOffset until this time.
    private var suppressUntil: Date = .distantPast
    /// KVO token for the web view scroll view's contentOffset.
    private var scrollObservation: NSKeyValueObservation?
    /// Duration to hold the scroll position after the keyboard (re)appears.
    private let suppressionWindow: TimeInterval = 0.5

    /// Drives em's own smooth scroll animation frame-by-frame (see animateScroll).
    private var scrollLink: CADisplayLink?
    private var scrollFrom: CGFloat = 0
    private var scrollTarget: CGFloat = 0
    private var scrollStartTime: CFTimeInterval = 0
    /// Duration of the current em scroll animation, derived from the scroll distance so the perceived
    /// speed is consistent (a long scroll glides rather than snapping).
    private var scrollDuration: CFTimeInterval = 0.25

    override func viewDidLoad() {
        super.viewDidLoad()
        guard let scrollView = self.webView?.scrollView else { return }

        self.webView?.configuration.userContentController.add(self, name: "emScroll")

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(onKeyboardWillShow),
            name: UIResponder.keyboardWillShowNotification,
            object: nil
        )

        scrollObservation = scrollView.observe(\.contentOffset, options: [.new]) { [weak self] sv, _ in
            guard let self = self else { return }
            // Only revert programmatic scrolls inside the suppression window.
            // Never fight a user-initiated scroll (drag / deceleration / tracking).
            guard Date() < self.suppressUntil,
                  !sv.isDragging, !sv.isDecelerating, !sv.isTracking else { return }
            if sv.contentOffset != self.lockedOffset {
                sv.setContentOffset(self.lockedOffset, animated: false)
            }
        }
    }

    @objc private func onKeyboardWillShow(_ notification: Notification) {
        guard let scrollView = self.webView?.scrollView else { return }
        // Anchor to the position at the moment the keyboard (re)appears, and start the window.
        // Do not clobber an in-flight em animation's target.
        if scrollLink == nil {
            lockedOffset = scrollView.contentOffset
        }
        suppressUntil = Date().addingTimeInterval(suppressionWindow)
    }

    /// Handles `emScroll` messages: em's own scroll requests. Adopt the target as the locked offset
    /// and animate there smoothly, so the suppression above holds em's position (rather than the
    /// pre-keyboard one) while em's own animation is never reverted.
    public func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == "emScroll", let scrollView = self.webView?.scrollView else { return }

        let top: CGFloat
        if let dict = message.body as? [String: Any], let value = dict["top"] as? Double {
            top = CGFloat(value)
        } else if let value = message.body as? Double {
            top = CGFloat(value)
        } else {
            return
        }

        // Convert the document scroll position (window.scrollY) to a content offset.
        // adjustedContentInset.top is 0 when contentInsetAdjustmentBehavior is .never (Capacitor's
        // default), so this is usually just `top`, but subtracting it keeps us correct otherwise.
        animateScroll(to: top - scrollView.adjustedContentInset.top)
    }

    /// Smoothly animates the scroll view to the target y, updating lockedOffset every frame so the
    /// contentOffset KVO never reverts em's own animation (only genuine native autoscroll jumps).
    private func animateScroll(to targetY: CGFloat) {
        guard let scrollView = self.webView?.scrollView else { return }
        scrollLink?.invalidate()
        scrollFrom = scrollView.contentOffset.y
        scrollTarget = targetY

        // Tiny moves: snap without animating.
        if abs(scrollTarget - scrollFrom) < 1 {
            let offset = CGPoint(x: scrollView.contentOffset.x, y: targetY)
            lockedOffset = offset
            if scrollView.contentOffset != offset {
                scrollView.setContentOffset(offset, animated: false)
            }
            scrollLink = nil
            return
        }

        scrollStartTime = CACurrentMediaTime()
        // Scale duration with distance (~1100 pt/s) so short and long scrolls feel like the same
        // glide, clamped so it is never a snap nor a crawl.
        let distance = abs(scrollTarget - scrollFrom)
        scrollDuration = min(0.5, max(0.18, Double(distance) / 1100))
        let link = CADisplayLink(target: self, selector: #selector(stepScroll))
        link.add(to: .main, forMode: .common)
        scrollLink = link
    }

    @objc private func stepScroll(_ link: CADisplayLink) {
        guard let scrollView = self.webView?.scrollView else {
            link.invalidate()
            scrollLink = nil
            return
        }
        let t = min(1, (CACurrentMediaTime() - scrollStartTime) / scrollDuration)
        // ease-out cubic
        let eased = 1 - pow(1 - CGFloat(t), 3)
        let y = scrollFrom + (scrollTarget - scrollFrom) * eased
        let offset = CGPoint(x: scrollView.contentOffset.x, y: y)
        lockedOffset = offset
        scrollView.setContentOffset(offset, animated: false)
        if t >= 1 {
            link.invalidate()
            scrollLink = nil
            lockedOffset = CGPoint(x: scrollView.contentOffset.x, y: scrollTarget)
        }
    }

    deinit {
        scrollLink?.invalidate()
        scrollObservation?.invalidate()
        NotificationCenter.default.removeObserver(self)
        self.webView?.configuration.userContentController.removeScriptMessageHandler(forName: "emScroll")
    }
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
