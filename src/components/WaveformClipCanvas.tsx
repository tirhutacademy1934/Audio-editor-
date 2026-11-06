import React, { useRef, useEffect, useMemo } from 'react';
import { AudioClip } from '../types/audio';

interface WaveformClipCanvasProps {
  clip: AudioClip;
  pxPerSec: number;
  height: number;
  color: string;
  isSelected: boolean;
  selection: { start: number; end: number } | null;
  onClipMouseDown: (e: React.MouseEvent, clip: AudioClip) => void;
  onSelectionDragStart: (e: React.MouseEvent, clip: AudioClip) => void;
}

export const WaveformClipCanvas: React.FC<WaveformClipCanvasProps> = ({
  clip,
  pxPerSec,
  height,
  color,
  isSelected,
  selection,
  onClipMouseDown,
  onSelectionDragStart,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clipWidth = Math.max(10, clip.duration * pxPerSec);

  // Compute peaks cache
  const peaks = useMemo(() => {
    if (!clip.buffer) return [];
    const numPoints = Math.max(50, Math.floor(clipWidth));
    const channelData = clip.buffer.getChannelData(0);
    const sampleRate = clip.buffer.sampleRate;

    const startSample = Math.floor(clip.offset * sampleRate);
    const totalSamples = Math.floor(clip.duration * sampleRate);
    const step = Math.max(1, Math.floor(totalSamples / numPoints));

    const result: { min: number; max: number }[] = [];

    for (let i = 0; i < numPoints; i++) {
      const idx = startSample + i * step;
      let min = 0;
      let max = 0;

      for (let s = 0; s < step && idx + s < channelData.length; s++) {
        const val = channelData[idx + s];
        if (val < min) min = val;
        if (val > max) max = val;
      }
      result.push({ min, max });
    }

    return result;
  }, [clip.buffer, clip.offset, clip.duration, clipWidth]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = clipWidth * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, clipWidth, height);

    const centerY = height / 2;
    const ampScale = (height / 2) * 0.92;

    // Waveform gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (color === 'emerald') {
      gradient.addColorStop(0, '#34d399');
      gradient.addColorStop(0.5, '#059669');
      gradient.addColorStop(1, '#34d399');
    } else if (color === 'indigo') {
      gradient.addColorStop(0, '#818cf8');
      gradient.addColorStop(0.5, '#4f46e5');
      gradient.addColorStop(1, '#818cf8');
    } else if (color === 'amber') {
      gradient.addColorStop(0, '#fbbf24');
      gradient.addColorStop(0.5, '#d97706');
      gradient.addColorStop(1, '#fbbf24');
    } else {
      // purple default
      gradient.addColorStop(0, '#c084fc');
      gradient.addColorStop(0.5, '#7e22ce');
      gradient.addColorStop(1, '#c084fc');
    }

    ctx.fillStyle = gradient;

    const pointWidth = clipWidth / peaks.length;

    for (let i = 0; i < peaks.length; i++) {
      const p = peaks[i];
      const x = i * pointWidth;
      const topY = centerY - Math.max(1, p.max * ampScale);
      const bottomY = centerY - Math.min(-1, p.min * ampScale);
      const h = Math.max(1.5, bottomY - topY);

      ctx.fillRect(x, topY, Math.max(1, pointWidth - 0.5), h);
    }

    // Centerline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(clipWidth, centerY);
    ctx.stroke();
  }, [peaks, clipWidth, height, color]);

  // Determine selection overlap on this clip
  let selectionLeft = 0;
  let selectionWidth = 0;
  if (selection && selection.end > selection.start) {
    const clipStart = clip.startTime;
    const clipEnd = clip.startTime + clip.duration;
    const selStart = Math.max(clipStart, selection.start);
    const selEnd = Math.min(clipEnd, selection.end);

    if (selEnd > selStart) {
      selectionLeft = (selStart - clipStart) * pxPerSec;
      selectionWidth = (selEnd - selStart) * pxPerSec;
    }
  }

  return (
    <div
      className={`absolute top-1 bottom-1 rounded-lg border overflow-hidden transition-shadow select-none group cursor-pointer ${
        isSelected
          ? 'border-purple-400 bg-neutral-900/90 shadow-md ring-1 ring-purple-400/40'
          : 'border-neutral-700/80 bg-neutral-900/70 hover:border-neutral-500'
      }`}
      style={{
        left: `${clip.startTime * pxPerSec}px`,
        width: `${clipWidth}px`,
      }}
      onMouseDown={(e) => {
        // Alt or Shift drag triggers selection drag, otherwise clip move drag
        if (e.altKey || e.shiftKey) {
          onSelectionDragStart(e, clip);
        } else {
          onClipMouseDown(e, clip);
        }
      }}
    >
      {/* Clip Header Label */}
      <div className="absolute top-0 left-0 right-0 h-4 px-2 bg-neutral-950/70 flex items-center justify-between text-[10px] font-medium text-neutral-300 pointer-events-none z-10">
        <span className="truncate max-w-[120px]">{clip.name}</span>
        <span className="font-mono text-[9px] text-neutral-400">
          {clip.duration.toFixed(2)}s
        </span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: `${clipWidth}px`, height: `${height}px` }}
        className="block mt-1"
      />

      {/* Clip-level Selection Overlay */}
      {selectionWidth > 0 && (
        <div
          className="absolute top-0 bottom-0 bg-purple-500/30 border-x border-purple-400 pointer-events-none z-20"
          style={{
            left: `${selectionLeft}px`,
            width: `${selectionWidth}px`,
          }}
        />
      )}
    </div>
  );
};
