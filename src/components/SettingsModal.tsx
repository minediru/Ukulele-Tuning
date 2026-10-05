import React from 'react';
import { X, Sliders, Music, HelpCircle, Vibrate, Volume2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  a4Reference: number;
  setA4Reference: (val: number) => void;
  notationStyle: 'alpha' | 'solfege';
  setNotationStyle: (val: 'alpha' | 'solfege') => void;
  vibrationEnabled: boolean;
  setVibrationEnabled: (val: boolean) => void;
  soundFeedbackEnabled: boolean;
  setSoundFeedbackEnabled: (val: boolean) => void;
  noiseThreshold: number;
  setNoiseThreshold: (val: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  a4Reference,
  setA4Reference,
  notationStyle,
  setNotationStyle,
  vibrationEnabled,
  setVibrationEnabled,
  soundFeedbackEnabled,
  setSoundFeedbackEnabled,
  noiseThreshold,
  setNoiseThreshold,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/80">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-stone-100">チューナー設定 & ガイド</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Reference Pitch */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-stone-200 flex items-center gap-2">
                <Music className="w-4 h-4 text-amber-400" />
                基準ピッチ (A4)
              </label>
              <span className="font-mono text-sm font-bold text-amber-400">
                {a4Reference} Hz
              </span>
            </div>
            <p className="text-xs text-stone-400">
              通常の演奏は440Hzです。オーケストラやピアノ等に合わせる場合は442Hzなどに調整してください。
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setA4Reference(Math.max(430, a4Reference - 1))}
                className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 text-stone-200 font-bold hover:bg-stone-700 active:scale-95 transition-all"
              >
                -
              </button>
              <input
                type="range"
                min="430"
                max="450"
                step="1"
                value={a4Reference}
                onChange={(e) => setA4Reference(Number(e.target.value))}
                className="flex-1 accent-amber-500 cursor-pointer h-2 bg-stone-800 rounded-lg"
              />
              <button
                onClick={() => setA4Reference(Math.min(450, a4Reference + 1))}
                className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 text-stone-200 font-bold hover:bg-stone-700 active:scale-95 transition-all"
              >
                +
              </button>
            </div>
            <div className="flex gap-2 pt-1">
              {[440, 442, 444].map((hz) => (
                <button
                  key={hz}
                  onClick={() => setA4Reference(hz)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    a4Reference === hz
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                      : 'bg-stone-800/80 border-stone-700 text-stone-400 hover:text-stone-300'
                  }`}
                >
                  {hz} Hz
                </button>
              ))}
            </div>
          </div>

          <hr className="border-stone-800" />

          {/* Notation Style */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-200 block">
              音名の表示形式
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setNotationStyle('alpha')}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold flex flex-col items-center gap-1 transition-all ${
                  notationStyle === 'alpha'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm'
                    : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:text-stone-300'
                }`}
              >
                <span>英語表記 (G - C - E - A)</span>
                <span className="text-[11px] opacity-70">世界標準</span>
              </button>
              <button
                onClick={() => setNotationStyle('solfege')}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold flex flex-col items-center gap-1 transition-all ${
                  notationStyle === 'solfege'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm'
                    : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:text-stone-300'
                }`}
              >
                <span>ドレミ表記 (ソ - ド - ミ - ラ)</span>
                <span className="text-[11px] opacity-70">分かりやすい日本語</span>
              </button>
            </div>
          </div>

          <hr className="border-stone-800" />

          {/* Vibration and Mic Sensitivity */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Vibrate className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-sm font-semibold text-stone-200 block">
                    ピッチ合致時のバイブレーション
                  </span>
                  <span className="text-xs text-stone-400 block">
                    チューニングが合った瞬間にスマホが振動します（対応端末のみ）
                  </span>
                </div>
              </div>
              <button
                onClick={() => setVibrationEnabled(!vibrationEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  vibrationEnabled ? 'bg-emerald-500' : 'bg-stone-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    vibrationEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="text-sm font-semibold text-stone-200 block">
                    ピッチ合致時のサウンド通知
                  </span>
                  <span className="text-xs text-stone-400 block">
                    チューニングが合った瞬間に「ピン♪」と澄んだ完了音が鳴ります
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSoundFeedbackEnabled(!soundFeedbackEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  soundFeedbackEnabled ? 'bg-amber-500' : 'bg-stone-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    soundFeedbackEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-200">
                  マイク感度（ノイズ抑制）
                </span>
                <span className="text-xs text-stone-400 font-mono">
                  {noiseThreshold === 0.008 ? '高感度' : noiseThreshold === 0.015 ? '標準' : 'ノイズ低減'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '高感度', val: 0.008, desc: '静かな部屋' },
                  { label: '標準', val: 0.015, desc: '日常環境' },
                  { label: 'ノイズ低減', val: 0.03, desc: '周囲が騒がしい時' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setNoiseThreshold(item.val)}
                    className={`py-2 px-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-0.5 transition-all ${
                      noiseThreshold === item.val
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:text-stone-300'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] opacity-60">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <hr className="border-stone-800" />

          {/* Quick Guide */}
          <div className="p-4 rounded-2xl bg-stone-800/50 border border-stone-800 space-y-3">
            <div className="flex items-center gap-2 text-stone-200 font-semibold text-sm">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>ウクレレの音の高さ（周波数）について</span>
            </div>

            <div className="text-xs text-stone-300 space-y-2">
              <p className="leading-relaxed">
                一般的なウクレレ（スタンダード High-G）は、<strong>4弦（G4: 392Hz）が3弦（C4: 261.6Hz）よりも高い音</strong>になる特殊な調弦（リエントラント）になっています。
              </p>
              <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 text-[11px] font-mono space-y-1">
                <div className="flex justify-between text-amber-300">
                  <span>・4弦 (G4: ソ)</span>
                  <span>392.0 Hz（高め）</span>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>・3弦 (C4: ド)</span>
                  <span>261.6 Hz（一番低い）</span>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>・2弦 (E4: ミ)</span>
                  <span>329.6 Hz</span>
                </div>
                <div className="flex justify-between text-emerald-300">
                  <span>・1弦 (A4: ラ)</span>
                  <span>440.0 Hz（一番高い）</span>
                </div>
              </div>
              <p className="text-[11px] text-stone-400">
                ※4弦が太い弦（Low-G弦: 196Hz）をお使いの場合は、ヘッダーのプリセットで「Low-G」を選択してください。
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-900">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-stone-950 font-bold transition-all shadow-lg cursor-pointer"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  );
};
