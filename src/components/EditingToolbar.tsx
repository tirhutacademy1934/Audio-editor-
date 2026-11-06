import React, { useState } from 'react';
import {
  Scissors,
  Split,
  Layers,
  Crop,
  Copy,
  Clipboard,
  Trash2,
  CopyCheck,
  TrendingUp,
  TrendingDown,
  VolumeX,
  Volume2,
  Gauge,
  Sparkles,
  RotateCcw,
  Undo2,
  Redo2,
  Check,
} from 'lucide-react';
import { TimelineSelection } from '../types/audio';

interface EditingToolbarProps {
  hasSelection: boolean;
  hasSelectedClip: boolean;
  clipboardAvailable: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onCut: () => void;
  onSplit: () => void;
  onMerge: () => void;
  onTrim: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onFadeIn: () => void;
  onFadeOut: () => void;
  onMuteSelection: () => void;
  onAdjustVolume: (gainLinear: number) => void;
  onChangeSpeed: (multiplier: number) => void;
  onNormalize: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export const EditingToolbar: React.FC<EditingToolbarProps> = ({
  hasSelection,
  hasSelectedClip,
  clipboardAvailable,
  canUndo,
  canRedo,
  onCut,
  onSplit,
  onMerge,
  onTrim,
  onCopy,
  onPaste,
  onDelete,
  onDuplicate,
  onFadeIn,
  onFadeOut,
  onMuteSelection,
  onAdjustVolume,
  onChangeSpeed,
  onNormalize,
  onUndo,
  onRedo,
}) => {
  const [showVolumePopover, setShowVolumePopover] = useState(false);
  const [volumeGainDb, setVolumeGainDb] = useState(0);

  const [showSpeedPopover, setShowSpeedPopover] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);

  const handleApplyVolume = () => {
    const linearGain = Math.pow(10, volumeGainDb / 20);
    onAdjustVolume(linearGain);
    setShowVolumePopover(false);
  };

  const handleApplySpeed = () => {
    onChangeSpeed(speedMultiplier);
    setShowSpeedPopover(false);
  };

  const isEnabled = hasSelection || hasSelectedClip;

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-neutral-900 border border-neutral-800 rounded-xl select-none relative text-xs">
      {/* 1. CUT */}
      <button
        onClick={onCut}
        disabled={!isEnabled}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition-colors"
        title="Cut Selection (Ctrl+X)"
      >
        <Scissors className="w-3.5 h-3.5 text-purple-400" />
        <span className="font-medium">Cut</span>
      </button>

      {/* 2. SPLIT */}
      <button
        onClick={onSplit}
        disabled={!hasSelectedClip}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition-colors"
        title="Split Clip at Playhead (S)"
      >
        <Split className="w-3.5 h-3.5 text-indigo-400" />
        <span className="font-medium">Split</span>
      </button>

      {/* 3. MERGE */}
      <button
        onClick={onMerge}
        disabled={!hasSelectedClip}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition-colors"
        title="Merge Clips on Track (M)"
      >
        <Layers className="w-3.5 h-3.5 text-cyan-400" />
        <span className="font-medium">Merge</span>
      </button>

      {/* 4. TRIM */}
      <button
        onClick={onTrim}
        disabled={!hasSelection}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition-colors"
        title="Trim to Selection (T) - removes outside audio"
      >
        <Crop className="w-3.5 h-3.5 text-emerald-400" />
        <span className="font-medium">Trim</span>
      </button>

      {/* 5. COPY */}
      <button
        onClick={onCopy}
        disabled={!isEnabled}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition-colors"
        title="Copy Audio Selection (Ctrl+C)"
      >
        <Copy className="w-3.5 h-3.5 text-neutral-400" />
        <span className="font-medium">Copy</span>
      </button>

