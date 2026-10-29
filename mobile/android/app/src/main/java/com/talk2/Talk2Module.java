package com.talk2;
import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import android.content.*;
import android.hardware.*;
import android.location.*;
import android.os.*;
import android.bluetooth.BluetoothAdapter;
import android.media.*;
import org.json.*;
import java.util.concurrent.*;
public final class Talk2Module extends ReactContextBaseJavaModule implements SensorEventListener,LocationListener,LifecycleEventListener{
 private final ReactApplicationContext ctx;private final ModelStore models;private final SpeechEngine speech;private final TranslationEngine translator;private PeerRadio radio;
 private final ExecutorService jobs=Executors.newSingleThreadExecutor(),downloads=Executors.newSingleThreadExecutor(),network=Executors.newSingleThreadExecutor();
 private final SensorManager sensors;private final LocationManager locations;private Location lastLocation;private long lastHeading;private boolean observing;
 public Talk2Module(ReactApplicationContext c){super(c);ctx=c;models=new ModelStore(c);speech=new SpeechEngine(models);translator=new TranslationEngine(models);sensors=(SensorManager)c.getSystemService(Context.SENSOR_SERVICE);locations=(LocationManager)c.getSystemService(Context.LOCATION_SERVICE);c.addLifecycleEventListener(this);}
 @Override public String getName(){return "Talk2Native";}
 private interface Work{Object run()throws Exception;}
 private void task(ExecutorService e,Promise p,Work w){e.execute(()->{try{p.resolve(w.run());}catch(Exception ex){p.reject("TALK2",ex.getMessage(),ex);}});}
 private void emit(String type,JSONObject data){try{data.put("type",type);ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit("Talk2Event",data.toString());}catch(Exception ignored){}}
 private PeerRadio radio(){if(radio==null)radio=new PeerRadio(ctx,this::emit);return radio;}
 @ReactMethod public void addListener(String name){}
 @ReactMethod public void removeListeners(double count){}
 @ReactMethod public void loadState(Promise p){p.resolve(ctx.getSharedPreferences("talk2",0).getString("state","{}"));}
 @ReactMethod public void saveState(String state,Promise p){task(jobs,p,()->{new JSONObject(state);if(state.length()>2000000)throw new Exception("History capacity reached");if(!ctx.getSharedPreferences("talk2",0).edit().putString("state",state).commit())throw new Exception("Storage write failed");return true;});}
 @ReactMethod public void packStatus(Promise p){task(downloads,p,()->{JSONObject result=new JSONObject();for(String code:new String[]{"hi","ta","bn","gu","mr","kn","ml","te","or","en","translation"}){try{result.put(code,models.ready(code));}catch(Exception invalid){result.put(code,false);}}return result.toString();});}
 @ReactMethod public void installPack(String code,String manifest,Promise p){task(downloads,p,()->{models.install(code,new JSONObject(manifest),(pack,file,done,total)->{try{emit("download",new JSONObject().put("pack",pack).put("file",file).put("done",done).put("total",total));}catch(Exception ignored){}});return true;});}
 @ReactMethod public void cancelDownload(){models.cancel();}
 @ReactMethod public void removePack(String code,Promise p){task(downloads,p,()->{models.remove(code);return true;});}
 @ReactMethod public void startRecording(Promise p){task(jobs,p,()->{speech.start();return true;});}
 @ReactMethod public void stopRecording(String language,Promise p){task(jobs,p,()->{long start=System.nanoTime();byte[] pcm=speech.stop();String text=speech.transcribe(pcm,language);emit("metric",new JSONObject().put("sttMs",(System.nanoTime()-start)/1000000).put("audioMs",pcm.length/32));return text;});}
 @ReactMethod public void speak(String text,String language,Promise p){task(jobs,p,()->{long start=System.nanoTime();speech.speak(text,language);emit("metric",new JSONObject().put("ttsMs",(System.nanoTime()-start)/1000000));return true;});}
 @ReactMethod public void translate(String text,String source,String target,Promise p){task(jobs,p,()->translator.translate(text,source,target));}
 @ReactMethod public void discover(String transport,Promise p){task(network,p,()->{radio().discover(transport);return true;});}
 @ReactMethod public void host(String transport,Promise p){task(network,p,()->{radio().host(transport);return true;});}
 @ReactMethod public void join(String transport,String address,Promise p){task(network,p,()->{radio().join(transport,address);return true;});}
 @ReactMethod public void confirmPairing(Promise p){task(network,p,()->{radio().confirm();return true;});}
 @ReactMethod public void send(String text,Promise p){task(network,p,()->{radio().send(text);return true;});}
 @ReactMethod public void disconnect(Promise p){task(network,p,()->{if(radio!=null){radio.close();radio=null;}return true;});}
 @ReactMethod public void bluetoothDiscoverable(Promise p){try{Intent i=new Intent(BluetoothAdapter.ACTION_REQUEST_DISCOVERABLE);i.putExtra(BluetoothAdapter.EXTRA_DISCOVERABLE_DURATION,120);if(getCurrentActivity()==null)throw new Exception("Open the app first");getCurrentActivity().startActivity(i);p.resolve(true);}catch(Exception e){p.reject("BLUETOOTH",e);}}
 @ReactMethod public void startSensors(Promise p){new Handler(Looper.getMainLooper()).post(()->{try{if(!observing){Sensor s=sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);if(s!=null)sensors.registerListener(this,s,SensorManager.SENSOR_DELAY_UI);else emit("error",new JSONObject().put("message","No compass rotation sensor; using north-up view"));locations.requestLocationUpdates(LocationManager.GPS_PROVIDER,2000,2,this);observing=true;}p.resolve(true);}catch(Exception e){p.reject("SENSORS",e);}});}
 @ReactMethod public void stopSensors(){sensors.unregisterListener(this);locations.removeUpdates(this);observing=false;}
 @ReactMethod public void alertTone(){ToneGenerator t=new ToneGenerator(AudioManager.STREAM_NOTIFICATION,70);t.startTone(ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD,1200);new Handler(Looper.getMainLooper()).postDelayed(t::release,1400);}
 @ReactMethod public void diagnostics(Promise p){try{android.app.ActivityManager am=(android.app.ActivityManager)ctx.getSystemService(Context.ACTIVITY_SERVICE);android.app.ActivityManager.MemoryInfo m=new android.app.ActivityManager.MemoryInfo();am.getMemoryInfo(m);p.resolve(new JSONObject().put("javaHeapBytes",Runtime.getRuntime().totalMemory()-Runtime.getRuntime().freeMemory()).put("availableSystemBytes",m.availMem).put("freeStorageBytes",ctx.getFilesDir().getUsableSpace()).toString());}catch(Exception e){p.reject("DIAGNOSTICS",e);}}
 @Override public void onSensorChanged(SensorEvent e){if(System.currentTimeMillis()-lastHeading<150)return;lastHeading=System.currentTimeMillis();float[] matrix=new float[9],orientation=new float[3];SensorManager.getRotationMatrixFromVector(matrix,e.values);SensorManager.getOrientation(matrix,orientation);double heading=(Math.toDegrees(orientation[0])+360)%360;if(lastLocation!=null){GeomagneticField f=new GeomagneticField((float)lastLocation.getLatitude(),(float)lastLocation.getLongitude(),(float)lastLocation.getAltitude(),System.currentTimeMillis());heading=(heading+f.getDeclination()+360)%360;}try{emit("heading",new JSONObject().put("degrees",heading).put("trueNorth",lastLocation!=null).put("accuracy",e.accuracy));}catch(Exception ignored){}}
 @Override public void onLocationChanged(Location l){lastLocation=l;try{emit("location",new JSONObject().put("latitude",l.getLatitude()).put("longitude",l.getLongitude()).put("accuracy",l.getAccuracy()).put("time",l.getTime()));}catch(Exception ignored){}}
 @Override public void onAccuracyChanged(Sensor s,int accuracy){}
 @Override public void onProviderEnabled(String provider){}
 @Override public void onProviderDisabled(String provider){try{emit("error",new JSONObject().put("message","Enable GPS for peer bearings"));}catch(Exception ignored){}}
 @Override public void onStatusChanged(String provider,int status,Bundle extras){}
 @Override public void onHostResume(){}
 @Override public void onHostPause(){stopSensors();speech.close();}
 @Override public void onHostDestroy(){stopSensors();speech.close();if(radio!=null)radio.close();}
 @Override public void invalidate(){onHostDestroy();ctx.removeLifecycleEventListener(this);jobs.shutdownNow();downloads.shutdownNow();network.shutdownNow();super.invalidate();}
}
