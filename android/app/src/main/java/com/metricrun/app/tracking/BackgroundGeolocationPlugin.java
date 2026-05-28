package com.metricrun.app.tracking;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import android.Manifest;
import android.content.Intent;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;

@CapacitorPlugin(
    name = "BackgroundGeolocation",
    requestCodes = {}
)
public class BackgroundGeolocationPlugin extends Plugin {

    private Intent serviceIntent;

    @PluginMethod
    public void startTracking(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (!getActivity().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                    == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                call.reject("POST_NOTIFICATIONS permission not granted");
                return;
            }
        }

        serviceIntent = new Intent(getActivity(), TrackingService.class);
        getActivity().startForegroundService(serviceIntent);
        call.resolve();
    }

    @PluginMethod
    public void stopTracking(PluginCall call) {
        if (serviceIntent != null) {
            getActivity().stopService(serviceIntent);
            serviceIntent = null;
        }
        call.resolve();
    }

    @PluginMethod
    public void getSession(PluginCall call) {
        try {
            File file = new File(getActivity().getFilesDir(), TrackingService.getFileName());
            if (!file.exists()) {
                call.resolve(new JSObject().put("locations", new JSArray()));
                return;
            }
            BufferedReader reader = new BufferedReader(new FileReader(file));
            StringBuilder content = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                content.append(line);
            }
            reader.close();

            JSONArray arr = new JSONArray(content.toString());
            JSArray result = new JSArray();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                JSObject loc = new JSObject();
                loc.put("lat", obj.getDouble("lat"));
                loc.put("lng", obj.getDouble("lng"));
                loc.put("timestamp", obj.getLong("timestamp"));
                loc.put("accuracy", (float) obj.getDouble("accuracy"));
                result.put(loc);
            }
            JSObject ret = new JSObject();
            ret.put("locations", result);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to read session: " + e.getMessage());
        }
    }

    @PluginMethod
    public void clearSession(PluginCall call) {
        try {
            File file = new File(getActivity().getFilesDir(), TrackingService.getFileName());
            if (file.exists()) {
                file.delete();
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to clear session: " + e.getMessage());
        }
    }
}
