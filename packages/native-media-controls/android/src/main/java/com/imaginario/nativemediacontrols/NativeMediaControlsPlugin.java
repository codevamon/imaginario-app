package com.imaginario.nativemediacontrols;

import android.util.Log;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeMediaControls")
public class NativeMediaControlsPlugin extends Plugin {

    private static final String TAG = "NativeMediaControls";

    @PluginMethod
    public void configure(PluginCall call) {
        Log.d(TAG, "configure");
        call.resolve();
    }

    @PluginMethod
    public void setMetadata(PluginCall call) {
        Log.d(TAG, "setMetadata");
        call.resolve();
    }

    @PluginMethod
    public void setPlaybackState(PluginCall call) {
        Log.d(TAG, "setPlaybackState");
        call.resolve();
    }

    @PluginMethod
    public void setPosition(PluginCall call) {
        Log.d(TAG, "setPosition");
        call.resolve();
    }

    @PluginMethod
    public void clear(PluginCall call) {
        Log.d(TAG, "clear");
        call.resolve();
    }
}
