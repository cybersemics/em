import Foundation
import UIKit
import WebKit

/// A native undo or redo gesture.
public enum NativeHistoryType: String {
    case undo
    case redo
}

/// An undo manager that reports the app's own undo and redo availability and forwards the gesture to a
/// handler rather than performing it.
///
/// iOS drives its history gestures — three-finger swipe, shake-to-undo, and the Edit menu — from the undo
/// manager found on the first responder's responder chain. (There is no `undo:` action to intercept:
/// `UIResponderStandardEditActions` declares `cut:`, `copy:`, `paste:`, `select:`, `delete:` and friends,
/// but no undo or redo.) Inside a web view that manager is WebKit's own — a plain `NSUndoManager` holding
/// only the edit commands WebKit itself performed.
///
/// em applies most edits by re-rendering the contenteditable from Redux rather than through the editor, so
/// WebKit's stack runs dry long before em's history does. Once it is empty the gesture reports "Nothing to
/// Undo" and never reaches the web layer at all, so the `beforeinput` handler that routes native undo
/// through em's own undo cannot see it. Taking over the responder chain's manager decouples the gesture
/// from WebKit's stack, keeping it reachable for as long as em can act on it. WebKit itself uses this shape
/// for text fields that synthesize key events: `WKNSKeyEventSimulatorUndoManager` likewise forwards rather
/// than performing.
///
/// `canUndo` and `canRedo` are supplied by em through `setHistoryAvailability` rather than answered here.
/// iOS reads them to decide both whether to deliver the gesture and which confirmation to display, so a
/// manager that claims availability it cannot honor makes iOS report "Undo"/"Redo" for a gesture that does
/// nothing. They start out unavailable, matching em's empty history at launch.
public final class NativeHistoryUndoManager: UndoManager {
    private let onNativeHistory: (NativeHistoryType) -> Void

    /// Whether em has an action to undo. Set by `setHistoryAvailability`.
    public var isUndoAvailable = false

    /// Whether em has an action to redo. Set by `setHistoryAvailability`.
    public var isRedoAvailable = false

    public init(onNativeHistory: @escaping (NativeHistoryType) -> Void) {
        self.onNativeHistory = onNativeHistory
        super.init()
    }

    override public var canUndo: Bool {
        return isUndoAvailable
    }

    override public var canRedo: Bool {
        return isRedoAvailable
    }

    override public func undo() {
        onNativeHistory(.undo)
    }

    override public func redo() {
        onNativeHistory(.redo)
    }
}

/// A web view that hands the responder chain a `NativeHistoryUndoManager`, so that native history gestures
/// are reported to the app instead of being applied to the web view's own undo stack.
///
/// Only the responder chain is redirected. WebKit registers its edit commands directly on its own undo
/// manager (`-[WKContentView undoManagerForWebView]`) rather than through the responder chain, so its
/// internal bookkeeping is unaffected.
///
/// It also dismisses the native edit menu when the keyboard hides. On iOS 27 the menu WebKit presents for a
/// caret (Paste | Select | Select All) survives the editable losing focus, so a tap outside the thought
/// closes the keyboard and removes the caret but leaves the menu on screen (cybersemics/em#6180). The menu is
/// native UI outside the DOM, so the web layer cannot reach it.
public final class NativeHistoryWebView: WKWebView {
    /// Called when the user performs a native undo or redo gesture.
    public var onNativeHistory: ((NativeHistoryType) -> Void)?

    private lazy var nativeHistoryUndoManager = NativeHistoryUndoManager { [weak self] type in
        self?.onNativeHistory?(type)
    }

    private var keyboardWillHideObserver: NSObjectProtocol?

    override public init(frame: CGRect, configuration: WKWebViewConfiguration) {
        super.init(frame: frame, configuration: configuration)
        observeKeyboardWillHide()
    }

    public required init?(coder: NSCoder) {
        super.init(coder: coder)
        observeKeyboardWillHide()
    }

    deinit {
        if let observer = keyboardWillHideObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    private func observeKeyboardWillHide() {
        keyboardWillHideObserver = NotificationCenter.default.addObserver(
            forName: UIResponder.keyboardWillHideNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.dismissEditMenu()
        }
    }

    /// Dismisses any edit menu presented by the web view's content. iOS 16+ presents it through a
    /// `UIEditMenuInteraction` on WebKit's content view, which is private, so search the view tree for it.
    private func dismissEditMenu() {
        if #available(iOS 16.0, *) {
            var views: [UIView] = [self]
            while let view = views.popLast() {
                for case let interaction as UIEditMenuInteraction in view.interactions {
                    interaction.dismissMenu()
                }
                views.append(contentsOf: view.subviews)
            }
        } else {
            UIMenuController.shared.hideMenu()
        }
    }

    override public var undoManager: UndoManager? {
        return nativeHistoryUndoManager
    }

    /// Reports whether the app currently has an action to undo or redo, determining whether iOS offers the
    /// gesture at all. Must be called on the main thread, as iOS reads it while handling the gesture.
    public func setHistoryAvailability(canUndo: Bool, canRedo: Bool) {
        nativeHistoryUndoManager.isUndoAvailable = canUndo
        nativeHistoryUndoManager.isRedoAvailable = canRedo
    }
}
