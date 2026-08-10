import Foundation
import WebKit

/// A native undo or redo gesture.
public enum NativeHistoryType: String {
    case undo
    case redo
}

/// An undo manager that reports undo and redo as always available and forwards the gesture to a handler
/// rather than performing it.
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
/// through em's own undo cannot see it.
///
/// Reporting `canUndo` and `canRedo` unconditionally keeps the gesture live for the lifetime of the app and
/// leaves it to em to decide whether there is anything to undo. WebKit itself uses this same shape for text
/// fields that synthesize key events: `WKNSKeyEventSimulatorUndoManager` also reports both as always
/// available and forwards rather than performing.
public final class NativeHistoryUndoManager: UndoManager {
    private let onNativeHistory: (NativeHistoryType) -> Void

    public init(onNativeHistory: @escaping (NativeHistoryType) -> Void) {
        self.onNativeHistory = onNativeHistory
        super.init()
    }

    override public var canUndo: Bool {
        return true
    }

    override public var canRedo: Bool {
        return true
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
public final class NativeHistoryWebView: WKWebView {
    /// Called when the user performs a native undo or redo gesture.
    public var onNativeHistory: ((NativeHistoryType) -> Void)?

    private lazy var nativeHistoryUndoManager = NativeHistoryUndoManager { [weak self] type in
        self?.onNativeHistory?(type)
    }

    override public var undoManager: UndoManager? {
        return nativeHistoryUndoManager
    }
}
