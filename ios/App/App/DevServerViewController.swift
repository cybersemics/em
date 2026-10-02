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

/// Publishes the system keyboard layout guide's own animation once per transition.
/// The notification's native timestamp anchors its age, so bridge latency does not restart the motion in JavaScript.
@objc(IOSKeyboardPlugin)
public class IOSKeyboardPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "IOSKeyboardPlugin"
    public let jsName = "IOSKeyboardPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise)
    ]

    private var observers: [NSObjectProtocol] = []
    private let trackingView = UIView()
    private var displayLink: CADisplayLink?
    private var transitionID = 0
    private var keyboardHeight: CGFloat = 0
    private var targetHeight: CGFloat = 0
    private var originHeight: CGFloat = 0
    private var startedAt: Double = 0
    private var cachedTiming: [String: Any]?
    private var notificationDuration: Double = 0

    public override func load() {
        DispatchQueue.main.async { [weak self] in self?.attachTrackingView() }
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
        displayLink?.invalidate()
        trackingView.removeFromSuperview()
    }

    /// Pins a noninteractive, offscreen view to the public keyboard guide so UIKit owns its motion.
    private func attachTrackingView() {
        guard trackingView.superview == nil, let host = webView?.superview else { return }
        trackingView.isUserInteractionEnabled = false
        trackingView.translatesAutoresizingMaskIntoConstraints = false
        host.addSubview(trackingView)
        NSLayoutConstraint.activate([
            trackingView.leadingAnchor.constraint(equalTo: host.leadingAnchor, constant: -10),
            trackingView.widthAnchor.constraint(equalToConstant: 1),
            trackingView.heightAnchor.constraint(equalToConstant: 1),
            trackingView.bottomAnchor.constraint(equalTo: host.keyboardLayoutGuide.topAnchor)
        ])
        host.layoutIfNeeded()
    }

    /// Measures keyboard overlap in the web view's coordinates, excluding floating keyboards.
    private func height(for frame: CGRect) -> CGFloat {
        guard let webView = webView, let screen = webView.window?.screen else { return 0 }
        let rect = webView.convert(frame, from: screen.coordinateSpace)
        let overlap = webView.bounds.intersection(rect)
        return overlap.isNull || rect.maxY < webView.bounds.maxY ? 0 : overlap.height
    }

    /// Starts a short native sampling loop until UIKit commits the guide's animation.
    private func willChangeFrame(_ notification: Notification) {
        guard let info = notification.userInfo,
              let fromFrame = info[UIResponder.keyboardFrameBeginUserInfoKey] as? CGRect,
              let toFrame = info[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return }
        transitionID += 1
        targetHeight = height(for: toFrame)
        originHeight = height(for: fromFrame)
        startedAt = Date().timeIntervalSince1970 * 1000
        notificationDuration = (info[UIResponder.keyboardAnimationDurationUserInfoKey] as? NSNumber)?.doubleValue ?? 0
        // iOS uses one keyboard curve. After the first read, every transition can be reported immediately.
        if let timing = cachedTiming {
            publishStart(timing)
            return
        }
        attachTrackingView()
        displayLink?.invalidate()
        displayLink = CADisplayLink(target: self, selector: #selector(captureAnimation))
        displayLink?.add(to: .main, forMode: .common)
    }

    /// Captures the real spring or bezier as soon as UIKit commits the guide's animation, then stops sampling.
    @objc private func captureAnimation() {
        guard let animation = trackingView.layer.animation(forKey: "position") as? CABasicAnimation else { return }
        displayLink?.invalidate()
        displayLink = nil

        // The guide rests at the safe area when hidden, while the keyboard itself moves fully offscreen.
        // Its curve is shared with the keyboard, but geometry must come from the native keyboard frames.
        var data: [String: Any] = ["durationMs": animation.duration * 1000, "speed": animation.speed]
        if let spring = animation as? CASpringAnimation {
            data["spring"] = ["mass": spring.mass, "stiffness": spring.stiffness,
                              "damping": spring.damping, "velocity": spring.initialVelocity]
        }
        let timing = animation.timingFunction ?? CAMediaTimingFunction(name: .linear)
        var first: [Float] = [0, 0]
        var second: [Float] = [0, 0]
        timing.getControlPoint(at: 1, values: &first)
        timing.getControlPoint(at: 2, values: &second)
        data["bezier"] = [first[0], first[1], second[0], second[1]]
        cachedTiming = data
        publishStart(data)
        trackingView.removeFromSuperview()
    }

    /// Reports native endpoints and clock immediately once the matching system timing is known.
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

    /// Stops sampling and commits the measured endpoint, including zero-duration transitions.
    private func didChangeFrame(_ notification: Notification) {
        guard let frame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return }
        displayLink?.invalidate()
        displayLink = nil
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
