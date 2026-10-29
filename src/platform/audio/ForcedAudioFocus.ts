import {VolumeManager} from 'react-native-volume-manager';
import Sound from 'react-native-sound';

/**
 * Emergency SOS Siren Preemption & 100% Forced Alarm Volume Lock.
 * Direct React Native equivalent of `in.gov.itantra.android.alert.AndroidForcedAudioFocus`.
 */
export class ForcedAudioFocus {
  private previousVolume: number | null = null;
  private sirenSound: Sound | null = null;

  async triggerEmergencySiren(
    assetWavPath: string,
    onCompleted?: () => void,
  ): Promise<void> {
    const current = await VolumeManager.getVolume();
    this.previousVolume = typeof current === 'number' ? current : current.volume;

    // Pin hardware media & alarm volume to 100% maximum
    await VolumeManager.setVolume(1.0, {
      type: 'alarm',
      showUI: false,
      playSound: false,
    });

    Sound.setCategory('Playback', false); // Exclusive audio focus (no ducking)
    this.sirenSound = new Sound(assetWavPath, Sound.MAIN_BUNDLE, err => {
      if (err) {
        onCompleted?.();
        return;
      }
      this.sirenSound?.setVolume(1.0);
      this.sirenSound?.play(() => {
        this.restoreVolume();
        onCompleted?.();
      });
    });
  }

  async stopEmergencySiren(): Promise<void> {
    this.sirenSound?.stop();
    this.sirenSound?.release();
    this.sirenSound = null;
    await this.restoreVolume();
  }

  private async restoreVolume(): Promise<void> {
    if (this.previousVolume !== null) {
      await VolumeManager.setVolume(this.previousVolume, {showUI: false});
      this.previousVolume = null;
    }
  }
}
