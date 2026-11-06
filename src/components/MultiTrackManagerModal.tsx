import React, { useRef } from 'react';
import {
  Layers,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Copy,
  Volume2,
  VolumeX,
  Upload,
  CheckCircle,
  Merge,
} from 'lucide-react';
import { AudioTrack } from '../types/audio';

interface MultiTrackManagerModalProps {
  tracks: AudioTrack[];
  onAddTrack: () => void;
  onDeleteTrack: (trackId: string) => void;
  onUpdateTrack: (trackId: string, updates: Partial<AudioTrack>) => void;
  onMoveTrackOrder: (trackIndex: number, direction: 'up' | 'down') => void;
  onDuplicateTrack: (trackId: string) => void;
  onAddAudioToTrack: (trackId: string) => void;
  onMixdownTracks: () => Promise<void>;
  onClose: () => void;
}

export const MultiTrackManagerModal: React.FC<MultiTrackManagerModalProps> = ({
  tracks,
  onAddTrack,
  onDeleteTrack,
  onUpdateTrack,
  onMoveTrackOrder,
  onDuplicateTrack,
  onAddAudioToTrack,
  onMixdownTracks,
  onClose,
}) => {
  const [isMixing, setIsMixing] = React.useState(false);

  const handleMixdown = async () => {
    setIsMixing(true);
    try {
      await onMixdownTracks();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsMixing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100">Multi-Track Mixer</h3>
              <p className="text-xs text-neutral-400">
                Organize, balance volume, and mixdown multiple audio tracks
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white text-xs font-semibold px-2 py-1"
          >
            Done
          </button>
        </div>

        {/* Tracks List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {tracks.map((track, idx) => (
            <div
              key={track.id}
              className="p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Reorder Buttons */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => onMoveTrackOrder(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 text-neutral-500 hover:text-white disabled:opacity-20 rounded"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onMoveTrackOrder(idx, 'down')}
                    disabled={idx === tracks.length - 1}
                    className="p-1 text-neutral-500 hover:text-white disabled:opacity-20 rounded"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Color Dot & Name */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-neutral-400">#{idx + 1}</span>
                    <input
                      type="text"
                      value={track.name}
                      onChange={(e) => onUpdateTrack(track.id, { name: e.target.value })}
                      className="bg-transparent text-sm font-semibold text-neutral-100 focus:bg-neutral-800 px-1 rounded focus:outline-none"
                    />
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    {track.clips.length} {track.clips.length === 1 ? 'clip' : 'clips'} · Total {track.clips.reduce((s, c) => s + c.duration, 0).toFixed(1)}s
                  </div>
                </div>
              </div>

              {/* Volume, Pan, Mute, Solo */}
              <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400">Vol</span>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={track.volume}
                    onChange={(e) =>
                      onUpdateTrack(track.id, { volume: parseFloat(e.target.value) })
                    }
                    className="w-16 h-1 bg-neutral-700 rounded appearance-none accent-purple-500"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onUpdateTrack(track.id, { isMuted: !track.isMuted })}
                    className={`px-2 py-1 text-xs font-bold rounded ${
                      track.isMuted
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => onUpdateTrack(track.id, { isSolo: !track.isSolo })}
                    className={`px-2 py-1 text-xs font-bold rounded ${
                      track.isSolo
                        ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    S
                  </button>
                </div>

                <button
                  onClick={() => onAddAudioToTrack(track.id)}
                  className="p-1.5 text-neutral-400 hover:text-purple-300 hover:bg-neutral-800 rounded transition-colors"
                  title="Import Audio to this Track"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onDuplicateTrack(track.id)}
                  className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                  title="Duplicate Track"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onDeleteTrack(track.id)}
                  className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors"
                  title="Delete Track"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Add Track Button */}
          <button
            onClick={onAddTrack}
            className="w-full py-3 flex items-center justify-center gap-2 border border-dashed border-neutral-700 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/40 transition-colors"
          >
            <Plus className="w-4 h-4 text-purple-400" />
            <span>Add New Audio Track</span>
          </button>
        </div>

        {/* Footer with Mixdown Action */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
          <span className="text-xs text-neutral-400">
            {tracks.length} active tracks in project
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={handleMixdown}
              disabled={tracks.length <= 1 || isMixing}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl transition-all shadow-sm"
              title="Mix down all tracks into a single master track"
            >
              <Merge className="w-3.5 h-3.5" />
              <span>{isMixing ? 'Mixing Down...' : 'Mixdown to 1 Track'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