      {/* 6. PASTE */}
      <button
        onClick={onPaste}
        disabled={!clipboardAvailable}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition-colors"
        title="Paste Audio at Playhead (Ctrl+V)"
      >
        <Clipboard className="w-3.5 h-3.5 text-neutral-400" />
        <span className="font-medium">Paste</span>
      </button>

      {/* 7. DELETE */}
      <button
        onClick={onDelete}
        disabled={!isEnabled}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-neutral-300 hover:text-red-400 hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition-colors"
        title="Delete Selection or Clip (Del)"
      >
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
        <span className="font-medium">Delete</span>
      </button>

      {/* 8. DUPLICATE */}
      <button
        onClick={onDuplicate}
        disabled={!hasSelectedClip}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition-colors"
        title="Duplicate Clip (Ctrl+D)"
      >
        <CopyCheck className="w-3.5 h-3.5 text-indigo-400" />
        <span className="font-medium">Duplicate</span>
      </button>

      <div className="w-[1px] h-5 bg-neutral-800 mx-1 hidden sm:block" />

      {/* 10. FADE IN */}
      <button
        onClick={onFadeIn}
        disabled={!isEnabled}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition-colors"
        title="Fade In Selection"
      >
        <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-medium">Fade In</span>
      </button>

      {/* 11. FADE OUT */}
      <button
        onClick={onFadeOut}
        disabled={!isEnabled}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition-colors"
        title="Fade Out Selection"
      >
        <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-medium">Fade Out</span>
      </button>

      {/* 12. MUTE SELECTION */}
      <button
        onClick={onMuteSelection}
        disabled={!hasSelection}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition-colors"
        title="Mute Selection (Silence)"
      >
        <VolumeX className="w-3.5 h-3.5 text-neutral-400" />
        <span className="font-medium">Mute</span>
      </button>

      {/* 13. VOLUME ADJUSTMENT */}
      <div className="relative">
        <button
          onClick={() => setShowVolumePopover(!showVolumePopover)}
          disabled={!isEnabled}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition-colors"
          title="Adjust Volume Gain"
        >
          <Volume2 className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-medium">Volume</span>
        </button>

        {showVolumePopover && (
          <div className="absolute top-full left-0 mt-2 p-3 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-50 w-64 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-200">
              <span>Adjust Gain</span>
              <span className="font-mono text-purple-400">
                {volumeGainDb > 0 ? `+${volumeGainDb}` : volumeGainDb} dB
              </span>
            </div>
            <input
              type="range"
              min="-18"
              max="12"
              step="1"
              value={volumeGainDb}
              onChange={(e) => setVolumeGainDb(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-[10px] text-neutral-500">
              <span>-18 dB</span>
              <span>0 dB</span>
              <span>+12 dB</span>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowVolumePopover(false)}
                className="px-2.5 py-1 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyVolume}
                className="px-3 py-1 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-md"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 14. SPEED CHANGE */}
      <div className="relative">
        <button
          onClick={() => setShowSpeedPopover(!showSpeedPopover)}
          disabled={!hasSelectedClip}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition-colors"
          title="Change Speed / Duration"
        >
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-medium">Speed</span>
        </button>

        {showSpeedPopover && (
          <div className="absolute top-full left-0 mt-2 p-3 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-50 w-64 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-200">
              <span>Clip Speed</span>
              <span className="font-mono text-cyan-400">{speedMultiplier}x</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0.5, 0.75, 1.25, 1.5, 2.0].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeedMultiplier(s)}
                  className={`py-1 text-xs font-mono rounded ${
                    speedMultiplier === s
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowSpeedPopover(false)}
                className="px-2.5 py-1 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleApplySpeed}
                className="px-3 py-1 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-md"
              >
                Apply Speed
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 15. NORMALIZE */}
      <button
        onClick={onNormalize}
        disabled={!isEnabled}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition-colors"
        title="Normalize Audio Loudness (Peak 0 dBFS)"
      >
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span className="font-medium">Normalize</span>
      </button>

      {/* UNDO / REDO */}
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
