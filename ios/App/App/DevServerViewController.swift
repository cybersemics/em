import Capacitor
import Foundation
import WebKit
import WebviewBackground

/// Storyboard-referenced bridge view controller, included in both debug and release builds.
///
/// It supplies the app's web view: a `NativeHistoryWebView`, which routes iOS native undo/redo gestures
/// (three-finger swipe, shake-to-undo, and the Edit menu) to the web layer as a `nativeHistory` event
/// rather than letting them run against WebKit's own undo stack.
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

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(IOSKeyboardPlugin())
        #if DEBUG
        bridge?.registerPluginInstance(DevServerCertPlugin())
        #endif
    }
}

/// Reports native keyboard geometry with a calibrated iOS animation profile.
/// The notification's native timestamp anchors its age, so bridge latency does not restart the motion in JavaScript.
@objc(IOSKeyboardPlugin)
public class IOSKeyboardPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "IOSKeyboardPlugin"
    public let jsName = "IOSKeyboardPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise)
    ]

    private var observers: [NSObjectProtocol] = []
    private var transitionID = 0
    private var keyboardHeight: CGFloat = 0
    private var targetHeight: CGFloat = 0
    private var originHeight: CGFloat = 0
    private var startedAt: Double = 0
    // Measured from UIKit's keyboard layout-guide animation on iOS 26.5. This is a calibrated
    // profile, not an Apple API guarantee; revalidate it when supporting a changed system curve.
    private static let keyboardTiming: [String: Any] = [
        "durationMs": 383.3,
        "speed": 1,
        "spring": ["mass": 1.0, "stiffness": 555.0265, "damping": 47.118, "velocity": 0.0],
        "bezier": [0.0, 0.0, 1.0, 1.0]
    ]
    private var notificationDuration: Double = 0

    public override func load() {
        let center = NotificationCenter.default
        observers.append(center.addObserver(forName: UIResponder.keyboardWillChangeFrameNotification,
                                            object: nil, queue: .main) { [weak self] notification in
            self?.willChangeFrame(notification)
        })
        observers.append(center.addObserver(forName: UIResponder.keyboardDidChangeFrameNotification,
                                            object: nil, queue: .main) { [weak self] notification in
            self?.didChangeFrame(notification)
        })
    }

    deinit {
        observers.forEach(NotificationCenter.default.removeObserver)
    }

    /// Measures keyboard overlap in the web view's coordinates, excluding floating keyboards.
    private func height(for frame: CGRect) -> CGFloat {
        guard let webView = webView, let screen = webView.window?.screen else { return 0 }
        let rect = webView.convert(frame, from: screen.coordinateSpace)
        let overlap = webView.bounds.intersection(rect)
        return overlap.isNull || rect.maxY < webView.bounds.maxY ? 0 : overlap.height
    }

    /// Reports the actual keyboard endpoints and notification timestamp without a sampling view.
    private func willChangeFrame(_ notification: Notification) {
        guard let info = notification.userInfo,
              let fromFrame = info[UIResponder.keyboardFrameBeginUserInfoKey] as? CGRect,
              let toFrame = info[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return }
        transitionID += 1
        targetHeight = height(for: toFrame)
        originHeight = height(for: fromFrame)
        startedAt = Date().timeIntervalSince1970 * 1000
        notificationDuration = (info[UIResponder.keyboardAnimationDurationUserInfoKey] as? NSNumber)?.doubleValue ?? 0
        publishStart(Self.keyboardTiming)
    }

    /// Reports native endpoints and clock using the calibrated timing profile.
    private func publishStart(_ timing: [String: Any]) {
        var data = timing
        data["stage"] = "start"
        data["id"] = transitionID
        data["fromHeight"] = originHeight
        data["toHeight"] = targetHeight
        data["visible"] = targetHeight > 0
        data["startedAt"] = startedAt
        if notificationDuration == 0 { data["durationMs"] = 0 }
        notifyListeners("keyboardAnimation", data: data)
    }

    /// Commits the measured endpoint, including zero-duration transitions.
    private func didChangeFrame(_ notification: Notification) {
        guard let frame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return }
        keyboardHeight = height(for: frame)
        notifyListeners("keyboardAnimation", data: ["stage": "end", "id": transitionID, "toHeight": keyboardHeight])
    }

    /// Returns resting keyboard geometry when JavaScript initializes after an existing transition.
    @objc func getState(_ call: CAPPluginCall) {
        call.resolve(["height": keyboardHeight])
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
