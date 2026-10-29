import {InferenceSession, Tensor} from 'onnxruntime-react-native';
import LiveAudioStream from 'react-native-live-audio-stream';
import RNFS from 'react-native-fs';
import {Buffer} from 'buffer';
import {LanguageInfo} from '../../core/Language';
import {EndpointEvent, SilenceEndpointer} from '../../core/stt/SilenceEndpointer';

export interface SttResult {
  text: string;
  language: LanguageInfo;
  utteranceDurationMs: number;
  finalisationLatencyMs: number;
}

/**
 * On-Device IndicWav2Vec CTC Speech-to-Text Engine on `onnxruntime-react-native`.
 * Enforces the Single-Model Resident RAM rule (<250MB) for 2GB target handsets.
 * Direct React Native equivalent of `in.gov.itantra.android.stt.OnnxCtcSttEngine`.
 */
export class OnnxCtcSttEngine {
  private session: InferenceSession | null = null;
  private vocab: Map<number, string> = new Map();
  private blankId = 0;
  public activeLanguage: LanguageInfo | null = null;
  public loadedModelSizeBytes: number | null = null;

  private readonly endpointer = new SilenceEndpointer(1500, 20);
  private pcmSamples: number[] = [];
  private partialInFlight = false;
  private lastPartialMs = 0;

  async loadModel(language: LanguageInfo, unloadTtsCallback?: () => Promise<void>): Promise<void> {
    if (unloadTtsCallback) {
      await unloadTtsCallback(); // Strict Single-Model RAM Rule
    }
    await this.unloadModel();

    const modelPath = `${RNFS.DocumentDirectoryPath}/models/stt/indicwav2vec-${language.code}-int8.onnx`;
    const vocabPath = `${RNFS.DocumentDirectoryPath}/models/stt/indicwav2vec-${language.code}-vocab.json`;

    const exists = await RNFS.exists(modelPath);
    if (exists) {
      const stat = await RNFS.stat(modelPath);
      this.loadedModelSizeBytes = Number(stat.size);
      this.session = await InferenceSession.create(modelPath, {
        intraOpNumThreads: 2,
        interOpNumThreads: 1,
        executionProviders: ['cpu'],
      });
    }

    if (await RNFS.exists(vocabPath)) {
      const rawVocab = JSON.parse(await RNFS.readFile(vocabPath, 'utf8'));
      this.vocab.clear();
      for (const [token, id] of Object.entries(rawVocab)) {
        const numId = Number(id);
        this.vocab.set(numId, token);
        if (token === '<pad>' || token === '[PAD]') {
          this.blankId = numId;
        }
      }
    }

    this.activeLanguage = language;
  }

  async unloadModel(): Promise<void> {
    this.stopCapture();
    this.session = null;
    this.vocab.clear();
    this.activeLanguage = null;
    this.loadedModelSizeBytes = null;
  }

  startCapture(
    onPartial: (text: string) => void,
    onFinal: (result: SttResult) => void,
  ): void {
    this.pcmSamples = [];
    this.endpointer.reset();
    const startedAt = Date.now();

    LiveAudioStream.init({
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6, // VOICE_RECOGNITION
      bufferSize: 640, // 20ms @ 16kHz 16-bit mono
    });

    LiveAudioStream.on('data', async (base64Chunk: string) => {
      const raw = Buffer.from(base64Chunk, 'base64');
      const frame = new Int16Array(
        raw.buffer,
        raw.byteOffset,
        raw.byteLength / 2,
      );
      for (let i = 0; i < frame.length; i++) {
        this.pcmSamples.push(frame[i]);
      }

      const ev = this.endpointer.onFrame(frame);
      const now = Date.now();

      if (
        this.endpointer.hasSpeech &&
        now - this.lastPartialMs >= 600 &&
        !this.partialInFlight
      ) {
        this.lastPartialMs = now;
        this.partialInFlight = true;
        this.decodeCtcGreedy(this.pcmSamples)
          .then(partial => {
            if (partial) onPartial(partial);
          })
          .finally(() => {
            this.partialInFlight = false;
          });
      }

      if (ev === EndpointEvent.ENDPOINT) {
        this.stopCapture();
        const decodeStart = Date.now();
        const text = await this.decodeCtcGreedy(this.pcmSamples);
        onFinal({
          text,
          language: this.activeLanguage!,
          utteranceDurationMs: Date.now() - startedAt,
          finalisationLatencyMs: Date.now() - decodeStart,
        });
      }
    });

    LiveAudioStream.start();
  }

  stopCapture(): void {
    try {
      LiveAudioStream.stop();
    } catch {
      // Ignore if not running
    }
  }

  async decodeCtcGreedy(pcmInt16: number[]): Promise<string> {
    if (!this.session || pcmInt16.length === 0) {
      return '';
    }
    const float32 = new Float32Array(pcmInt16.length);
    for (let i = 0; i < pcmInt16.length; i++) {
      float32[i] = pcmInt16[i] / 32768.0;
    }

    const inputTensor = new Tensor('float32', float32, [1, float32.length]);
    const outputs = await this.session.run({input: inputTensor});
    const logitsTensor = outputs.output ?? Object.values(outputs)[0];
    const data = logitsTensor.data as Float32Array;
    const [, timeSteps, vocabSize] = logitsTensor.dims;

    let prevToken = -1;
    let out = '';
    for (let t = 0; t < timeSteps; t++) {
      let maxIdx = 0;
      let maxVal = -Infinity;
      const baseOffset = t * vocabSize;
      for (let v = 0; v < vocabSize; v++) {
        const val = data[baseOffset + v];
        if (val > maxVal) {
          maxVal = val;
          maxIdx = v;
        }
      }
      if (maxIdx !== this.blankId && maxIdx !== prevToken) {
        const symbol = this.vocab.get(maxIdx) ?? '';
        out += symbol === '|' ? ' ' : symbol;
      }
      prevToken = maxIdx;
    }
    return out.replace(/\s+/g, ' ').trim();
  }
}
