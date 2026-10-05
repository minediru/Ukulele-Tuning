/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Settings, Volume2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { TUNING_PRESETS } from './utils/constants';
import { TuningPreset, StringNote, PitchDetectionResult } from './types/tuner';
import { AudioPitchEngine } from './utils/audioPitchDetector';
import { TunerGauge } from './components/TunerGauge';
import { UkuleleHeadstock } from './components/UkuleleHeadstock';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  // Preset and tuning states
  const [currentPreset, setCurrentPreset] = useState<TuningPreset>(TUNING_PRESETS[0]); // Default High-G
  const [selectedString, setSelectedString] = useState<StringNote | null>(null); // null = Auto Mode
  const [isAutoMode, setIsAutoMode] = useState<boolean>(true);

  // App settings
  const [a4Reference, setA4Reference] = useState<number>(440);
  const [notationStyle, setNotationStyle] = useState<'alpha' | 'solfege'>('alpha');
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(true);
  const [soundFeedbackEnabled, setSoundFeedbackEnabled] = useState<boolean>(true);
  const [noiseThreshold, setNoiseThreshold] = useState<number>(0.015);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Audio Engine & Listening state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [pitchResult, setPitchResult] = useState<PitchDetectionResult | null>(null);
  const [playingStringNumber, setPlayingStringNumber] = useState<number | null>(null);

  const audioEngineRef = useRef<AudioPitchEngine | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVibrateTimeRef = useRef<number>(0);
  const lastSuccessSoundTimeRef = useRef<number>(0);
  const toneTimerRef = useRef<any>(null);

  // Initialize audio engine instance
  useEffect(() => {
    audioEngineRef.current = new AudioPitchEngine();
    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.stopMicrophone();
        audioEngineRef.current.stopReferenceTone();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (toneTimerRef.current) {
        clearTimeout(toneTimerRef.current);
      }
    };
  }, []);

  // Continuous pitch detection loop
  const runDetectionLoop = useCallback(() => {
    if (!audioEngineRef.current) return;

    const result = audioEngineRef.current.detectPitch(
      currentPreset.strings,
      isAutoMode ? null : selectedString,
      a4Reference,
      noiseThreshold
    );

    if (result) {
      setPitchResult(result);

      // Trigger pleasant success chime & soft vibration when perfectly in tune
      if (result.inTune) {
        const now = Date.now();

        // Success sound chime (throttled to once per 1.8 seconds)
        if (soundFeedbackEnabled && now - lastSuccessSoundTimeRef.current > 1800) {
          audioEngineRef.current.playSuccessSound();
          lastSuccessSoundTimeRef.current = now;
        }

        // Soft vibration on tuned target (throttled to once per 1.5 seconds)
        if (
          vibrationEnabled &&
          'vibrate' in navigator &&
          now - lastVibrateTimeRef.current > 1500
        ) {
          try {
            navigator.vibrate(50);
            lastVibrateTimeRef.current = now;
          } catch {
            // ignore if vibration fails
          }
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
  }, [currentPreset.strings, isAutoMode, selectedString, a4Reference, noiseThreshold, vibrationEnabled, soundFeedbackEnabled]);

  // Start listening to microphone
  const startTuner = async () => {
    setMicPermissionError(null);
    if (!audioEngineRef.current) {
      audioEngineRef.current = new AudioPitchEngine();
    }

    const success = await audioEngineRef.current.startMicrophone();
    if (success) {
      setIsListening(true);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
    } else {
      setMicPermissionError(
        'マイクへのアクセスが許可されませんでした。ブラウザの設定でマイクを「許可」にしてから再度お試しください。'
      );
      setIsListening(false);
    }
  };

  // Stop listening
  const stopTuner = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioEngineRef.current) {
      audioEngineRef.current.stopMicrophone();
      audioEngineRef.current.stopReferenceTone();
    }
    if (toneTimerRef.current) {
      clearTimeout(toneTimerRef.current);
      toneTimerRef.current = null;
    }
    setPlayingStringNumber(null);
    setIsListening(false);
    setPitchResult(null);
  };

  // Restart loop if active parameters change
  useEffect(() => {
    if (isListening) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
    }
  }, [isListening, runDetectionLoop]);

  // Play / Stop pitch pipe reference tone (toggle on re-click, 6.6s max duration)
  const handleToggleTone = (stringObj: StringNote) => {
    if (!audioEngineRef.current) return;

    // If this string's tone is already sounding, stop it immediately!
    if (playingStringNumber === stringObj.stringNumber) {
      audioEngineRef.current.stopReferenceTone();
      setPlayingStringNumber(null);
      if (toneTimerRef.current) {
        clearTimeout(toneTimerRef.current);
        toneTimerRef.current = null;
      }
      return;
    }

    // Clear previous timer if any
    if (toneTimerRef.current) {
      clearTimeout(toneTimerRef.current);
    }

    // Calculate reference pitch-adjusted tone
    const adjustedFreq = stringObj.frequency * (a4Reference / 440);
    audioEngineRef.current.playReferenceTone(adjustedFreq, 6.6);
    setPlayingStringNumber(stringObj.stringNumber);

    // Automatically reset state after tone completes (6.6s)
    toneTimerRef.current = setTimeout(() => {
      setPlayingStringNumber(null);
      toneTimerRef.current = null;
    }, 6600);
  };

  // Play all strings in sequence
  const handlePlayAllStrings = async () => {
    if (!audioEngineRef.current) return;

    // Stop single tone if playing
    if (toneTimerRef.current) {
      clearTimeout(toneTimerRef.current);
      toneTimerRef.current = null;
    }

    const sorted = [...currentPreset.strings].sort((a, b) => b.stringNumber - a.stringNumber); // 4, 3, 2, 1
    for (let i = 0; i < sorted.length; i++) {
      const str = sorted[i];
      setPlayingStringNumber(str.stringNumber);
      const adjustedFreq = str.frequency * (a4Reference / 440);
      audioEngineRef.current.playReferenceTone(adjustedFreq, 1.2);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    setPlayingStringNumber(null);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-['Zen_Kaku_Gothic_New',sans-serif] select-none overflow-x-hidden">
      {/* Top Header Bar */}
      <header className="w-full border-b border-stone-850 bg-stone-900/60 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans',sans-serif]">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-stone-950 text-sm font-bold shadow-md shadow-amber-600/30">
                U
              </span>
              ウクレレチューナー
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Tuning Preset Dropdown */}
            <select
              value={currentPreset.id}
              onChange={(e) => {
                const found = TUNING_PRESETS.find((p) => p.id === e.target.value);
                if (found) {
                  setCurrentPreset(found);
                  setSelectedString(null);
                  setIsAutoMode(true);
                }
              }}
              className="bg-stone-800 text-stone-200 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-stone-700 focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"
            >
              {TUNING_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl bg-stone-800/80 border border-stone-700/80 text-stone-300 hover:text-white hover:bg-stone-750 transition-colors cursor-pointer"
              title="チューナー設定"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Tuner Area */}
      <main className="flex-1 flex flex-col justify-between max-w-md w-full mx-auto px-4 py-3">
        {/* Permission Error Notification if blocked */}
        {micPermissionError && (
          <div className="mb-3 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 animate-in slide-in-from-top duration-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-rose-300 mb-0.5">マイクの許可が必要です</p>
              <p>{micPermissionError}</p>
            </div>
          </div>
        )}

        {/* Mode Switcher Tabs */}
        <div className="flex items-center justify-between bg-stone-900/90 p-1 rounded-2xl border border-stone-800/80 shadow-inner">
          <button
            onClick={() => {
              setIsAutoMode(true);
              setSelectedString(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isAutoMode
                ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            自動認識 (Auto)
          </button>
          <button
            onClick={() => {
              setIsAutoMode(false);
              if (!selectedString) {
                setSelectedString(currentPreset.strings[0]); // default to 4th string
              }
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              !isAutoMode
                ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            手動指定 (Manual)
          </button>
        </div>

        {/* Central Gauge and Note Guidance */}
        <section className="my-auto py-2">
          <TunerGauge
            pitchResult={pitchResult}
            notationStyle={notationStyle}
            isListening={isListening}
          />
        </section>

        {/* Ukulele Headstock & Interactive Pegs */}
        <section className="w-full">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[11px] font-semibold text-stone-400 tracking-wide uppercase">
              {currentPreset.name} (A4={a4Reference}Hz)
            </span>
            <button
              onClick={handlePlayAllStrings}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold cursor-pointer active:scale-95 transition-all"
              title="4弦から1弦まで順番に音を鳴らす"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>全弦を試聴</span>
            </button>
          </div>

          <UkuleleHeadstock
            strings={currentPreset.strings}
            selectedString={selectedString}
            activeString={pitchResult?.closestString || null}
            inTune={pitchResult?.inTune || false}
            centsDiff={pitchResult ? pitchResult.centsDiff : 50}
            notationStyle={notationStyle}
            playingStringNumber={playingStringNumber}
            onSelectString={(str) => {
              if (str === null) {
                setIsAutoMode(true);
                setSelectedString(null);
              } else {
                setIsAutoMode(false);
                setSelectedString(str);
              }
            }}
            onPlayTone={handleToggleTone}
            isAutoMode={isAutoMode}
          />

          {!isAutoMode && selectedString && (
            <div className="text-center mb-1">
              <button
                onClick={() => {
                  setIsAutoMode(true);
                  setSelectedString(null);
                }}
                className="text-xs text-amber-400/80 hover:text-amber-300 underline underline-offset-4 cursor-pointer"
              >
                ← 自動認識モードに戻す
              </button>
            </div>
          )}
        </section>

        {/* Bottom Main Action Button */}
        <footer className="pt-2 pb-4">
          {!isListening ? (
            <button
              onClick={startTuner}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-lg tracking-wider shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <Mic className="w-6 h-6 animate-bounce" />
              <span>チューナーを開始する</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={stopTuner}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white font-bold text-sm border border-stone-700/80 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <MicOff className="w-4 h-4 text-rose-400" />
                <span>一時停止</span>
              </button>
              <button
                onClick={() => {
                  setPitchResult(null);
                }}
                className="py-3.5 px-4 rounded-2xl bg-stone-800/60 hover:bg-stone-750 text-stone-400 hover:text-stone-200 border border-stone-700/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-sm"
                title="音の認識をリセット"
              >
                <RefreshCw className="w-4 h-4" />
                <span>リセット</span>
              </button>
            </div>
          )}

          {/* Quick usage tip */}
          <p className="text-[11px] text-center text-stone-500 mt-2">
            スマホをウクレレの近くに置き、合わせたい弦を「ポロン」と1本弾いてください
          </p>
        </footer>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        a4Reference={a4Reference}
        setA4Reference={setA4Reference}
        notationStyle={notationStyle}
        setNotationStyle={setNotationStyle}
        vibrationEnabled={vibrationEnabled}
        setVibrationEnabled={setVibrationEnabled}
        soundFeedbackEnabled={soundFeedbackEnabled}
        setSoundFeedbackEnabled={setSoundFeedbackEnabled}
        noiseThreshold={noiseThreshold}
        setNoiseThreshold={setNoiseThreshold}
      />
    </div>
  );
}
