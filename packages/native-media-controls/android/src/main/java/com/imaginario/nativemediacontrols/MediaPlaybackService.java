package com.imaginario.nativemediacontrols;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

public class MediaPlaybackService extends Service {

    private static final String TAG = "MediaPlaybackService";
    private static final int NOTIFICATION_ID = 9001;

    static final String ACTION_CONFIGURE = "com.imaginario.nativemediacontrols.action.CONFIGURE";
    static final String ACTION_UPDATE_METADATA = "com.imaginario.nativemediacontrols.action.UPDATE_METADATA";
    static final String ACTION_UPDATE_STATE = "com.imaginario.nativemediacontrols.action.UPDATE_STATE";
    static final String ACTION_CLEAR = "com.imaginario.nativemediacontrols.action.CLEAR";

    private static final Object LOCK = new Object();

    private static String channelId = "imaginario_audio";
    private static String channelName = "Imaginario Audio";
    private static boolean showNotification = true;
    private static String title = "Imaginario";
    private static String artist = "";
    private static double durationSec = 0;
    private static double positionSec = 0;
    private static double playbackRate = 1.0;
    private static String playbackState = "none";
    private static boolean channelCreated = false;

    private MediaSessionCompat mediaSession;
    private boolean isForeground = false;

    public static void configure(
        Context context,
        String configuredChannelId,
        String configuredChannelName,
        boolean configuredShowNotification
    ) {
        synchronized (LOCK) {
            if (configuredChannelId != null && !configuredChannelId.isEmpty()) {
                channelId = configuredChannelId;
            }
            if (configuredChannelName != null && !configuredChannelName.isEmpty()) {
                channelName = configuredChannelName;
            }
            showNotification = configuredShowNotification;
        }

        ensureNotificationChannel(context.getApplicationContext());

        Intent intent = new Intent(context.getApplicationContext(), MediaPlaybackService.class);
        intent.setAction(ACTION_CONFIGURE);
        context.getApplicationContext().startService(intent);
    }

    public static void updateMetadata(Context context, String metadataTitle, String metadataArtist, Double metadataDuration) {
        synchronized (LOCK) {
            if (metadataTitle != null) {
                title = metadataTitle;
            }
            if (metadataArtist != null) {
                artist = metadataArtist;
            }
            if (metadataDuration != null && metadataDuration > 0) {
                durationSec = metadataDuration;
            }
        }

        Intent intent = new Intent(context.getApplicationContext(), MediaPlaybackService.class);
        intent.setAction(ACTION_UPDATE_METADATA);
        startServiceCompat(context.getApplicationContext(), intent, false);
    }

    public static void updatePlaybackState(
        Context context,
        String state,
        Double position,
        Double duration,
        Double rate
    ) {
        String effectiveState;
        synchronized (LOCK) {
            if (state != null) {
                playbackState = state;
            }
            if (position != null) {
                positionSec = position;
            }
            if (duration != null && duration > 0) {
                durationSec = duration;
            }
            if (rate != null) {
                playbackRate = rate;
            }
            effectiveState = playbackState;
        }

        boolean notificationsAllowed = canPostNotifications(context);
        boolean wantsNotification;
        synchronized (LOCK) {
            wantsNotification = showNotification;
        }
        boolean needsForegroundService =
            "playing".equals(effectiveState) && notificationsAllowed && wantsNotification;

        Intent intent = new Intent(context.getApplicationContext(), MediaPlaybackService.class);
        intent.setAction(ACTION_UPDATE_STATE);
        startServiceCompat(context.getApplicationContext(), intent, needsForegroundService);
    }

    public static void clear(Context context) {
        synchronized (LOCK) {
            playbackState = "none";
            positionSec = 0;
            playbackRate = 1.0;
            durationSec = 0;
            title = "Imaginario";
            artist = "";
        }

        Intent intent = new Intent(context.getApplicationContext(), MediaPlaybackService.class);
        intent.setAction(ACTION_CLEAR);
        context.getApplicationContext().startService(intent);
    }

