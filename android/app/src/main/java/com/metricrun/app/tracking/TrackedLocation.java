package com.metricrun.app.tracking;

public class TrackedLocation {
    private double lat;
    private double lng;
    private long timestamp;
    private float accuracy;

    public TrackedLocation(double lat, double lng, long timestamp, float accuracy) {
        this.lat = lat;
        this.lng = lng;
        this.timestamp = timestamp;
        this.accuracy = accuracy;
    }

    public double getLat() { return lat; }
    public double getLng() { return lng; }
    public long getTimestamp() { return timestamp; }
    public float getAccuracy() { return accuracy; }
}
