import UIKit
import Capacitor

/// Scene delegate for the app's single window scene.
///
/// UIKit requires apps built against the iOS 27 SDK to adopt the UIScene lifecycle, and traps at
/// launch if they do not. The scene configuration in `Info.plist` names `Main.storyboard`, so UIKit
/// creates the window and installs `DevServerViewController` as its root before `willConnectTo` is
/// called. This delegate must not replace that window: Capacitor's template creates a plain
/// `CAPBridgeViewController` here, which would drop the custom web view and the dev server
/// certificate plugin.
///
/// The URL and user activity callbacks are forwarded to `SceneDelegateProxy` so the App plugin
/// still receives deep links and Universal Links, which arrive here rather than at the
/// `AppDelegate` once a scene is in use.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
