import {magnetometer, gyroscope, setUpdateIntervalForType, SensorTypes} from 'react-native-sensors';
import Geolocation from 'react-native-geolocation-service';

export interface OrientationTelemetry {
  headingDeg: number; // 0..360 (0 = North, 90 = East, 180 = South, 270 = West)
  cardinal: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
  gyroYawRateDegPerSec: number;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

/**
 * Complementary Sensor Fusion combining Magnetometer (absolute Magnetic North) +
 * Gyroscope (high-frequency angular velocity yaw integration) + GPS Geolocation
 * to compute live device compass heading and relative bearing to nearby Wi-Fi/BLE peers.
 */
export class CompassGyroTracker {
  private headingDeg = 0;
  private gyroYawRate = 0;
  private lastGyroTs = 0;
  private magSub: any = null;
  private gyroSub: any = null;
  private watchId: number | null = null;
  private latitude = 28.6139;
  private longitude = 77.2090;
  private accuracyMeters = 4.0;

  start(onUpdate: (telemetry: OrientationTelemetry) => void): void {
    setUpdateIntervalForType(SensorTypes.magnetometer, 100);
    setUpdateIntervalForType(SensorTypes.gyroscope, 50);

    this.magSub = magnetometer.subscribe(({x, y}) => {
      let angle = Math.atan2(y, x) * (180 / Math.PI);
      if (angle < 0) angle += 360;
      // Complementary filter: 85% gyro-integrated heading + 15% magnetometer anchor
      this.headingDeg = (0.85 * this.headingDeg + 0.15 * angle + 360) % 360;
      onUpdate(this.snapshot());
    });

    this.gyroSub = gyroscope.subscribe(({z, timestamp}) => {
      if (this.lastGyroTs > 0) {
        const dt = (timestamp - this.lastGyroTs) / 1000;
        const yawDegPerSec = -z * (180 / Math.PI);
        this.gyroYawRate = Number(yawDegPerSec.toFixed(1));
        this.headingDeg = (this.headingDeg + yawDegPerSec * dt + 360) % 360;
      }
      this.lastGyroTs = timestamp;
    });

    this.watchId = Geolocation.watchPosition(
      pos => {
        this.latitude = pos.coords.latitude;
        this.longitude = pos.coords.longitude;
        this.accuracyMeters = pos.coords.accuracy ?? 5.0;
        onUpdate(this.snapshot());
      },
      () => {},
      {enableHighAccuracy: true, distanceFilter: 1, interval: 2000},
    );
  }

  stop(): void {
    this.magSub?.unsubscribe?.();
    this.gyroSub?.unsubscribe?.();
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  snapshot(): OrientationTelemetry {
    return {
      headingDeg: Math.round(this.headingDeg),
      cardinal: CompassGyroTracker.toCardinal(this.headingDeg),
      gyroYawRateDegPerSec: this.gyroYawRate,
      latitude: this.latitude,
      longitude: this.longitude,
      accuracyMeters: this.accuracyMeters,
    };
  }

  static toCardinal(deg: number): OrientationTelemetry['cardinal'] {
    const dirs: Array<OrientationTelemetry['cardinal']> = [
      'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW',
    ];
    return dirs[Math.round(((deg % 360) / 45)) % 8];
  }

  /**
   * Computes true geographic bearing (0..360°) and relative screen angle from user's
   * current compass heading to a peer's GPS coordinates.
   */
  static computePeerBearing(
    myLat: number,
    myLon: number,
    peerLat: number,
    peerLon: number,
    deviceHeadingDeg: number,
  ): {trueBearingDeg: number; relativeAngleDeg: number; cardinal: string} {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;
    const dLon = toRad(peerLon - myLon);
    const lat1 = toRad(myLat);
    const lat2 = toRad(peerLat);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const trueBearingDeg = (toDeg(Math.atan2(y, x)) + 360) % 360;
    const relativeAngleDeg = (trueBearingDeg - deviceHeadingDeg + 360) % 360;
    return {
      trueBearingDeg: Math.round(trueBearingDeg),
      relativeAngleDeg: Math.round(relativeAngleDeg),
      cardinal: this.toCardinal(trueBearingDeg),
    };
  }
}
