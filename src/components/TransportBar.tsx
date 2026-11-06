import React from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  SkipBack,
  SkipForward,
  Repeat,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatTime } from '../utils/audioContext';
import { TimelineSelection } from '../types/audio';

interface TransportBarProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  selection: TimelineSelection | null;
  playbackRate: number;
  masterVolume: number;
  isLooping: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onReturnToZero: () => void;
  onToggleLoop: () => void;
  onChangePlaybackRate: (rate: number) => void;
  onChangeMasterVolume: (vol: number) => void;
  onUndo: () => void;
  onRedo: () => void;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  isPlaying,
  currentTime,
  duration,
  selection,
  playbackRate,
  masterVolume,
  isLooping,
  canUndo,
  canRedo,
  onPlay,
  onPause,
  onStop,
  onSkipBackward,
  onSkipForward,
  onReturnToZero,
  onToggleLoop,
  onChangePlaybackRate,
  onChangeMasterVolume,
  onUndo,
  onRedo,
}) => {
  const rates = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl select-none">
      {/* Left: Time Counters */}
      <div className="flex items-center gap-4">
        <div className="bg-neutral-950 px-3.5 py-1.5 rounded-lg border border-neutral-800/80 flex items-center gap-2">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-semibold">
              Current Time
            </span>
            <span className="font-mono text-base md:text-lg font-bold text-purple-400 tabular-nums">
              {formatTime(currentTime)}
            </span>
          </div>

          <span className="text-neutral-700 text-lg">/</span>

          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-semibold">
              Duration
            </span>
            <span className="font-mono text-sm md:text-base font-semibold text-neutral-300 tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Selection Stats */}
        <div className="hidden xl:flex flex-col text-xs text-neutral-400">
          <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-semibold">
            Selection
          </span>
          {selection && selection.end > selection.start ? (
            <span className="font-mono text-neutral-200 tabular-nums">
              {formatTime(selection.start, false)} → {formatTime(selection.end, false)} ({((selection.end - selection.start)).toFixed(2)}s)
            </span>
          ) : (
            <span className="text-neutral-400 italic">None (Drag to select)</span>
          )}
        </div>
      </div>

      {/* Center: Main Transport Playback Controls */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Return to Zero */}
        <button
          onClick={onReturnToZero}
          className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          title="Return to Zero (Home)"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {/* Jump Backward 5s */}
        <button
          onClick={onSkipBackward}
          className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors text-xs font-mono font-medium"
          title="Jump Back 5s (Left Arrow)"
        >
          -5s
        </button>

        {/* Main Play / Pause Button */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          className="w-11 h-11 rounded-full bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white flex items-center justify-center shadow-md shadow-purple-600/30 transition-all hover:scale-105"
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-white" />
          ) : (
            <Play className="w-5 h-5 fill-white ml-0.5" />
          )}
        </button>

        {/* Stop Button */}
        <button
          onClick={onStop}
          className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          title="Stop Playback"
        >
          <Square className="w-4 h-4" />
        </button>

        {/* Jump Forward 5s */}
        <button
          onClick={onSkipForward}
          className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors text-xs font-mono font-medium"
          title="Jump Forward 5s (Right Arrow)"
        >
          +5s
        </button>

        {/* Loop Selection */}
        <button
          onClick={onToggleLoop}
          className={`p-2 rounded-lg transition-colors ${
            isLooping
              ? 'bg-purple-600/20 text-purple-400 border border-purple-500/40'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
          title="Loop Playback (L)"
        >
          <Repeat className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Speed & Master Volume */}
      <div className="flex items-center gap-3">
        {/* Playback Speed selector */}
        <div className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-xs">
          <span className="text-neutral-400 font-medium">Speed:</span>
          <select
            value={playbackRate}
            onChange={(e) => onChangePlaybackRate(parseFloat(e.target.value))}
            className="bg-transparent text-neutral-200 font-mono font-semibold focus:outline-none cursor-pointer"
          >
            {rates.map((r) => (
              <option key={r} value={r} className="bg-neutral-900 text-white">
                {r}x
              </option>
            ))}
          </select>
        </div>

        {/* Master Volume */}
        <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800">
          <button
            onClick={() => onChangeMasterVolume(masterVolume > 0 ? 0 : 1.0)}
            className="text-neutral-400 hover:text-white transition-colors"
            title={masterVolume === 0 ? 'Unmute' : 'Mute Master'}
          >
            {masterVolume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={masterVolume}
            onChange={(e) => onChangeMasterVolume(parseFloat(e.target.value))}
            className="w-16 md:w-20 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            title={`Master Volume: ${Math.round(masterVolume * 100)}%`}
          />
          <span className="font-mono text-[10px] text-neutral-400 w-7 text-right tabular-nums">
            {Math.round(masterVolume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
