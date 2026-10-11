import Capacitor
import UIKit

/// Measures UIKit's keyboard animation on demand for recalibrating the TypeScript profile.
/// Registration alone installs no observers, tracking views, or sampling loop.
@objc(IOSKeyboardPlugin)
public class IOSKeyboardPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "IOSKeyboardPlugin"
    public let jsName = "IOSKeyboardPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "measure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelMeasurement", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?
    private var observer: NSObjectProtocol?
    private var trackingView: UIView?
    private var displayLink: CADisplayLink?
    private var timeout: DispatchWorkItem?

    /// Arms a single measurement of the next keyboard transition, with a bounded wait.
    @objc func measure(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard self.pendingCall == nil else {
                call.reject("A keyboard measurement is already pending.")
                return
            }
            guard let host = self.webView?.superview else {
                call.reject("The web view is not attached.")
                return
            }
            self.pendingCall = call

            // UIKit animates this offscreen view through the public keyboard layout guide.
            // Its curve is shared with the keyboard, although its resting geometry differs.
            let view = UIView()
            view.isUserInteractionEnabled = false
            view.translatesAutoresizingMaskIntoConstraints = false
            host.addSubview(view)
            NSLayoutConstraint.activate([
                view.leadingAnchor.constraint(equalTo: host.leadingAnchor, constant: -10),
                view.widthAnchor.constraint(equalToConstant: 1),
                view.heightAnchor.constraint(equalToConstant: 1),
                view.bottomAnchor.constraint(equalTo: host.keyboardLayoutGuide.topAnchor)
            ])
            host.layoutIfNeeded()
            self.trackingView = view
            self.observer = NotificationCenter.default.addObserver(
                forName: UIResponder.keyboardWillChangeFrameNotification, object: nil, queue: .main
            ) { [weak self] notification in
                self?.willChangeFrame(notification)
            }
            self.scheduleTimeout(seconds: 30)
        }
    }

    /// Stops a pending diagnostic and releases every resource it installed.
    @objc func cancelMeasurement(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.pendingCall?.reject("Keyboard measurement cancelled.")
            self?.stopMeasurement()
            call.resolve()
        }
    }

    /// Starts sampling after a keyboard notification, once UIKit can commit its animation.
    private func willChangeFrame(_ notification: Notification) {
        guard displayLink == nil else { return }
        let duration = (notification.userInfo?[UIResponder.keyboardAnimationDurationUserInfoKey] as? NSNumber)?.doubleValue ?? 0
        guard duration > 0 else {
            pendingCall?.reject("The keyboard transition has no animation. Try an animated show or hide.")
            stopMeasurement()
            return
        }
        displayLink = CADisplayLink(target: self, selector: #selector(captureAnimation))
        displayLink?.add(to: .main, forMode: .common)
        // A changed OS may no longer expose the guide animation. Never keep sampling indefinitely.
        scheduleTimeout(seconds: max(1, duration * 2))
    }

    /// Captures the actual spring and Bezier parameters, then returns to the inert state.
    @objc private func captureAnimation() {
        guard let animation = trackingView?.layer.animation(forKey: "position") as? CABasicAnimation else { return }
        var timing: [String: Any] = ["durationMs": animation.duration * 1000, "speed": animation.speed]
        if let spring = animation as? CASpringAnimation {
            timing["spring"] = ["mass": spring.mass, "stiffness": spring.stiffness,
                                "damping": spring.damping, "velocity": spring.initialVelocity]
        }
        // A nil timing function means Core Animation's default linear timing. Preserve
        // its absence instead of reporting fabricated control points as a measurement.
        if let curve = animation.timingFunction {
            var first: [Float] = [0, 0]
            var second: [Float] = [0, 0]
            curve.getControlPoint(at: 1, values: &first)
            curve.getControlPoint(at: 2, values: &second)
            timing["bezier"] = [first[0], first[1], second[0], second[1]]
        }
        pendingCall?.resolve(timing)
        stopMeasurement()
    }

    /// Bounds both the wait for user input and the sampling of an unavailable system curve.
    private func scheduleTimeout(seconds: Double) {
        timeout?.cancel()
        let work = DispatchWorkItem { [weak self] in
            self?.pendingCall?.reject("No keyboard animation captured before the measurement timed out.")
            self?.stopMeasurement()
        }
        timeout = work
        DispatchQueue.main.asyncAfter(deadline: .now() + seconds, execute: work)
    }

    /// Removes diagnostic resources after success, failure, or cancellation.
    private func stopMeasurement() {
        timeout?.cancel()
        timeout = nil
        displayLink?.invalidate()
        displayLink = nil
        if let observer = observer { NotificationCenter.default.removeObserver(observer) }
        observer = nil
        trackingView?.removeFromSuperview()
        trackingView = nil
        pendingCall = nil
    }

    deinit {
        timeout?.cancel()
        if let observer = observer { NotificationCenter.default.removeObserver(observer) }
        displayLink?.invalidate()
        trackingView?.removeFromSuperview()
    }
}
