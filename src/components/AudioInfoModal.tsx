import React from 'react';
import { Info, X, Activity, HardDrive, Music, Gauge } from 'lucide-react';
import { AudioClip, AudioTrack } from '../types/audio';
import { calculateBufferStats, formatTime } from '../utils/audioContext';

interface AudioInfoModalProps {
  activeClip: AudioClip | null;
  tracks: AudioTrack[];
  onClose: () => void;
}

export const AudioInfoModal: React.FC<AudioInfoModalProps> = ({
  activeClip,
  tracks,
  onClose,
}) => {
  const buffer = activeClip?.buffer || tracks[0]?.clips[0]?.buffer;
  const stats = buffer ? calculateBufferStats(buffer) : { peakDb: -100, rmsDb: -100 };

  const duration = buffer?.duration || 0;
  const sampleRate = buffer?.sampleRate || 44100;
  const channels = buffer?.numberOfChannels || 2;
  const length = buffer?.length || 0;
  const bytes = length * channels * 2; // 16-bit PCM estimate

  const formatBytes = (b: number): string => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100">Audio Information</h3>
              <p className="text-xs text-neutral-400">
                {activeClip ? `Clip: ${activeClip.name}` : 'Project Master Audio'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Audio Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-1">
              <span className="text-neutral-400 font-medium">Duration</span>
              <div className="text-sm font-bold font-mono text-purple-400 tabular-nums">
                {formatTime(duration)}
              </div>
              <span className="text-[10px] text-neutral-400">{duration.toFixed(3)}s</span>
            </div>

            <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-1">
              <span className="text-neutral-400 font-medium">Sample Rate</span>
              <div className="text-sm font-bold font-mono text-neutral-200">
                {sampleRate.toLocaleString()} Hz
              </div>
              <span className="text-[10px] text-neutral-400">{sampleRate >= 48000 ? 'Studio Grade' : 'CD Standard'}</span>
            </div>

            <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-1">
              <span className="text-neutral-400 font-medium">Channels</span>
              <div className="text-sm font-bold font-mono text-neutral-200">
                {channels === 1 ? 'Mono (1 Ch)' : 'Stereo (2 Ch)'}
              </div>
              <span className="text-[10px] text-neutral-400">Interleaved PCM</span>
            </div>

            <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-1">
              <span className="text-neutral-400 font-medium">Uncompressed Size</span>
              <div className="text-sm font-bold font-mono text-neutral-200">
                {formatBytes(bytes)}
              </div>
              <span className="text-[10px] text-neutral-400">{length.toLocaleString()} Samples</span>
            </div>
          </div>

          {/* Loudness & Peak Meter */}
          <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-300">Loudness Levels</span>
              <span className="font-mono text-[11px] text-neutral-400">dBFS Scale</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">True Peak:</span>
                <span className={`font-mono font-bold ${stats.peakDb > -0.1 ? 'text-red-400' : stats.peakDb > -3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {stats.peakDb} dBFS {stats.peakDb > -0.1 ? '(Clipping)' : '(Safe)'}
                </span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    stats.peakDb > -0.1 ? 'bg-red-500' : stats.peakDb > -3 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, (stats.peakDb + 60) * 1.66))}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">RMS Energy:</span>
                <span className="font-mono font-semibold text-neutral-200">
                  {stats.rmsDb} dBFS
                </span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, (stats.rmsDb + 60) * 1.66))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
