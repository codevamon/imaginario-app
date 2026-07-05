package com.imaginario.nativemediacontrols;

import android.Manifest;
import android.os.Build;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "NativeMediaControls",
    permissions = {
        @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
    }
)
public class NativeMediaControlsPlugin extends Plugin {

    private static final String TAG = "NativeMediaControls";

    private static volatile NativeMediaControlsPlugin instance;

    private String channelId = "imaginario_audio";
    private String channelName = "Imaginario Audio";
    private boolean showNotification = true;
    private String lastState = "none";

    private static String optString(PluginCall call, String key) {
        String value = call.getString(key);
        return value != null ? value : "null";
    }

    private static String optDouble(PluginCall call, String key) {
        Double value = call.getDouble(key);
        return value != null ? String.valueOf(value) : "null";
    }

    private static String optBoolean(PluginCall call, String key) {
        Boolean value = call.getBoolean(key);
        return value != null ? String.valueOf(value) : "null";
    }

    private boolean shouldRequestNotificationPermission() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && showNotification
            && getPermissionState("notifications") != PermissionState.GRANTED;
    }

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) {
            instance = null;
        }
        super.handleOnDestroy();
    }

    public static void emitNativeMediaPlay() {
        NativeMediaControlsPlugin plugin = instance;
        if (plugin == null) {
            Log.w(TAG, "emit nativeMediaPlay skipped: no active plugin");
            return;
        }
        Log.d(TAG, "emit nativeMediaPlay");
        plugin.notifyListeners("nativeMediaPlay", new JSObject());
    }

    public static void emitNativeMediaPause() {
        NativeMediaControlsPlugin plugin = instance;
        if (plugin == null) {
            Log.w(TAG, "emit nativeMediaPause skipped: no active plugin");
            return;
        }
        Log.d(TAG, "emit nativeMediaPause");
        plugin.notifyListeners("nativeMediaPause", new JSObject());
    }

    public static void emitNativeMediaStop() {
        NativeMediaControlsPlugin plugin = instance;
        if (plugin == null) {
            Log.w(TAG, "emit nativeMediaStop skipped: no active plugin");
            return;
        }
        Log.d(TAG, "emit nativeMediaStop");
        plugin.notifyListeners("nativeMediaStop", new JSObject());
    }

    private void finishConfigure(PluginCall call) {
        MediaPlaybackService.configure(getContext(), channelId, channelName, showNotification);
        Log.d(TAG, "service configured");
        call.resolve();
    }

    @PluginMethod
    public void configure(PluginCall call) {
        Boolean configuredShowNotification = call.getBoolean("showNotification");
        String configuredChannelId = call.getString("channelId");
        String configuredChannelName = call.getString("channelName");

        if (configuredChannelId != null && !configuredChannelId.isEmpty()) {
            channelId = configuredChannelId;
        }
        if (configuredChannelName != null && !configuredChannelName.isEmpty()) {
            channelName = configuredChannelName;
        }
        if (configuredShowNotification != null) {
            showNotification = configuredShowNotification;
        }

        Log.d(
            TAG,
            "configure CALLED showNotification="
                + showNotification
                + " channelId="
                + channelId
                + " channelName="
                + channelName
        );

        if (shouldRequestNotificationPermission()) {
            Log.d(TAG, "requesting POST_NOTIFICATIONS");
            requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
            return;
        }

        finishConfigure(call);
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        PermissionState state = getPermissionState("notifications");
        Log.d(TAG, "POST_NOTIFICATIONS result: " + state);
        finishConfigure(call);
    }

    @PluginMethod
    public void setMetadata(PluginCall call) {
        Log.d(
            TAG,
            "setMetadata CALLED id="
                + optString(call, "id")
                + " title="
                + optString(call, "title")
                + " artist="
                + optString(call, "artist")
                + " album="
                + optString(call, "album")
                + " duration="
                + optDouble(call, "duration")
                + " artworkUrl="
                + optString(call, "artworkUrl")
        );

        MediaPlaybackService.updateMetadata(
            getContext(),
            call.getString("title"),
            call.getString("artist"),
            call.getDouble("duration")
        );
        Log.d(TAG, "service metadata updated");
        call.resolve();
    }

    @PluginMethod
    public void setPlaybackState(PluginCall call) {
        String state = call.getString("state");
        if (state != null) {
            lastState = state;
        }
        Log.d(TAG, "setPlaybackState CALLED state=" + (state != null ? state : "null"));

        MediaPlaybackService.updatePlaybackState(getContext(), state, null, null, null);
        Log.d(TAG, "service state updated");
        call.resolve();
    }

    @PluginMethod
    public void setPosition(PluginCall call) {
        Log.d(
            TAG,
            "setPosition CALLED position="
                + optDouble(call, "position")
                + " duration="
                + optDouble(call, "duration")
                + " playbackRate="
                + optDouble(call, "playbackRate")
        );

        MediaPlaybackService.updatePlaybackState(
            getContext(),
            lastState,
            call.getDouble("position"),
            call.getDouble("duration"),
            call.getDouble("playbackRate")
        );
        Log.d(TAG, "service state updated");
        call.resolve();
    }

    @PluginMethod
    public void clear(PluginCall call) {
        Log.d(TAG, "clear CALLED");
        lastState = "none";
        MediaPlaybackService.clear(getContext());
        Log.d(TAG, "service state updated");
        call.resolve();
    }
}
