export type TuningType = 'high-g' | 'low-g' | 'baritone';

export interface StringNote {
  stringNumber: number; // 1 to 4
  name: string;        // 'G', 'C', 'E', 'A'
  solfege: string;    // 'ソ', 'ド', 'ミ', 'ラ'
  octave: number;     // e.g. 4
  frequency: number;  // target Hz at A4=440
  label: string;      // e.g. '4弦 - G4'
  position: 'top-left' | 'bottom-left' | 'bottom-right' | 'top-right'; // Headstock peg placement
}

export interface TuningPreset {
  id: TuningType;
  name: string;
  subName: string;
  description: string;
  strings: StringNote[];
}

export interface PitchDetectionResult {
  frequency: number;
  closestNote: string;
  closestString: StringNote | null;
  targetFrequency: number;
  centsDiff: number; // -50 to +50
  inTune: boolean;    // within +/- 3 cents
  volumeRms: number;
}
