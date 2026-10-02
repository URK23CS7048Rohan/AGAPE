/** ChordPro-style song charts: parse, transpose, capo. "[G]Amazing [G7]grace" → segments with chords above lyrics. */

export type Seg = { chord?: string; text: string };
export type Line = Seg[];
export type Section = { label: string; lines: Line[] };

export function parseSong(body: string): Section[] {
  const out: Section[] = [];
  let cur: Section | null = null;
  for (const raw of String(body || "").replace(/\r/g, "").split("\n")) {
    const line = raw.trimEnd();
    const label = line.match(/^\{(.+)\}$/);
    if (label) { cur = { label: label[1].trim(), lines: [] }; out.push(cur); continue; }
    if (!cur) { cur = { label: "", lines: [] }; out.push(cur); }
    if (!line.trim()) continue;
    const segs: Seg[] = [];
    const re = /\[([^\]]+)\]/g;
    let last = 0, chord: string | undefined, m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      const text = line.slice(last, m.index);
      if (text || chord) segs.push({ chord, text });
      chord = m[1]; last = m.index + m[0].length;
    }
    segs.push({ chord, text: line.slice(last) });
    cur.lines.push(segs.filter((s, i) => s.text || s.chord || i === 0));
  }
  return out.filter((s) => s.lines.length);
}

const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const IDX: Record<string, number> = {};
SHARP.forEach((n, i) => (IDX[n] = i)); FLAT.forEach((n, i) => (IDX[n] = i));
IDX["Cb"] = 11; IDX["Fb"] = 4; IDX["E#"] = 5; IDX["B#"] = 0;
/** Keys that are usually written with flats. */
const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"]);
export const KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

const note = (i: number, flat: boolean) => (flat ? FLAT : SHARP)[((i % 12) + 12) % 12];
export function transposeNote(n: string, by: number, flat: boolean) { return n in IDX ? note(IDX[n] + by, flat) : n; }
export function transposeChord(ch: string, by: number, toKey: string) {
  if (!by) return ch;
  const flat = FLAT_KEYS.has(toKey);
  return ch.replace(/^([A-G][#b]?)/, (r) => transposeNote(r, by, flat)).replace(/\/([A-G][#b]?)$/, (_, b) => "/" + transposeNote(b, by, flat));
}
/** Semitones from one key to another (shortest way). */
export function interval(from: string, to: string) {
  const d = ((IDX[to.replace(/m$/, "")] - IDX[from.replace(/m$/, "")]) % 12 + 12) % 12;
  return d > 6 ? d - 12 : d;
}
export function keyPlus(k: string, by: number) {
  const minor = /m$/.test(k), root = k.replace(/m$/, "");
  const n = note(IDX[root] + by, false);
  const pretty = { "A#": "Bb", "D#": "Eb", "G#": "Ab", "C#": "Db" }[n] || n;
  return pretty + (minor ? "m" : "");
}
/** Shape to play with a capo: sounding key + capo fret → chord shapes in an easier key. */
export function capoShapeKey(sounding: string, capo: number) { return keyPlus(sounding, -capo); }

export function songChords(sections: Section[]) {
  const set = new Set<string>();
  sections.forEach((s) => s.lines.forEach((l) => l.forEach((g) => g.chord && set.add(g.chord))));
  return [...set];
}
/** Plain lyrics (for sharing, search, the projector). */
export const lyricsOnly = (body: string) => body.replace(/\[[^\]]+\]/g, "").replace(/^\{(.+)\}$/gm, "\n$1").replace(/\n{3,}/g, "\n\n").trim();
