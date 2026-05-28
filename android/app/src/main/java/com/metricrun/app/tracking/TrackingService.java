package com.metricrun.app.tracking;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileWriter;
import java.util.ArrayList;
import java.util.List;

public class TrackingService extends Service {

    private static final String CHANNEL_ID = "metricrun_tracking";
    private static final int NOTIFICATION_ID = 1;
    private static final String FILE_NAME = "session.json";

    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private final List<TrackedLocation> locations = new ArrayList<>();
    private final Object lock = new Object();

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);

        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult locationResult) {
                if (locationResult == null) return;
                for (Location loc : locationResult.getLocations()) {
                    TrackedLocation tl = new TrackedLocation(
                            loc.getLatitude(),
                            loc.getLongitude(),
                            loc.getTime(),
                            loc.getAccuracy()
                    );
                    synchronized (lock) {
                        locations.add(tl);
                    }
                    saveToFile();
                }
            }
        };
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("MetricRun")
                .setContentText("Grabando carrera...")
                .setSmallIcon(android.R.drawable.ic_menu_compass)
                .setOngoing(true)
                .build();

        startForeground(NOTIFICATION_ID, notification);

        startLocationUpdates();
        return START_STICKY;
    }

    private void startLocationUpdates() {
        LocationRequest locationRequest = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 3000)
                .setMinUpdateIntervalMillis(3000)
                .setMaxUpdateDelayMillis(5000)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION)
                    == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper());
            }
        } else {
            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper());
        }
    }

    private void saveToFile() {
        try {
            File file = new File(getFilesDir(), FILE_NAME);
            synchronized (lock) {
                JSONArray arr = new JSONArray();
                for (TrackedLocation tl : locations) {
                    JSONObject obj = new JSONObject();
                    obj.put("lat", tl.getLat());
                    obj.put("lng", tl.getLng());
                    obj.put("timestamp", tl.getTimestamp());
                    obj.put("accuracy", tl.getAccuracy());
                    arr.put(obj);
                }
                FileWriter writer = new FileWriter(file);
                writer.write(arr.toString());
                writer.close();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        if (fusedLocationClient != null && locationCallback != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
        }
        super.onDestroy();
    }

    public static String getFileName() {
        return FILE_NAME;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "MetricRun Tracking",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Notificación para el seguimiento de carrera en segundo plano");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
