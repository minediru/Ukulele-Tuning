import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { PitchDetectionResult } from '../types/tuner';

interface TunerGaugeProps {
  pitchResult: PitchDetectionResult | null;
  notationStyle: 'alpha' | 'solfege';
  isListening: boolean;
}

export const TunerGauge: React.FC<TunerGaugeProps> = ({
  pitchResult,
  notationStyle,
  isListening,
}) => {
  const hasSignal = pitchResult && pitchResult.frequency > 0 && pitchResult.closestString;
  const cents = hasSignal ? pitchResult.centsDiff : 0;
  const absCents = Math.abs(cents);
  const inTune = hasSignal && pitchResult.inTune;

  // Proximity stage classification
  // 0: in-tune (|cents| <= 3)
  // 1: very-close (3 < |cents| <= 7)
  // 2: close (7 < |cents| <= 16)
  // 3: far (|cents| > 16)
  const proximityStage = !hasSignal
    ? 'idle'
    : inTune
    ? 'in-tune'
    : absCents <= 7
    ? 'very-close'
    : absCents <= 16
    ? 'close'
    : 'far';

  // Rotation angle for needle: -50 cents = -45 deg, +50 cents = +45 deg
  const needleRotation = Math.max(-45, Math.min(45, (cents / 50) * 45));

  // Determine guidance status text and colors
  let statusText = '弦を1本ポロンと弾いてください';
  let subStatusText = '';
  let statusBadgeStyle = 'bg-stone-900/60 border-stone-800 text-stone-400';
  let needleColor = '#78716c';

  if (!isListening) {
    statusText = '開始ボタンを押してチューニングを始めます';
    subStatusText = 'マイクをオンにしてください';
  } else if (hasSignal) {
    if (inTune) {
      statusText = 'ぴったり！合いました';
      subStatusText = 'チューニング完了です✨';
      statusBadgeStyle = 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.3)] ring-1 ring-emerald-500/30';
      needleColor = '#34d399';
    } else if (cents < 0) {
      // Flat (Lower than target)
      if (proximityStage === 'very-close') {
        statusText = 'あと一息！ほんの少し巻いて';
        subStatusText = `目標まで あと ${Math.abs(cents)}¢（ごくわずか低い）`;
        statusBadgeStyle = 'bg-lime-950/80 border-lime-500/50 text-lime-300 shadow-[0_0_15px_rgba(163,230,53,0.25)]';
        needleColor = '#a3e635';
      } else if (proximityStage === 'close') {
        statusText = '近づいてきました！ゆっくり巻いて';
        subStatusText = `目標まで あと ${Math.abs(cents)}¢（少し低い）`;
        statusBadgeStyle = 'bg-amber-950/80 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
        needleColor = '#facc15';
      } else {
        statusText = '低い（ペグを巻いて音を上げて）';
        subStatusText = `${Math.abs(cents)}¢ 低い状態です`;
        statusBadgeStyle = 'bg-amber-950/60 border-amber-600/40 text-amber-400';
        needleColor = '#f97316';
      }
    } else {
      // Sharp (Higher than target)
      if (proximityStage === 'very-close') {
        statusText = 'あと一息！ほんの少し緩めて';
        subStatusText = `目標まで あと ${Math.abs(cents)}¢（ごくわずか高い）`;
        statusBadgeStyle = 'bg-lime-950/80 border-lime-500/50 text-lime-300 shadow-[0_0_15px_rgba(163,230,53,0.25)]';
        needleColor = '#a3e635';
      } else if (proximityStage === 'close') {
        statusText = '近づいてきました！ゆっくり緩めて';
        subStatusText = `目標まで あと ${Math.abs(cents)}¢（少し高い）`;
        statusBadgeStyle = 'bg-amber-950/80 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
        needleColor = '#facc15';
      } else {
        statusText = '高い（ペグを緩めて音を下げて）';
        subStatusText = `${Math.abs(cents)}¢ 高い状態です`;
        statusBadgeStyle = 'bg-rose-950/60 border-rose-600/40 text-rose-400';
        needleColor = '#f43f5e';
      }
    }
  }

  // Display note
  const stringObj = pitchResult?.closestString;
  const displayNote = stringObj
    ? (notationStyle === 'solfege' ? stringObj.solfege : stringObj.name)
    : '-';
  const displayOctave = stringObj ? stringObj.octave : '';
  const stringLabel = stringObj ? `${stringObj.stringNumber}弦` : '未検出';

  // LED proximity steps from negative (flat) to positive (sharp)
  // Left: [-25, -15, -8, -4] | Center: [0] | Right: [+4, +8, +15, +25]
  const leftSteps = [-25, -15, -8, -4];
  const rightSteps = [4, 8, 15, 25];

  return (
    <div className="relative w-full max-w-md mx-auto flex flex-col items-center">
      {/* Background Proximity Ambient Aura Glow */}
      {hasSignal && (
        <div
          className={`absolute -top-6 w-72 h-44 rounded-full blur-3xl pointer-events-none transition-all duration-300 ${
            inTune
              ? 'bg-emerald-500/25 scale-110'
              : proximityStage === 'very-close'
              ? 'bg-lime-500/20 scale-105'
              : proximityStage === 'close'
              ? 'bg-amber-500/15'
              : 'bg-stone-700/10'
          }`}
        />
      )}

      {/* Target Note Display Box */}
      <div className="relative flex flex-col items-center justify-center my-1 z-10 w-full">
        {/* Top String & Target Spec Bar */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className={`px-3 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-200 border ${
            inTune
              ? 'bg-emerald-900/90 text-emerald-200 border-emerald-500/40'
              : proximityStage === 'very-close'
              ? 'bg-lime-900/80 text-lime-200 border-lime-500/40'
              : 'bg-stone-800/90 text-amber-300 border-amber-500/20'
          }`}>
            {hasSignal ? stringLabel : '弦を待機中'}
          </span>
          {hasSignal && (
            <span className="text-xs text-stone-400 font-mono bg-stone-900/70 px-2 py-0.5 rounded-md border border-stone-800">
              目標: <span className="text-stone-200 font-semibold">{pitchResult?.targetFrequency}</span> Hz
            </span>
          )}
        </div>

        {/* Note Name with Proximity Arrows */}
        <div className="relative flex items-center justify-center w-full my-1">
          {/* Left Arrow Direction Indicator (Lights up when Flat - Tune Up) */}
          <div className="flex items-center gap-0.5 px-3">
            {hasSignal && cents < -3 && (
              <motion.div
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center"
              >
                <ChevronRight
                  className={`w-6 h-6 transition-colors ${
                    proximityStage === 'very-close'
                      ? 'text-lime-400 animate-pulse'
                      : proximityStage === 'close'
                      ? 'text-amber-400'
                      : 'text-amber-500/60'
                  }`}
                />
                <ChevronRight
                  className={`w-6 h-6 -ml-3 transition-colors ${
                    proximityStage === 'very-close'
                      ? 'text-lime-400'
                      : proximityStage === 'close'
                      ? 'text-amber-400'
                      : 'opacity-40 text-stone-600'
                  }`}
                />
              </motion.div>
            )}
          </div>

          {/* Large Note Name */}
          <div className="relative flex items-baseline justify-center">
            <motion.div
              key={displayNote + displayOctave}
              initial={{ scale: 0.95, opacity: 0.8 }}
              animate={{
                scale: inTune ? 1.1 : proximityStage === 'very-close' ? 1.05 : 1,
                opacity: 1,
              }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`text-7xl sm:text-8xl font-black tracking-tight select-none transition-colors duration-200 ${
                inTune
                  ? 'text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.7)]'
                  : proximityStage === 'very-close'
                  ? 'text-lime-300 drop-shadow-[0_0_20px_rgba(163,230,53,0.5)]'
                  : proximityStage === 'close'
                  ? 'text-amber-200'
                  : hasSignal
                  ? 'text-white'
                  : 'text-stone-600'
              }`}
            >
              {displayNote}
            </motion.div>
            {hasSignal && (
              <span className={`text-2xl font-bold ml-1 transition-colors ${
                inTune ? 'text-emerald-400' : proximityStage === 'very-close' ? 'text-lime-400' : 'text-stone-400'
              }`}>
                {displayOctave}
              </span>
            )}
          </div>

          {/* Right Arrow Direction Indicator (Lights up when Sharp - Tune Down) */}
          <div className="flex items-center gap-0.5 px-3">
            {hasSignal && cents > 3 && (
              <motion.div
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center"
              >
                <ChevronLeft
                  className={`w-6 h-6 transition-colors ${
                    proximityStage === 'very-close'
                      ? 'text-lime-400'
                      : proximityStage === 'close'
                      ? 'text-amber-400'
                      : 'opacity-40 text-stone-600'
                  }`}
                />
                <ChevronLeft
                  className={`w-6 h-6 -ml-3 transition-colors ${
                    proximityStage === 'very-close'
                      ? 'text-lime-400 animate-pulse'
                      : proximityStage === 'close'
                      ? 'text-amber-400'
                      : 'text-rose-500/60'
                  }`}
                />
              </motion.div>
            )}
          </div>
        </div>

        {/* Realtime Measured Frequency & Live Cent Difference Badge */}
        <div className="h-7 flex items-center justify-center gap-2 mt-0.5">
          {hasSignal ? (
            <>
              <span className="font-mono text-sm tracking-wider text-stone-300">
                {pitchResult.frequency.toFixed(1)} <span className="text-stone-500">Hz</span>
              </span>
              <span
                className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded-full border transition-all duration-200 ${
                  inTune
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-400/60 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                    : proximityStage === 'very-close'
                    ? 'bg-lime-950 text-lime-300 border-lime-400/50 shadow-[0_0_8px_rgba(163,230,53,0.3)]'
                    : proximityStage === 'close'
                    ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                    : cents < 0
                    ? 'bg-stone-800 text-amber-400 border-stone-700'
                    : 'bg-stone-800 text-rose-400 border-stone-700'
                }`}
              >
                {cents > 0 ? `+${cents}` : cents}¢
              </span>
            </>
          ) : (
            <span className="text-xs text-stone-500 font-medium">音を待機中...</span>
          )}
        </div>
      </div>

      {/* NEW: Precision Approach LED Dots Strip */}
      {/* Lights up progressively towards the center target as the player approaches the right note */}
      <div className="w-full max-w-[300px] mt-1 mb-1 px-3 py-1.5 rounded-2xl bg-stone-900/90 border border-stone-800/80 flex items-center justify-between shadow-inner">
        <span className="text-[10px] font-bold text-amber-500/70 mr-1 select-none">♭ 低い</span>

        {/* Left approach dots (Flat) */}
        <div className="flex items-center gap-1.5">
          {leftSteps.map((step) => {
            // Dot turns on when pitch is within this step towards 0
            const isActive = hasSignal && cents < -3 && cents >= step;
            const isVeryClose = hasSignal && cents < -3 && Math.abs(cents) <= 7;
            return (
              <div
                key={step}
                className={`h-2.5 rounded-full transition-all duration-150 ${
                  step === -4 ? 'w-3.5' : 'w-2.5'
                } ${
                  isActive
                    ? isVeryClose
                      ? 'bg-lime-400 shadow-[0_0_8px_#a3e635]'
                      : 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
                    : 'bg-stone-800 border border-stone-750'
                }`}
              />
            );
          })}
        </div>

        {/* Center Target Sweet Spot LED (Largest) */}
        <div className="flex items-center justify-center px-1">
          <div
            className={`transition-all duration-200 rounded-full flex items-center justify-center ${
              inTune
                ? 'w-5 h-5 bg-emerald-400 shadow-[0_0_15px_#34d399] ring-2 ring-emerald-300'
                : proximityStage === 'very-close'
                ? 'w-4 h-4 bg-lime-400/80 shadow-[0_0_10px_#a3e635] animate-pulse'
                : 'w-3 h-3 bg-stone-700 border border-stone-600'
            }`}
          >
            {inTune && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
        </div>

        {/* Right approach dots (Sharp) */}
        <div className="flex items-center gap-1.5">
          {rightSteps.map((step) => {
            // Dot turns on when pitch is within this step towards 0
            const isActive = hasSignal && cents > 3 && cents <= step;
            const isVeryClose = hasSignal && cents > 3 && Math.abs(cents) <= 7;
            return (
              <div
                key={step}
                className={`h-2.5 rounded-full transition-all duration-150 ${
                  step === 4 ? 'w-3.5' : 'w-2.5'
                } ${
                  isActive
                    ? isVeryClose
                      ? 'bg-lime-400 shadow-[0_0_8px_#a3e635]'
                      : 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
                    : 'bg-stone-800 border border-stone-750'
                }`}
              />
            );
          })}
        </div>

        <span className="text-[10px] font-bold text-rose-500/70 ml-1 select-none">高い ♯</span>
      </div>

      {/* Modern Circular/Semi-Arc Gauge Container */}
      <div className="relative w-full aspect-[2/1] max-w-[340px] mt-1 flex items-center justify-center overflow-hidden">
        {/* Glow behind inTune */}
        {inTune && (
          <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
        )}

        {/* Gauge Arc SVG */}
        <svg viewBox="0 0 200 110" className="w-full h-full select-none">
          <defs>
            <linearGradient id="gaugeGradientNew" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="30%" stopColor="#eab308" />
              <stop offset="44%" stopColor="#a3e635" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="56%" stopColor="#a3e635" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>

            {/* Precision green target zone highlight */}
            <linearGradient id="sweetZoneGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Sweet Spot Precision Zone Sector Highlight (±10 cents = ±9 degrees) */}
          <path
            d="M 91 26 A 75 75 0 0 1 109 26 L 100 100 Z"
            fill="url(#sweetZoneGlow)"
            opacity={hasSignal && absCents <= 12 ? 0.9 : 0.25}
            className="transition-opacity duration-300"
          />

          {/* Background Track */}
          <path
            d="M 25 100 A 75 75 0 0 1 175 100"
            fill="none"
            stroke="#292524"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Precision Sweet Zone border arc */}
          <path
            d="M 87 26.5 A 75 75 0 0 1 113 26.5"
            fill="none"
            stroke="#34d399"
            strokeWidth="8"
            strokeLinecap="round"
            opacity={inTune ? 1 : proximityStage === 'very-close' ? 0.8 : 0.35}
          />

          {/* Active colored arc track */}
          <path
            d="M 25 100 A 75 75 0 0 1 175 100"
            fill="none"
            stroke="url(#gaugeGradientNew)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="4 2.5"
            opacity={hasSignal ? 0.95 : 0.35}
          />

          {/* Center Sweet Spot Target Marker */}
          <circle
            cx="100"
            cy="25"
            r={inTune ? "5.5" : proximityStage === 'very-close' ? "5" : "4"}
            fill={inTune ? "#34d399" : proximityStage === 'very-close' ? "#a3e635" : "#57534e"}
            className="transition-all duration-200"
          />
          <line
            x1="100"
            y1="25"
            x2="100"
            y2="38"
            stroke={inTune ? "#34d399" : proximityStage === 'very-close' ? "#a3e635" : "#78716c"}
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Scale tick marks */}
          {[-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50].map((val) => {
            const angleDeg = (val / 50) * 45;
            const angleRad = ((angleDeg - 90) * Math.PI) / 180;
            const rOuter = 82;
            const rInner = val % 20 === 0 ? 71 : val === 0 ? 70 : 75;
            const x1 = 100 + rOuter * Math.cos(angleRad);
            const y1 = 100 + rOuter * Math.sin(angleRad);
            const x2 = 100 + rInner * Math.cos(angleRad);
            const y2 = 100 + rInner * Math.sin(angleRad);

            const isCenter = val === 0;
            const isNear = Math.abs(val) === 10;

            let tickStroke = '#44403c';
            let strokeW = 1.5;

            if (isCenter) {
              tickStroke = inTune ? '#34d399' : proximityStage === 'very-close' ? '#a3e635' : '#a8a29e';
              strokeW = 3;
            } else if (isNear) {
              tickStroke = '#84cc16';
              strokeW = 2;
            }

            return (
              <line
                key={val}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={tickStroke}
                strokeWidth={strokeW}
                strokeLinecap="round"
              />
            );
          })}

          {/* Gauge Needle Pointer */}
          <g
            style={{
              transformOrigin: '100px 100px',
              transform: `rotate(${hasSignal ? needleRotation : 0}deg)`,
              transition: 'transform 0.1s cubic-bezier(0.2, 0.9, 0.35, 1.05)',
            }}
          >
            {/* Soft Shadow line */}
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="17"
              stroke="#0c0a09"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.6"
            />
            {/* Main needle */}
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="17"
              stroke={needleColor}
              strokeWidth={inTune ? 4 : 3.5}
              strokeLinecap="round"
              className="transition-colors duration-150"
            />
            {/* Center Pivot Point */}
            <circle cx="100" cy="100" r="8" fill="#1c1917" stroke="#44403c" strokeWidth="2" />
            <circle
              cx="100"
              cy="100"
              r="4"
              fill={needleColor}
              className="transition-colors duration-150"
            />
          </g>
        </svg>

        {/* Flat / Sharp Labels */}
        <div className="absolute left-6 bottom-1 flex items-center gap-1 text-xs font-bold text-amber-500/80">
          <span>♭</span>
          <span>低</span>
        </div>
        <div className="absolute right-6 bottom-1 flex items-center gap-1 text-xs font-bold text-rose-500/80">
          <span>高</span>
          <span>♯</span>
        </div>
      </div>

      {/* Helpful Two-Line Action Guidance Banner */}
      <div
        className={`mt-1.5 w-full flex flex-col items-center justify-center px-4 py-2 rounded-2xl border backdrop-blur-sm transition-all duration-200 ${statusBadgeStyle}`}
      >
        <div className="flex items-center justify-center gap-1.5 font-bold text-sm sm:text-base">
          {inTune ? (
            <Sparkles className="w-4 h-4 text-emerald-300 animate-spin" />
          ) : proximityStage === 'very-close' ? (
            <span className="text-lime-300 text-xs px-1.5 py-0.5 rounded bg-lime-950 font-bold border border-lime-500/40">
              あと少し
            </span>
          ) : null}
          <span>{statusText}</span>
        </div>

        {subStatusText && (
          <span className="text-xs opacity-80 mt-0.5 font-medium tracking-wide">
            {subStatusText}
          </span>
        )}
      </div>
    </div>
  );
};
