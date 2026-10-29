/**
 * Clause-level text chunker for low-latency (<400ms) pipelined VITS TTS synthesis.
 * Direct React Native equivalent of `in.gov.itantra.core.tts.ClauseChunker`.
 */
export class ClauseChunker {
  private static readonly BOUNDARY_CHARS = new Set([
    '.',
    '!',
    '?',
    ',',
    ';',
    ':',
    '।',
    '॥',
  ]);

  constructor(
    private readonly minChunkChars: number = 5,
    private readonly maxChunkChars: number = 55,
  ) {}

  chunk(text: string): string[] {
    const normalised = text.replace(/\s+/g, ' ').trim();
    if (!normalised) {
      return [];
    }
    const raw = this.splitOnBoundaries(normalised);
    const bounded = raw.flatMap(c => this.splitOverlongChunk(c));
    return this.mergeShortChunks(bounded);
  }

  private splitOnBoundaries(text: string): string[] {
    const out: string[] = [];
    let current = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      current += ch;
      if (ClauseChunker.BOUNDARY_CHARS.has(ch)) {
        while (
          i + 1 < text.length &&
          ClauseChunker.BOUNDARY_CHARS.has(text[i + 1])
        ) {
          current += text[++i];
        }
        const isDecimal =
          ch === '.' &&
          current.length >= 2 &&
          /\d/.test(current[current.length - 2]) &&
          i + 1 < text.length &&
          /\d/.test(text[i + 1]);
        if (!isDecimal) {
          out.push(current.trim());
          current = '';
        }
      }
    }
    if (current.trim()) {
      out.push(current.trim());
    }
    return out.filter(Boolean);
  }

  private splitOverlongChunk(chunk: string): string[] {
    if (chunk.length <= this.maxChunkChars) {
      return [chunk];
    }
    const out: string[] = [];
    let rest = chunk;
    while (rest.length > this.maxChunkChars) {
      const windowStr = rest.slice(0, this.maxChunkChars);
      const lastSpace = windowStr.lastIndexOf(' ');
      const cut =
        lastSpace > this.minChunkChars ? lastSpace : this.maxChunkChars;
      out.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) {
      out.push(rest);
    }
    return out;
  }

  private mergeShortChunks(chunks: string[]): string[] {
    if (chunks.length === 0) {
      return [];
    }
    const out: string[] = [];
    let pending = '';
    for (const c of chunks) {
      pending = pending ? `${pending} ${c}` : c;
      if (pending.length >= this.minChunkChars) {
        out.push(pending);
        pending = '';
      }
    }
    if (pending) {
      if (out.length > 0) {
        out[out.length - 1] = `${out[out.length - 1]} ${pending}`;
      } else {
        out.push(pending);
      }
    }
    return out;
  }
}
