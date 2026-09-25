package com.emtheapp.em;

import android.os.Build;
import android.animation.ValueAnimator;
import android.provider.Settings;
import android.view.Choreographer;
import android.view.animation.Interpolator;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import java.util.IdentityHashMap;
import org.json.JSONArray;
import android.os.SystemClock;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsAnimation;
import android.view.WindowMetrics;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.List;

/** Reports the IME animation's live fraction against the independent WindowMetrics keyboard height. */
@CapacitorPlugin(name = "VirtualKeyboardTracker")
public class VirtualKeyboardTracker extends Plugin {
    private final IdentityHashMap<WindowInsetsAnimation, AnimationState> animationStates = new IdentityHashMap<>();
    private int nextAnimationId;
    private long latestFrameNs = -1;
    private boolean frameCallbackActive;
    private final Choreographer.FrameCallback frameCallback = new Choreographer.FrameCallback() {
        @Override public void doFrame(long frameTimeNanos) {
            latestFrameNs = frameTimeNanos;
            if (frameCallbackActive) Choreographer.getInstance().postFrameCallback(this);
        }
    };

    private static class AnimationState {
        int id;
        int from;
        int to;
        long duration;
        boolean anchored;
        double epoch;
    }

    /** Supplies the monotonic clock shared with Choreographer frame timestamps. */
    @PluginMethod
    public void getClock(PluginCall call) {
        JSObject result = new JSObject();
        result.put("nativeMs", System.nanoTime() / 1e6);
        call.resolve(result);
    }

    /** Reports system animation metadata for a WebView animation. */
    private void reportAnimation(String stage, WindowInsetsAnimation animation) {
        if ((animation.getTypeMask() & WindowInsets.Type.ime()) == 0) return;
        AnimationState state = animationStates.get(animation);
        if (state == null) {
            if (stage.equals("end")) return;
            state = new AnimationState();
            state.id = ++nextAnimationId;
            state.from = lastHeightPx;
            animationStates.put(animation, state);
        }
        if (stage.equals("prepare") && !frameCallbackActive) {
            frameCallbackActive = true;
            Choreographer.getInstance().postFrameCallback(frameCallback);
        }
        if (stage.equals("progress")) {
            float fraction = animation.getFraction();
            if (state.anchored || fraction <= 0 || fraction >= 1 || latestFrameNs < 0 || state.duration <= 0) return;
            // Android advances ValueAnimator from the choreographer frame time, not callback arrival.
            // Its duration is truncated to integer milliseconds after applying the animator scale.
            state.epoch = latestFrameNs / 1000000L - (double) fraction * state.duration;
            state.anchored = true;
            stage = "anchor";
        }
        JSObject row = new JSObject();
        row.put("id", state.id);
        row.put("stage", stage);
        if (stage.equals("start")) {
            float scale = Build.VERSION.SDK_INT >= 33 ? ValueAnimator.getDurationScale()
                : Settings.Global.getFloat(getContext().getContentResolver(), "animator_duration_scale", 1);
            state.duration = (long) (animation.getDurationMillis() * scale);
            state.from = lastHeightPx;
            state.to = measuredHeight();
            Interpolator curve = animation.getInterpolator();
            JSONArray points = new JSONArray();
            for (int i = 0; i <= 256; i++) {
                points.put(Float.valueOf(curve == null ? i / 256f : curve.getInterpolation(i / 256f)));
            }
            row.put("curve", points);
        }
        row.put("fromHeight", state.from / density);
        row.put("toHeight", state.to / density);
        row.put("durationMs", state.duration);
        if (state.anchored) row.put("epochMs", state.epoch);
        notifyListeners("keyboardAnimation", row);
        if (stage.equals("end")) {
            animationStates.remove(animation);
            if (animationStates.isEmpty()) {
                frameCallbackActive = false;
                Choreographer.getInstance().removeFrameCallback(frameCallback);
            }
        }
    }

