/**
 * Word Error Rate (WER) & Character Error Rate (CER) evaluation scorer.
 * Direct React Native equivalent of `in.gov.itantra.core.eval.Wer`.
 */
export interface WerResult {
  referenceWords: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  hits: number;
  errors: number;
  wer: number;
}

export class Wer {
  static normalize(text: string): string {
    return text
      .replace(/[.,!?;:'"()\[\]{}\-–—।॥]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  static tokenize(text: string): string[] {
    const norm = this.normalize(text);
    return norm ? norm.split(' ') : [];
  }

  static score(reference: string, hypothesis: string): WerResult {
    const ref = this.tokenize(reference);
    const hyp = this.tokenize(hypothesis);
    const n = ref.length;
    const m = hyp.length;

    if (n === 0) {
      return {
        referenceWords: 0,
        substitutions: 0,
        deletions: 0,
        insertions: m,
        hits: 0,
        errors: m,
        wer: 0,
      };
    }

    const dp: number[][] = Array.from({length: n + 1}, () =>
      new Array(m + 1).fill(0),
    );
    for (let i = 0; i <= n; i++) dp[i][0] = i;
    for (let j = 0; j <= m; j++) dp[0][j] = j;

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const cost = ref[i - 1] === hyp[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost,
        );
      }
    }

    let i = n;
    let j = m;
    let substitutions = 0;
    let deletions = 0;
    let insertions = 0;
    let hits = 0;

    while (i > 0 || j > 0) {
      const matchCost = i > 0 && j > 0 && ref[i - 1] === hyp[j - 1] ? 0 : 1;
      if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + matchCost) {
        if (matchCost === 0) hits++;
        else substitutions++;
        i--;
        j--;
      } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
        deletions++;
        i--;
      } else {
        insertions++;
        j--;
      }
    }

    const errors = substitutions + deletions + insertions;
    return {
      referenceWords: n,
      substitutions,
      deletions,
      insertions,
      hits,
      errors,
      wer: errors / n,
    };
  }
}
