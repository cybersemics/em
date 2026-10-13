package com.emtheapp.em;

import android.animation.ValueAnimator;
import android.os.Build;
import android.provider.Settings;
import android.view.Choreographer;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.WindowInsets;
import android.view.WindowInsetsAnimation;
import android.view.animation.Interpolator;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.IdentityHashMap;
import java.util.List;
import org.json.JSONArray;

/** Supplies Android keyboard animation metadata; JavaScript reconstructs intermediate positions locally. */
@CapacitorPlugin(name = "AndroidKeyboardPlugin")
public class AndroidKeyboardPlugin extends Plugin {
    private final IdentityHashMap<WindowInsetsAnimation, Motion> motions = new IdentityHashMap<>();
    private View decorView;
    private float density;
    private int nextId;
    private int lastHeight;
    private WindowInsetsAnimation current;
    private long frameTimeNs = -1;
    private boolean observingFrames;

    private static class Motion {
        int id;
        int from;
        int to;
        long duration;
        boolean anchored;
    }

    private final Choreographer.FrameCallback frameCallback = new Choreographer.FrameCallback() {
        @Override public void doFrame(long timeNs) {
            frameTimeNs = timeNs;
            if (observingFrames) Choreographer.getInstance().postFrameCallback(this);
        }
    };

    private final ViewTreeObserver.OnWindowFocusChangeListener focusListener = focused -> {
        if (focused) decorView.post(this::installCallback);
    };

    private final ViewTreeObserver.OnGlobalLayoutListener layoutListener = () -> {
        if (current != null) return;
        int height = measuredHeight();
        if (height == lastHeight) return;
        lastHeight = height;
        JSObject event = new JSObject();
        event.put("id", ++nextId);
        event.put("stage", "snapshot");
        event.put("toHeight", height / density);
        notifyListeners("keyboardAnimation", event);
    };

    /** Returns the monotonic clock used by Android's animation frame timestamps. */
    @PluginMethod
    public void getClock(PluginCall call) {
        JSObject result = new JSObject();
        result.put("nativeMs", System.nanoTime() / 1e6);
        call.resolve(result);
    }

    /** Supplies initial geometry without requiring a new show/hide animation. */
    @PluginMethod
    public void getState(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            JSObject result = new JSObject();
            result.put("height", (current == null ? measuredHeight() : lastHeight) / density);
            call.resolve(result);
        });
    }

    @Override
    public void load() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return;
        decorView = getActivity().getWindow().getDecorView();
        density = getContext().getResources().getDisplayMetrics().density;
        lastHeight = measuredHeight();
        decorView.getViewTreeObserver().addOnWindowFocusChangeListener(focusListener);
        decorView.getViewTreeObserver().addOnGlobalLayoutListener(layoutListener);
        if (decorView.hasWindowFocus()) decorView.post(this::installCallback);
    }

    /** Measures the full IME inset, including navigation, independently of the consumed WebView insets. */
    private int measuredHeight() {
        return getActivity().getWindowManager().getCurrentWindowMetrics()
            .getWindowInsets().getInsets(WindowInsets.Type.ime()).bottom;
    }

    /** Creates the common event envelope; no per-frame positions are sent over the bridge. */
    private JSObject event(String stage, Motion motion) {
        JSObject event = new JSObject();
        event.put("id", motion.id);
        event.put("stage", stage);
        event.put("fromHeight", motion.from / density);
        event.put("toHeight", motion.to / density);
        event.put("durationMs", motion.duration);
        return event;
    }

    /** Observes the native animation after Capacitor has installed its own decor callback. */
    private void installCallback() {
        decorView.setWindowInsetsAnimationCallback(new WindowInsetsAnimation.Callback(
            WindowInsetsAnimation.Callback.DISPATCH_MODE_CONTINUE_ON_SUBTREE) {
            @Override
            public void onPrepare(WindowInsetsAnimation animation) {
                if ((animation.getTypeMask() & WindowInsets.Type.ime()) == 0) return;
                current = animation;
                Motion motion = new Motion();
                motion.id = ++nextId;
                motions.put(animation, motion);
                if (!observingFrames) {
                    observingFrames = true;
                    Choreographer.getInstance().postFrameCallback(frameCallback);
                }
            }

            @Override
            public WindowInsetsAnimation.Bounds onStart(WindowInsetsAnimation animation, WindowInsetsAnimation.Bounds bounds) {
                Motion motion = motions.get(animation);
                if (motion == null) return bounds;
                motion.from = lastHeight;
                motion.to = measuredHeight();
                float scale = Build.VERSION.SDK_INT >= 33 ? ValueAnimator.getDurationScale()
                    : Settings.Global.getFloat(getContext().getContentResolver(), "animator_duration_scale", 1);
                // ValueAnimator truncates the scaled duration to integer milliseconds.
                motion.duration = Math.max(0, (long) (animation.getDurationMillis() * scale));
                JSObject start = event("start", motion);
                JSONArray curve = new JSONArray();
                Interpolator interpolator = animation.getInterpolator();
                for (int i = 0; i <= 256; i++) {
                    curve.put(Float.valueOf(interpolator == null ? i / 256f : interpolator.getInterpolation(i / 256f)));
                }
                start.put("curve", curve);
                notifyListeners("keyboardAnimation", start);
                return bounds;
            }

            @Override
            public WindowInsets onProgress(WindowInsets insets, List<WindowInsetsAnimation> animations) {
                Motion motion = motions.get(current);
                if (motion == null || !animations.contains(current)) return insets;
                int target = measuredHeight();
                if (motion.to > 0 && target > 0 && target != motion.to) {
                    motion.to = target;
                    // An actual keyboard layout change is distinct from its animated position.
                    notifyListeners("keyboardAnimation", event("geometry", motion));
                }
                float fraction = current.getFraction();
                if (!motion.anchored && fraction > 0 && fraction < 1 && motion.duration > 0 && frameTimeNs >= 0) {
                    motion.anchored = true;
                    JSObject anchor = event("anchor", motion);
                    // Callback arrival time is variable. The system frame clock and fraction recover
                    // the animation's original epoch, which JS can use even if delivery is delayed.
                    anchor.put("epochMs", frameTimeNs / 1000000L - (double) fraction * motion.duration);
                    notifyListeners("keyboardAnimation", anchor);
                }
                // Internal bookkeeping supports interruption; this value is not streamed to JS.
                lastHeight = Math.round(motion.from + current.getInterpolatedFraction() * (motion.to - motion.from));
                return insets;
            }

            @Override
            public void onEnd(WindowInsetsAnimation animation) {
                Motion motion = motions.remove(animation);
                if (motion == null) return;
                if (animation == current) {
                    current = null;
                    lastHeight = measuredHeight();
                    motion.to = lastHeight;
                }
                notifyListeners("keyboardAnimation", event("end", motion));
                if (motions.isEmpty()) {
                    observingFrames = false;
                    Choreographer.getInstance().removeFrameCallback(frameCallback);
                }
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        observingFrames = false;
        if (decorView == null) return;
        getActivity().runOnUiThread(() -> {
            Choreographer.getInstance().removeFrameCallback(frameCallback);
            decorView.getViewTreeObserver().removeOnWindowFocusChangeListener(focusListener);
            decorView.getViewTreeObserver().removeOnGlobalLayoutListener(layoutListener);
            decorView.setWindowInsetsAnimationCallback(null);
            motions.clear();
            current = null;
        });
    }
}
