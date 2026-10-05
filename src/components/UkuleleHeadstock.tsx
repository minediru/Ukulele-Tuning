import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { StringNote } from '../types/tuner';

interface UkuleleHeadstockProps {
  strings: StringNote[];
  selectedString: StringNote | null;
  activeString: StringNote | null; // Currently sounding string
  inTune: boolean;
  centsDiff?: number;
  notationStyle: 'alpha' | 'solfege';
  playingStringNumber: number | null;
  onSelectString: (stringNote: StringNote | null) => void;
  onPlayTone: (stringNote: StringNote) => void;
  isAutoMode: boolean;
}

export const UkuleleHeadstock: React.FC<UkuleleHeadstockProps> = ({
  strings,
  selectedString,
  activeString,
  inTune,
  centsDiff = 50,
  notationStyle,
  playingStringNumber,
  onSelectString,
  onPlayTone,
  isAutoMode,
}) => {
  const isVeryClose = !inTune && Math.abs(centsDiff) <= 7;

  // Ordered strictly from 4th string down to 1st string (natural ukulele order)
  const stringOrder = [4, 3, 2, 1];
  const sortedStrings = stringOrder
    .map((num) => strings.find((s) => s.stringNumber === num))
    .filter((s): s is StringNote => !!s);

  const renderStringCard = (strObj: StringNote) => {
    const isTarget = isAutoMode
      ? activeString?.stringNumber === strObj.stringNumber
      : selectedString?.stringNumber === strObj.stringNumber;

    const isStringInTune = isTarget && inTune;
    const isStringVeryClose = isTarget && isVeryClose;
    const noteLabel = notationStyle === 'solfege' ? strObj.solfege : strObj.name;
    const isPlayingThis = playingStringNumber === strObj.stringNumber;

    return (
      <div
        key={strObj.stringNumber}
        className={`relative flex items-center justify-between p-2.5 rounded-2xl border-2 transition-all duration-200 shadow-sm ${
          isStringInTune
            ? 'bg-emerald-950/40 border-emerald-400/80 shadow-[0_0_15px_rgba(52,211,153,0.3)] ring-1 ring-emerald-500/40'
            : isStringVeryClose
            ? 'bg-lime-950/40 border-lime-400/70 shadow-[0_0_12px_rgba(163,230,53,0.25)]'
            : isTarget
            ? 'bg-amber-950/30 border-amber-500/70 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
            : 'bg-stone-900/80 border-stone-850 hover:border-stone-700 hover:bg-stone-850/90'
        }`}
      >
        {/* Main string select button */}
        <button
          onClick={() => {
            if (isAutoMode) {
              onSelectString(strObj);
            } else {
              if (selectedString?.stringNumber === strObj.stringNumber) {
                onSelectString(null); // Return to auto
              } else {
                onSelectString(strObj);
              }
            }
          }}
          className="flex-1 flex items-center gap-3 text-left cursor-pointer focus:outline-none"
          title={`${strObj.label}を選択`}
        >
          {/* String Number Badge */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs transition-colors shrink-0 ${
              isStringInTune
                ? 'bg-emerald-500 text-stone-950 shadow-sm'
                : isStringVeryClose
                ? 'bg-lime-400 text-stone-950 shadow-sm'
                : isTarget
                ? 'bg-amber-400 text-stone-950 shadow-sm'
                : 'bg-stone-800 text-stone-300'
            }`}
          >
            {strObj.stringNumber}弦
          </div>

          {/* Note Name & Frequency */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-black transition-colors ${
                isStringInTune
                  ? 'text-emerald-300'
                  : isStringVeryClose
                  ? 'text-lime-300'
                  : isTarget
                  ? 'text-amber-200'
                  : 'text-stone-100'
              }`}>
                {noteLabel}
              </span>
              <span className="text-xs font-bold text-stone-400">{strObj.octave}</span>
            </div>
            <span className="text-[11px] font-mono text-stone-400">
              {strObj.frequency.toFixed(1)} Hz
            </span>
          </div>
        </button>

        {/* Listen / Stop Speaker Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlayTone(strObj);
          }}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-sm active:scale-90 ml-1.5 ${
            isPlayingThis
              ? 'bg-amber-400 text-stone-950 border-amber-300 ring-2 ring-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.5)] scale-105'
              : 'bg-stone-800/90 border-stone-700/80 text-stone-400 hover:text-amber-300 hover:border-amber-500/40 hover:bg-stone-750'
          }`}
          title={
            isPlayingThis
              ? `${strObj.label}の音を止める（再タップ）`
              : `${strObj.label}（${strObj.frequency}Hz）の基準音を聴く`
          }
        >
          {isPlayingThis ? (
            <VolumeX className="w-4 h-4 animate-pulse" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>

        {/* In-tune pill badge indicator */}
        {isStringInTune && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-md mx-auto my-2 flex flex-col items-center">
      {/* 4 Strings Grid: 4弦(G), 3弦(C), 2弦(E), 1弦(A) */}
      <div className="w-full grid grid-cols-2 gap-2.5 px-1 py-1">
        {sortedStrings.map((str) => renderStringCard(str))}
      </div>
    </div>
  );
};
