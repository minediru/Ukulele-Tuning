import { NOTE_NAMES, NOTE_NAMES_JA } from './constants';
import { PitchDetectionResult, StringNote } from '../types/tuner';

export class AudioPitchEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphoneStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private filterLow: BiquadFilterNode | null = null;
  private filterHigh: BiquadFilterNode | null = null;
  private buffer: Float32Array<ArrayBuffer> | null = null;
  private wakeLock: any = null;
  private activeToneOsc: OscillatorNode | null = null;
  private activeToneGain: GainNode | null = null;

  // Smoothing
  private lastPitch: number = 0;
  private pitchConfidence: number = 0;

  public async startMicrophone(): Promise<boolean> {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Request microphone with processing disabled for raw acoustic instrument sound
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.microphoneStream = stream;
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

      // Bandpass filtering (Keep ~100Hz to 1200Hz for Ukulele fundamental frequencies)
      this.filterLow = this.audioContext.createBiquadFilter();
      this.filterLow.type = 'highpass';
      this.filterLow.frequency.value = 100; // Cut low rumble, AC hum

      this.filterHigh = this.audioContext.createBiquadFilter();
      this.filterHigh.type = 'lowpass';
      this.filterHigh.frequency.value = 1200; // Cut high frequency whistle

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.buffer = new Float32Array(this.analyser.fftSize);

      this.sourceNode.connect(this.filterLow);
      this.filterLow.connect(this.filterHigh);
      this.filterHigh.connect(this.analyser);

      // Screen WakeLock API to keep display awake during tuning
      if ('wakeLock' in navigator) {
        try {
          this.wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch {
          // Ignore if blocked by browser policy
        }
      }

      return true;
    } catch (err) {
      console.error('Failed to access microphone or init audio:', err);
      return false;
    }
  }

  public stopMicrophone() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
        this.wakeLock = null;
      } catch {
        // ignore
      }
    }

    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach((track) => track.stop());
      this.microphoneStream = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.filterLow) {
      this.filterLow.disconnect();
      this.filterLow = null;
    }
    if (this.filterHigh) {
      this.filterHigh.disconnect();
      this.filterHigh = null;
    }
  }

  /**
   * Evaluates current buffer and returns pitch and closeness to target strings
   */
  public detectPitch(
    activeStrings: StringNote[],
    selectedString: StringNote | null = null,
    a4Reference: number = 440,
    noiseThreshold: number = 0.012
  ): PitchDetectionResult | null {
    if (!this.analyser || !this.buffer || !this.audioContext) {
      return null;
    }

    this.analyser.getFloatTimeDomainData(this.buffer);

    // Calculate RMS volume level
    let sumSquares = 0;
    const bufferLength = this.buffer.length;
    for (let i = 0; i < bufferLength; i++) {
      const val = this.buffer[i];
      sumSquares += val * val;
    }
    const rms = Math.sqrt(sumSquares / bufferLength);

    if (rms < noiseThreshold) {
      // Sound is too faint, return null or low volume indicator
      this.pitchConfidence = Math.max(0, this.pitchConfidence - 0.2);
      return {
        frequency: 0,
        closestNote: '-',
        closestString: selectedString,
        targetFrequency: selectedString ? this.calculateAdjustedTarget(selectedString.frequency, a4Reference) : 0,
        centsDiff: 0,
        inTune: false,
        volumeRms: rms,
      };
    }

    const sampleRate = this.audioContext.sampleRate;
    const rawPitch = this.computeAutocorrelationPitch(this.buffer, sampleRate);

    if (rawPitch <= 0 || rawPitch < 70 || rawPitch > 1100) {
      return {
        frequency: 0,
        closestNote: '-',
        closestString: selectedString,
        targetFrequency: selectedString ? this.calculateAdjustedTarget(selectedString.frequency, a4Reference) : 0,
        centsDiff: 0,
        inTune: false,
        volumeRms: rms,
      };
    }

    // Exponential smoothing for steady UI
    if (this.lastPitch === 0 || Math.abs(rawPitch - this.lastPitch) > 40) {
      this.lastPitch = rawPitch;
    } else {
      this.lastPitch = this.lastPitch * 0.4 + rawPitch * 0.6;
    }

    const currentPitch = this.lastPitch;

    // Closest general musical note name
    const { noteName, octave } = this.frequencyToNoteName(currentPitch, a4Reference);

    // Match with targeted ukulele string (or find closest from preset if in Auto mode)
    let closestString = selectedString;
    if (!closestString) {
      closestString = this.findClosestUkuleleString(currentPitch, activeStrings, a4Reference);
    }

    const targetFreq = this.calculateAdjustedTarget(closestString.frequency, a4Reference);
    // Cents difference: 1200 * log2(f / target)
    let centsDiff = 1200 * Math.log2(currentPitch / targetFreq);
    // Bound cents within -50 to +50 for gauge
    centsDiff = Math.max(-50, Math.min(50, centsDiff));

    const inTune = Math.abs(centsDiff) <= 3; // within +/- 3 cents is considered in tune

    return {
      frequency: Math.round(currentPitch * 10) / 10,
      closestNote: `${noteName}${octave}`,
      closestString,
      targetFrequency: Math.round(targetFreq * 10) / 10,
      centsDiff: Math.round(centsDiff),
      inTune,
      volumeRms: rms,
    };
  }

  /**
   * Refined Autocorrelation algorithm with parabolic peak interpolation
   */
  private computeAutocorrelationPitch(buffer: Float32Array, sampleRate: number): number {
    const minPeriod = Math.floor(sampleRate / 1050); // ~1050Hz (high E/A harmonic)
    const maxPeriod = Math.floor(sampleRate / 80);   // ~80Hz (sub-baritone)
    const bufferLength = buffer.length;

    let bestPeriod = -1;
    let bestCorrelation = -1;

    // Normalization factor at lag 0
    let sum0 = 0;
    for (let i = 0; i < bufferLength - maxPeriod; i++) {
      sum0 += buffer[i] * buffer[i];
    }
    if (sum0 < 0.0001) return -1;

    // Walk through lag periods
    const correlations = new Float32Array(maxPeriod + 1);

    for (let lag = minPeriod; lag <= maxPeriod; lag++) {
      let sum = 0;
      let sumLag = 0;
      for (let i = 0; i < bufferLength - maxPeriod; i++) {
        sum += buffer[i] * buffer[i + lag];
        sumLag += buffer[i + lag] * buffer[i + lag];
      }

      const norm = Math.sqrt(sum0 * sumLag);
      const corr = norm > 0 ? sum / norm : 0;
      correlations[lag] = corr;

      if (corr > 0.85 && corr > bestCorrelation) {
        bestCorrelation = corr;
        bestPeriod = lag;
      }
    }

    if (bestPeriod === -1 || bestCorrelation < 0.7) {
      // Find peak if standard threshold was slightly missed
      let localMax = 0;
      let localPeriod = -1;
      for (let lag = minPeriod + 1; lag < maxPeriod - 1; lag++) {
        if (correlations[lag] > correlations[lag - 1] && correlations[lag] > correlations[lag + 1]) {
          if (correlations[lag] > localMax) {
            localMax = correlations[lag];
            localPeriod = lag;
          }
        }
      }
      if (localMax > 0.72) {
        bestPeriod = localPeriod;
        bestCorrelation = localMax;
      } else {
        return -1;
      }
    }

    // Parabolic interpolation for sub-sample accuracy
    const k = bestPeriod;
    if (k > minPeriod && k < maxPeriod) {
      const y1 = correlations[k - 1];
      const y2 = correlations[k];
      const y3 = correlations[k + 1];

      const denominator = 2 * (2 * y2 - y1 - y3);
      if (Math.abs(denominator) > 0.00001) {
        const delta = (y3 - y1) / denominator;
        const refinedPeriod = k + delta;
        return sampleRate / refinedPeriod;
      }
    }

    return sampleRate / bestPeriod;
  }

  private calculateAdjustedTarget(freqAt440: number, a4Reference: number): number {
    return freqAt440 * (a4Reference / 440);
  }

  private findClosestUkuleleString(
    pitch: number,
    strings: StringNote[],
    a4Reference: number
  ): StringNote {
    let closest = strings[0];
    let minCentsDiff = Infinity;

    for (const str of strings) {
      const target = this.calculateAdjustedTarget(str.frequency, a4Reference);
      const diff = Math.abs(1200 * Math.log2(pitch / target));
      if (diff < minCentsDiff) {
        minCentsDiff = diff;
        closest = str;
      }
    }

    return closest;
  }

  private frequencyToNoteName(frequency: number, a4Reference: number) {
    const semitonesFromA4 = Math.round(12 * Math.log2(frequency / a4Reference));
    const noteIndex = ((semitonesFromA4 + 9) % 12 + 12) % 12; // 9 = A in C-major scale offset
    const noteName = NOTE_NAMES[noteIndex];
    const octave = Math.floor((semitonesFromA4 + 9) / 12) + 4;
    return { noteName, octave, solfege: NOTE_NAMES_JA[noteIndex] };
  }

  /**
   * Play clean reference tone using Web Audio oscillator
   * Sustained duration for tuning by ear
   */
  public playReferenceTone(frequency: number, durationSeconds: number = 6.6) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      // Soft warm acoustic tone (like nylon string)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

      // Lowpass filter to soften electronic harshness and sound organic
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.max(1200, frequency * 3.5), this.audioContext.currentTime);

      const now = this.audioContext.currentTime;

      // Stop any existing active tone smoothly
      if (this.activeToneGain && this.activeToneOsc) {
        try {
          this.activeToneGain.gain.cancelScheduledValues(now);
          this.activeToneGain.gain.setValueAtTime(this.activeToneGain.gain.value, now);
          this.activeToneGain.gain.linearRampToValueAtTime(0.0001, now + 0.05);
          this.activeToneOsc.stop(now + 0.06);
        } catch {
          // ignore
        }
      }

      gain.gain.setValueAtTime(0.0001, now);
      // Quick attack
      gain.gain.linearRampToValueAtTime(0.28, now + 0.06);
      // Sustain tone audibly for the player to tune
      gain.gain.setValueAtTime(0.22, now + durationSeconds * 0.85);
      // Gentle fade out at the end
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + durationSeconds + 0.05);

      this.activeToneOsc = osc;
      this.activeToneGain = gain;
    } catch (e) {
      console.error('Failed to play tone:', e);
    }
  }

  /**
   * Stop currently playing reference tone immediately
   */
  public stopReferenceTone() {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;
    if (this.activeToneGain && this.activeToneOsc) {
      try {
        this.activeToneGain.gain.cancelScheduledValues(now);
        this.activeToneGain.gain.setValueAtTime(this.activeToneGain.gain.value, now);
        this.activeToneGain.gain.linearRampToValueAtTime(0.0001, now + 0.04);
        this.activeToneOsc.stop(now + 0.05);
      } catch {
        // ignore
      }
      this.activeToneGain = null;
      this.activeToneOsc = null;
    }
  }

  /**
   * Play gentle, pleasant chime when tuning is perfectly in tune
   */
  public playSuccessSound() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;
      // Dual harmonious bell chime (C6 ~ 1046.5Hz & G6 ~ 1567.9Hz)
      const freqs = [1046.5, 1567.9];

      freqs.forEach((freq, idx) => {
        if (!this.audioContext) return;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.08 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.5);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.55);
      });
    } catch (e) {
      console.error('Failed to play success sound:', e);
    }
  }
}