    private static void startServiceCompat(Context context, Intent intent, boolean useForegroundService) {
        if (useForegroundService && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    private static void ensureNotificationChannel(Context context) {
        if (channelCreated || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
            channelId,
            channelName,
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Media playback controls");
        channel.setShowBadge(false);
        manager.createNotificationChannel(channel);
        channelCreated = true;
        Log.d(TAG, "channel created");
    }

    private static boolean canPostNotifications(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return true;
        }

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        return manager != null && manager.areNotificationsEnabled();
    }

    private static boolean shouldShowNotification() {
        synchronized (LOCK) {
            return showNotification && ("playing".equals(playbackState) || "paused".equals(playbackState));
        }
    }

    private static boolean shouldTeardown() {
        synchronized (LOCK) {
            return "stopped".equals(playbackState) || "none".equals(playbackState);
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        ensureMediaSession();
        ensureNotificationChannel(getApplicationContext());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (action == null) {
            applyCurrentState();
            return START_NOT_STICKY;
        }

        switch (action) {
            case ACTION_CONFIGURE:
                ensureNotificationChannel(getApplicationContext());
                applyCurrentState();
                break;
            case ACTION_UPDATE_METADATA:
                applyCurrentState();
                break;
            case ACTION_UPDATE_STATE:
                applyCurrentState();
                break;
            case ACTION_CLEAR:
                teardown();
                break;
            default:
                applyCurrentState();
                break;
        }

        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        releaseMediaSession();
        super.onDestroy();
    }

    private void ensureMediaSession() {
        if (mediaSession != null) {
            return;
        }

        mediaSession = new MediaSessionCompat(this, "ImaginarioMediaSession");
        mediaSession.setCallback(
            new MediaSessionCompat.Callback() {
                @Override
                public void onPlay() {
                    Log.d(TAG, "onPlay");
                    NativeMediaControlsPlugin.emitNativeMediaPlay();
                }

                @Override
                public void onPause() {
                    Log.d(TAG, "onPause");
                    NativeMediaControlsPlugin.emitNativeMediaPause();
                }

                @Override
                public void onStop() {
                    Log.d(TAG, "onStop");
                    NativeMediaControlsPlugin.emitNativeMediaStop();
                }

                @Override
                public void onSeekTo(long positionMs) {
                    double positionSeconds = positionMs / 1000.0;
                    Log.d(TAG, "onSeekTo positionMs=" + positionMs);
                    NativeMediaControlsPlugin.emitNativeMediaSeekTo(positionSeconds);
                }

                @Override
                public void onSkipToPrevious() {
                    Log.d(TAG, "onSkipToPrevious");
                    NativeMediaControlsPlugin.emitNativeMediaPrevious();
                }

                @Override
                public void onSkipToNext() {
                    Log.d(TAG, "onSkipToNext");
                    NativeMediaControlsPlugin.emitNativeMediaNext();
                }
            }
        );
        mediaSession.setActive(true);
    }

    private void releaseMediaSession() {
        if (mediaSession == null) {
            return;
        }

        mediaSession.setActive(false);
        mediaSession.release();
        mediaSession = null;
    }

    private void applyCurrentState() {
        ensureMediaSession();
        updateMediaSessionState();

        if (shouldTeardown()) {
            teardown();
            return;
        }

        if (!shouldShowNotification()) {
            stopSelfIfNotForeground();
            return;
        }

        if (!canPostNotifications(this)) {
            Log.d(TAG, "notification permission not granted; foreground service skipped");
            stopSelfIfNotForeground();
            return;
        }

        Notification notification = buildNotification();
        if (notification == null) {
            stopSelfIfNotForeground();
            return;
        }

        if (!isForeground) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(
                        NOTIFICATION_ID,
                        notification,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                    );
                } else {
                    startForeground(NOTIFICATION_ID, notification);
                }
                isForeground = true;
                Log.d(TAG, "notification shown");
            } catch (SecurityException e) {
                Log.d(TAG, "startForeground failed", e);
                stopSelfIfNotForeground();
            }
            return;
        }

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, notification);
            Log.d(TAG, "notification updated");
        }
    }

    private void stopSelfIfNotForeground() {
        if (!isForeground) {
            stopSelf();
        }
    }

    private void updateMediaSessionState() {
        if (mediaSession == null) {
            return;
        }

        String state;
        int sessionState;
        synchronized (LOCK) {
            state = playbackState;
        }

        switch (state) {
            case "playing":
                sessionState = PlaybackStateCompat.STATE_PLAYING;
                break;
            case "paused":
                sessionState = PlaybackStateCompat.STATE_PAUSED;
                break;
            case "stopped":
                sessionState = PlaybackStateCompat.STATE_STOPPED;
                break;
            default:
                sessionState = PlaybackStateCompat.STATE_NONE;
                break;
        }

        String metaTitle;
        String metaArtist;
        long durationMs;
        long positionMs;
        float speed;
        synchronized (LOCK) {
            metaTitle = title != null && !title.isEmpty() ? title : "Imaginario";
            metaArtist = artist != null ? artist : "";
            durationMs = (long) (durationSec * 1000L);
            positionMs = (long) (positionSec * 1000L);
            speed = (float) playbackRate;
        }

        MediaMetadataCompat.Builder metadataBuilder = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, metaTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, metaArtist);
        if (durationMs > 0) {
            metadataBuilder.putLong(MediaMetadataCompat.METADATA_KEY_DURATION, durationMs);
        }
        mediaSession.setMetadata(metadataBuilder.build());
        Log.d(
            TAG,
            "metadata set title="
                + metaTitle
                + " artist="
                + metaArtist
                + " durationMs="
                + durationMs
        );

        PlaybackStateCompat playbackStateCompat = new PlaybackStateCompat.Builder()
            .setActions(
                PlaybackStateCompat.ACTION_PLAY |
                PlaybackStateCompat.ACTION_PAUSE |
                PlaybackStateCompat.ACTION_STOP |
                PlaybackStateCompat.ACTION_PLAY_PAUSE |
                PlaybackStateCompat.ACTION_SEEK_TO |
                PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                PlaybackStateCompat.ACTION_SKIP_TO_NEXT
            )
            .setState(sessionState, positionMs, speed)
            .build();
        mediaSession.setPlaybackState(playbackStateCompat);
    }

    private Notification buildNotification() {
        if (mediaSession == null) {
            ensureMediaSession();
        }

        String contentTitle;
        String contentText;
        String state;
        synchronized (LOCK) {
            contentTitle = title != null && !title.isEmpty() ? title : "Imaginario";
            contentText = artist != null ? artist : "";
            state = playbackState;
        }

        MediaStyle mediaStyle = new MediaStyle().setMediaSession(mediaSession.getSessionToken());

        return new NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_media_notification)
            .setContentTitle(contentTitle)
            .setContentText(contentText)
            .setOngoing("playing".equals(state))
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setStyle(mediaStyle)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private void teardown() {
        releaseMediaSession();

        if (isForeground) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE);
            } else {
                stopForeground(true);
            }
            isForeground = false;
        }

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.cancel(NOTIFICATION_ID);
        }

        Log.d(TAG, "notification cleared");
        stopSelf();
    }
}
