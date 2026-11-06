import React, { useRef } from 'react';
import { formatTime } from '../utils/audioContext';

interface TimelineRulerProps {
  duration: number;
  pxPerSec: number;
  currentTime: number;
  selection: { start: number; end: number } | null;
  onSeek: (time: number) => void;
  scrollLeft: number;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({
  duration,
  pxPerSec,
  currentTime,
  selection,
  onSeek,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const totalWidth = Math.max(1000, duration * pxPerSec + 200);

  // Determine tick spacing based on zoom level
  let majorInterval = 1; // seconds
  let minorInterval = 0.2; // seconds

  if (pxPerSec < 40) {
    majorInterval = 5;
    minorInterval = 1;
  } else if (pxPerSec < 80) {
    majorInterval = 2;
    minorInterval = 0.5;
  } else if (pxPerSec < 150) {
    majorInterval = 1;
    minorInterval = 0.2;
  } else {
    majorInterval = 0.5;
    minorInterval = 0.1;
  }

  const ticks: { time: number; isMajor: boolean; x: number }[] = [];
  const maxRulerTime = duration + 5;

  for (let t = 0; t <= maxRulerTime; t += minorInterval) {
    const isMajor = Math.abs(t % majorInterval) < 0.001 || Math.abs((t % majorInterval) - majorInterval) < 0.001;
    ticks.push({
      time: Math.round(t * 100) / 100,
      isMajor,
      x: t * pxPerSec,
    });
  }

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const seekTime = Math.max(0, clickX / pxPerSec);
    onSeek(seekTime);
  };

  return (
    <div
      ref={rulerRef}
      onClick={handleRulerClick}
      className="relative h-7 bg-neutral-900 border-b border-neutral-800 text-[10px] font-mono text-neutral-400 select-none cursor-pointer overflow-hidden"
      style={{ width: `${totalWidth}px` }}
      title="Click or drag to position playhead"
    >
      {/* Selected Region in Ruler */}
      {selection && selection.end > selection.start && (
        <div
          className="absolute top-0 bottom-0 bg-purple-500/25 border-x border-purple-500/60 pointer-events-none"
          style={{
            left: `${selection.start * pxPerSec}px`,
            width: `${(selection.end - selection.start) * pxPerSec}px`,
          }}
        />
      )}

      {/* Ticks & Labels */}
      {ticks.map((tick, idx) => (
        <div
          key={idx}
          className="absolute bottom-0 flex flex-col items-center -translate-x-1/2 pointer-events-none"
          style={{ left: `${tick.x}px` }}
        >
          {tick.isMajor && (
            <span className="mb-0.5 text-neutral-400 font-semibold">
              {formatTime(tick.time, false)}
            </span>
          )}
          <div
            className={`w-[1px] ${
              tick.isMajor ? 'h-3 bg-neutral-600' : 'h-1.5 bg-neutral-700/60'
            }`}
          />
        </div>
      ))}

      {/* Playhead Marker on Ruler */}
      <div
        className="absolute top-0 bottom-0 w-3 -ml-1.5 flex flex-col items-center pointer-events-none z-30"
        style={{ left: `${currentTime * pxPerSec}px` }}
      >
        <div className="w-0 h-0 border-x-[5px] border-x-transparent border-t-[7px] border-t-purple-500" />
        <div className="w-[1.5px] h-full bg-purple-500 shadow-sm" />
      </div>
    </div>
  );
};
