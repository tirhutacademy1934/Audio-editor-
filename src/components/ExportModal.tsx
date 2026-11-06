import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  X,
  Play,
  Pause,
  Music,
  CheckCircle,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import { AudioTrack, EqualizerSettings, ExportSettings } from '../types/audio';
import { exportProjectAudio, downloadFile } from '../utils/audioExport';
import { formatTime } from '../utils/audioContext';

interface ExportModalProps {
  tracks: AudioTrack[];
  projectName: string;
  masterEq?: EqualizerSettings;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  tracks,
  projectName,
  masterEq,
  onClose,
}) => {
  const [format, setFormat] = useState<'wav' | 'mp3'>('mp3');
  const [bitrate, setBitrate] = useState<128 | 192 | 256 | 320>(256);
  const [sampleRate, setSampleRate] = useState<44100 | 48000 | 22050>(44100);
  const [channels, setChannels] = useState<'stereo' | 'mono'>('stereo');
  const [normalize, setNormalize] = useState(true);
  const [filename, setFilename] = useState(
    projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'audio_export'
  );

  // Preview states
  const [isRendering, setIsRendering] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up Object URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleRenderPreview = async () => {
    setIsRendering(true);
    try {
      const settings: ExportSettings = {
        format,
        bitrate,
        sampleRate,
        channels,
        filename: `${filename}.${format}`,
        normalize,
      };

      const result = await exportProjectAudio(tracks, settings, masterEq);
      setPreviewUrl(result.url);
      setPreviewBlob(result.blob);
      setPreviewDuration(result.duration);
    } catch (err) {
      console.error('Export render error:', err);
    } finally {
      setIsRendering(false);
    }
  };

  const handleDownload = async () => {
    if (previewUrl) {
      downloadFile(previewUrl, `${filename}.${format}`);
    } else {
      setIsRendering(true);
      try {
        const settings: ExportSettings = {
          format,
          bitrate,
          sampleRate,
          channels,
          filename: `${filename}.${format}`,
          normalize,
        };
        const result = await exportProjectAudio(tracks, settings, masterEq);
        downloadFile(result.url, `${filename}.${format}`);
      } catch (err) {
        console.error(err);
      } finally {
        setIsRendering(false);
      }
    }
  };

  const togglePreviewPlay = () => {
    if (!audioRef.current) return;
    if (isPreviewPlaying) {
      audioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      audioRef.current.play();
      setIsPreviewPlaying(true);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100">Export & Download</h3>
              <p className="text-xs text-neutral-400">
                Render and export master mixdown with all applied edits
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Filename */}
          <div className="space-y-1.5">
            <label className="font-semibold text-neutral-200">Output Filename</label>
            <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2">
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="bg-transparent text-sm text-neutral-100 flex-1 focus:outline-none font-medium"
                placeholder="project_master"
              />
              <span className="font-mono text-purple-400 font-semibold text-xs">
                .{format}
              </span>
            </div>
          </div>

          {/* Format Picker */}
          <div className="space-y-1.5">
            <label className="font-semibold text-neutral-200">Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormat('mp3');
                  setPreviewUrl(null);
                }}
                className={`p-3 rounded-xl border flex flex-col items-start transition-all ${
                  format === 'mp3'
                    ? 'border-purple-500 bg-purple-950/20 text-white shadow-xs'
                    : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:text-white'
                }`}
              >
                <span className="font-bold text-sm">MP3 Audio</span>
                <span className="text-[11px] text-neutral-400">Universal, compressed file size</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormat('wav');
                  setPreviewUrl(null);
                }}
                className={`p-3 rounded-xl border flex flex-col items-start transition-all ${
                  format === 'wav'
                    ? 'border-purple-500 bg-purple-950/20 text-white shadow-xs'
                    : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:text-white'
                }`}
              >
                <span className="font-bold text-sm">WAV PCM</span>
                <span className="text-[11px] text-neutral-400">Lossless 16-bit uncompressed</span>
              </button>
            </div>
          </div>

          {/* MP3 Bitrate (only when MP3 is selected) */}
          {format === 'mp3' && (
            <div className="space-y-1.5">
              <label className="font-semibold text-neutral-200">Bitrate</label>
              <div className="grid grid-cols-4 gap-2">
                {[128, 192, 256, 320].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      setBitrate(b as 128 | 192 | 256 | 320);
                      setPreviewUrl(null);
                    }}
                    className={`py-2 text-center rounded-lg font-mono text-xs font-semibold transition-colors ${
                      bitrate === b
                        ? 'bg-purple-600 text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {b} kbps
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sample Rate & Channels */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-neutral-200">Sample Rate</label>
              <select
                value={sampleRate}
                onChange={(e) => {
                  setSampleRate(parseInt(e.target.value, 10) as 44100 | 48000 | 22050);
                  setPreviewUrl(null);
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200 focus:outline-none"
              >
                <option value={44100}>44,100 Hz (Standard CD)</option>
                <option value={48000}>48,000 Hz (Studio / Video)</option>
                <option value={22050}>22,050 Hz (Speech / Low)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-neutral-200">Channels</label>
              <select
                value={channels}
                onChange={(e) => {
                  setChannels(e.target.value as 'stereo' | 'mono');
                  setPreviewUrl(null);
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200 focus:outline-none"
              >
                <option value="stereo">Stereo (2 Channels)</option>
                <option value="mono">Mono (1 Channel)</option>
              </select>
            </div>
          </div>

          {/* Normalize toggle */}
          <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={normalize}
              onChange={(e) => {
                setNormalize(e.target.checked);
                setPreviewUrl(null);
              }}
              className="rounded accent-purple-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-neutral-300 font-medium">
              Normalize peak loudness to -0.3 dBFS (prevents digital clipping)
            </span>
          </label>

          {/* Preview Section */}
          <div className="p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-300">Audio Preview</span>
              {previewBlob && (
                <span className="font-mono text-purple-400">
                  {formatFileSize(previewBlob.size)} · {formatTime(previewDuration, false)}
                </span>
              )}
            </div>

            {previewUrl ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePreviewPlay}
                  className="w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shrink-0 shadow-sm"
                >
                  {isPreviewPlaying ? (
                    <Pause className="w-4 h-4 fill-white" />
                  ) : (
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  )}
                </button>
                <div className="flex-1 font-mono text-xs text-neutral-400">
                  {formatTime(previewCurrentTime)} / {formatTime(previewDuration)}
                </div>
                <audio
                  ref={audioRef}
                  src={previewUrl}
                  onTimeUpdate={(e) => setPreviewCurrentTime(e.currentTarget.currentTime)}
                  onEnded={() => setIsPreviewPlaying(false)}
                  className="hidden"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRenderPreview}
                disabled={isRendering}
                className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg font-medium transition-colors"
              >
                {isRendering ? 'Rendering Mixdown...' : 'Pre-render & Listen Before Download'}
              </button>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white"
          >
            Cancel
          </button>

          <button
            onClick={handleDownload}
            disabled={isRendering}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 rounded-xl shadow-md transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {format.toUpperCase()}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
