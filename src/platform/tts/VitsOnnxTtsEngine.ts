import {InferenceSession, Tensor} from 'onnxruntime-react-native';
import Tts from 'react-native-tts';
import RNFS from 'react-native-fs';
import {LanguageInfo} from '../../core/Language';
import {ClauseChunker} from '../../core/tts/ClauseChunker';
import {TextNormalizer} from '../../core/tts/TextNormalizer';

/**
 * On-Device VITS (MMS-TTS) Synthesizer on `onnxruntime-react-native` with `react-native-tts` fallback.
 * Uses ClauseChunker pipelining for <400ms time-to-first-audio.
 * Direct React Native equivalent of `in.gov.itantra.android.tts.VitsOnnxTtsEngine`.
 */
export class VitsOnnxTtsEngine {
  private session: InferenceSession | null = null;
  private symbolToId: Map<string, number> = new Map();
  private padId = 0;
  private interleavePad = true;
  private useFallbackTts = false;
  public activeLanguage: LanguageInfo | null = null;
  public loadedModelSizeBytes: number | null = null;

  private readonly chunker = new ClauseChunker(5, 55);

  async loadVoice(
    language: LanguageInfo,
    unloadSttCallback?: () => Promise<void>,
  ): Promise<void> {
    if (unloadSttCallback) {
      await unloadSttCallback(); // Strict Single-Model Resident RAM Rule (<250MB)
    }
    await this.unloadVoice();

    const modelPath = `${RNFS.DocumentDirectoryPath}/models/tts/vits-${language.code}-int8.onnx`;
    const vocabPath = `${RNFS.DocumentDirectoryPath}/models/tts/vits-${language.code}-vocab.json`;

    try {
      if ((await RNFS.exists(modelPath)) && (await RNFS.exists(vocabPath))) {
        const stat = await RNFS.stat(modelPath);
        this.loadedModelSizeBytes = Number(stat.size);
        this.session = await InferenceSession.create(modelPath, {
          intraOpNumThreads: 2,
          interOpNumThreads: 1,
          executionProviders: ['cpu'],
        });
        const vocabJson = JSON.parse(await RNFS.readFile(vocabPath, 'utf8'));
        this.padId = Number(vocabJson.pad_id ?? 0);
        this.interleavePad = Boolean(vocabJson.interleave_pad ?? true);
        this.symbolToId.clear();
        for (const [k, v] of Object.entries(vocabJson)) {
          if (!['pad_id', 'interleave_pad', 'unk_id'].includes(k)) {
            this.symbolToId.set(k, Number(v));
          }
        }
        this.useFallbackTts = false;
      } else {
        this.useFallbackTts = true;
      }
    } catch {
      this.useFallbackTts = true;
    }

    this.activeLanguage = language;
  }

  async unloadVoice(): Promise<void> {
    this.session = null;
    this.symbolToId.clear();
    this.activeLanguage = null;
    this.loadedModelSizeBytes = null;
  }

  async speakPipelined(text: string, language: LanguageInfo): Promise<void> {
    if (this.activeLanguage?.code !== language.code) {
      await this.loadVoice(language);
    }
    const normalizer = new TextNormalizer(language);
    const clauses = this.chunker.chunk(normalizer.normalize(text));

    for (const clause of clauses) {
      if (this.useFallbackTts || !this.session) {
        await Tts.setDefaultLanguage(language.bcp47);
        Tts.speak(clause);
      } else {
        await this.synthesizeClauseOnnx(clause);
      }
    }
  }

  private async synthesizeClauseOnnx(clause: string): Promise<Int16Array> {
    if (!this.session) {
      return new Int16Array(0);
    }
    const tokenIds: BigInt64Array = this.encodeTokens(clause.toLowerCase());
    const inputTensor = new Tensor('int64', tokenIds, [1, tokenIds.length]);
    const outputs = await this.session.run({text: inputTensor});
    const waveform = (outputs.output ?? Object.values(outputs)[0])
      .data as Float32Array;

    let maxAmp = 0;
    for (let i = 0; i < waveform.length; i++) {
      const abs = Math.abs(waveform[i]);
      if (abs > maxAmp) maxAmp = abs;
    }
    const scale = maxAmp > 0.01 ? 0.95 / maxAmp : 1.0;
    const pcm16 = new Int16Array(waveform.length);
    for (let i = 0; i < waveform.length; i++) {
      const s = Math.max(-32768, Math.min(32767, waveform[i] * scale * 32767));
      pcm16[i] = s;
    }
    return pcm16;
  }

  private encodeTokens(text: string): BigInt64Array {
    const ids: bigint[] = [];
    if (this.interleavePad) ids.push(BigInt(this.padId));
    for (const ch of text) {
      const id = this.symbolToId.get(ch);
      if (id !== undefined && id <= 71) {
        ids.push(BigInt(id));
        if (this.interleavePad) ids.push(BigInt(this.padId));
      }
    }
    return BigInt64Array.from(ids);
  }
}