    private View decorView;
    private float density;
    private int shownHeightPx;
    private int startHeightPx;
    private int lastHeightPx;
    private boolean hiding;
    private boolean animating;
    private WindowInsetsAnimation currentAnimation;

    @Override
    public void load() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return;
        decorView = getActivity().getWindow().getDecorView();
        density = getContext().getResources().getDisplayMetrics().density;

        // Capacitor Keyboard also installs a root animation callback. Install after focus so this
        // observer receives progress, and continue dispatching to the WebView's children.
        decorView.getViewTreeObserver().addOnWindowFocusChangeListener(hasFocus -> {
            if (hasFocus) decorView.post(this::installCallback);
        });
        if (decorView.hasWindowFocus()) decorView.post(this::installCallback);
    }

    @Override
    protected void handleOnDestroy() {
        frameCallbackActive = false;
        if (decorView != null) decorView.post(() -> {
            Choreographer.getInstance().removeFrameCallback(frameCallback);
            decorView.setWindowInsetsAnimationCallback(null);
            animationStates.clear();
        });
    }

    private int measuredHeight() {
        WindowMetrics metrics = getActivity().getWindowManager().getCurrentWindowMetrics();
        return metrics.getWindowInsets().getInsets(WindowInsets.Type.ime()).bottom;
    }

    private void send(String phase, int heightPx) {
        JSObject data = new JSObject();
        data.put("phase", phase);
        data.put("height", Math.max(0, heightPx) / density);
        data.put("shownHeight", Math.max(0, shownHeightPx) / density);
        data.put("timestampMs", SystemClock.uptimeMillis());
        WindowInsets rootInsets = decorView.getRootWindowInsets();
        int navigationInsetPx = rootInsets == null ? 0 : rootInsets.getInsets(WindowInsets.Type.navigationBars()).bottom;
        data.put("navigationInset", navigationInsetPx / density);
        notifyListeners("keyboardProgress", data);
    }

    private void installCallback() {
        decorView.setWindowInsetsAnimationCallback(
            new WindowInsetsAnimation.Callback(WindowInsetsAnimation.Callback.DISPATCH_MODE_CONTINUE_ON_SUBTREE) {
                @Override
                public void onPrepare(WindowInsetsAnimation animation) { reportAnimation("prepare", animation); }

                @Override
                public WindowInsetsAnimation.Bounds onStart(WindowInsetsAnimation animation, WindowInsetsAnimation.Bounds bounds) {
                    if ((animation.getTypeMask() & WindowInsets.Type.ime()) != 0) {
                        currentAnimation = animation;
                        animating = false;
                    }
                    reportAnimation("start", animation);
                    return bounds;
                }

                @Override
                public WindowInsets onProgress(WindowInsets insets, List<WindowInsetsAnimation> animations) {
                    for (WindowInsetsAnimation animation : animations) {
                        if (animation != currentAnimation) continue;
                        reportAnimation("progress", animation);
                        int measured = measuredHeight();
                        boolean nowHiding = measured == 0;
                        if (!animating || nowHiding != hiding) {
                            hiding = nowHiding;
                            animating = true;
                            startHeightPx = lastHeightPx;
                            send(hiding ? "willHide" : "willShow", startHeightPx);
                        }
                        if (!hiding) shownHeightPx = measured;
                        float fraction = animation.getInterpolatedFraction();
                        lastHeightPx = Math.round(startHeightPx + fraction * ((hiding ? 0 : shownHeightPx) - startHeightPx));
                        send("progress", lastHeightPx);
                        break;
                    }
                    return insets;
                }

                @Override
                public void onEnd(WindowInsetsAnimation animation) {
                    if ((animation.getTypeMask() & WindowInsets.Type.ime()) == 0) return;
                    reportAnimation("end", animation);
                    if (animation != currentAnimation) return;
                    currentAnimation = null;
                    int measured = measuredHeight();
                    if (measured > 0) shownHeightPx = measured;
                    lastHeightPx = measured;
                    send(measured == 0 ? "didHide" : "didShow", measured);
                    animating = false;
                }
            }
        );
    }
}
