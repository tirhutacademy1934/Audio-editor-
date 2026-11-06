import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  AudioTrack,
  AudioClip,
  TimelineSelection,
} from '../types/audio';
import { TimelineRuler } from './TimelineRuler';
import { WaveformClipCanvas } from './WaveformClipCanvas';
import {
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MoveHorizontal,
} from 'lucide-react';

interface WaveformTimelineProps {
  tracks: AudioTrack[];
  currentTime: number;
  duration: number;
  selection: TimelineSelection | null;
  onSetSelection: (sel: TimelineSelection | null) => void;
  onSeek: (time: number) => void;
  selectedClipId: string | null;
  onSelectClip: (clip: AudioClip, trackId: string) => void;
  onUpdateTrack: (trackId: string, updates: Partial<AudioTrack>) => void;
  onDeleteTrack: (trackId: string) => void;
  onAddTrack: () => void;
  onMoveClip: (trackId: string, clipId: string, newStartTime: number) => void;
  onAddAudioToTrack: (trackId: string) => void;
}

export const WaveformTimeline: React.FC<WaveformTimelineProps> = ({
  tracks,
  currentTime,
  duration,
  selection,
  onSetSelection,
  onSeek,
  selectedClipId,
  onSelectClip,
  onUpdateTrack,
  onDeleteTrack,
  onAddTrack,
  onMoveClip,
  onAddAudioToTrack,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [pxPerSec, setPxPerSec] = useState<number>(80);
  const [scrollLeft, setScrollLeft] = useState<number>(0);

  // Drag states
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionDragAnchor, setSelectionDragAnchor] = useState<number | null>(null);

  // Clip moving drag
  const [draggingClipInfo, setDraggingClipInfo] = useState<{
    trackId: string;
    clipId: string;
    initialMouseX: number;
    initialStartTime: number;
  } | null>(null);

  // Selection handle dragging (left or right edge)
  const [draggingHandle, setDraggingHandle] = useState<'left' | 'right' | null>(null);

  const totalTimelineWidth = Math.max(1200, duration * pxPerSec + 300);

  // Zoom handlers
  const handleZoomIn = () => setPxPerSec((prev) => Math.min(300, prev * 1.3));
  const handleZoomOut = () => setPxPerSec((prev) => Math.max(25, prev / 1.3));
  const handleZoomFit = () => {
    if (!scrollAreaRef.current || duration <= 0) return;
    const availableWidth = scrollAreaRef.current.clientWidth - 50;
    const fitPx = Math.max(25, Math.min(300, availableWidth / duration));
    setPxPerSec(fitPx);
  };

  // Scroll sync
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  // Timeline track mouse down for selection or seek
  const handleTimelineMouseDown = (e: React.MouseEvent, trackId?: string) => {
    // If clicking on a clip or handle, let them handle it
    if ((e.target as HTMLElement).closest('.handle-drag') || (e.target as HTMLElement).closest('.clip-drag')) {
      return;
    }

    if (!scrollAreaRef.current) return;
    const rect = scrollAreaRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + scrollAreaRef.current.scrollLeft;
    const clickTime = Math.max(0, clickX / pxPerSec);

    if (e.shiftKey && selection) {
      // Extend selection
      const newSel = {
        start: Math.min(selection.start, clickTime),
        end: Math.max(selection.end, clickTime),
        trackId,
      };
      onSetSelection(newSel);
    } else {
      // Start drag selection
      setIsSelecting(true);
      setSelectionDragAnchor(clickTime);
      onSetSelection({ start: clickTime, end: clickTime, trackId });
      onSeek(clickTime);
    }
  };

  // Handle clip mouse down
  const handleClipMouseDown = (e: React.MouseEvent, clip: AudioClip, trackId: string) => {
    e.stopPropagation();
    onSelectClip(clip, trackId);

    // Prepare clip move drag
    setDraggingClipInfo({
      trackId,
      clipId: clip.id,
      initialMouseX: e.clientX,
      initialStartTime: clip.startTime,
    });
  };

  // Handle selection drag start on clip
  const handleClipSelectionDrag = (e: React.MouseEvent, clip: AudioClip) => {
    e.stopPropagation();
    if (!scrollAreaRef.current) return;
    const rect = scrollAreaRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + scrollAreaRef.current.scrollLeft;
    const clickTime = Math.max(0, clickX / pxPerSec);

    setIsSelecting(true);
    setSelectionDragAnchor(clickTime);
    onSetSelection({ start: clickTime, end: clickTime });
  };

  // Window mouse move listener for smooth dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isSelecting && selectionDragAnchor !== null && scrollAreaRef.current) {
        const rect = scrollAreaRef.current.getBoundingClientRect();
        const currentX = e.clientX - rect.left + scrollAreaRef.current.scrollLeft;
        const currentTime = Math.max(0, currentX / pxPerSec);

        const start = Math.min(selectionDragAnchor, currentTime);
        const end = Math.max(selectionDragAnchor, currentTime);
        onSetSelection({
          start: Math.round(start * 1000) / 1000,
          end: Math.round(end * 1000) / 1000,
        });
      } else if (draggingClipInfo) {
        const deltaX = e.clientX - draggingClipInfo.initialMouseX;
        const deltaTime = deltaX / pxPerSec;
        const newStartTime = Math.max(0, draggingClipInfo.initialStartTime + deltaTime);
        onMoveClip(draggingClipInfo.trackId, draggingClipInfo.clipId, Math.round(newStartTime * 100) / 100);
      } else if (draggingHandle && selection && scrollAreaRef.current) {
        const rect = scrollAreaRef.current.getBoundingClientRect();
        const currentX = e.clientX - rect.left + scrollAreaRef.current.scrollLeft;
        const currentTime = Math.max(0, currentX / pxPerSec);

        if (draggingHandle === 'left') {
          onSetSelection({
            start: Math.min(currentTime, selection.end - 0.05),
            end: selection.end,
          });
        } else {
          onSetSelection({
            start: selection.start,
            end: Math.max(currentTime, selection.start + 0.05),
          });
        }
      }
    };

    const handleMouseUp = () => {
      if (isSelecting) {
        setIsSelecting(false);
        setSelectionDragAnchor(null);
        // If selection is too tiny (< 0.05s), treat as a click / seek
        if (selection && selection.end - selection.start < 0.05) {
          onSetSelection(null);
        }
      }
      if (draggingClipInfo) {
        setDraggingClipInfo(null);
      }
      if (draggingHandle) {
        setDraggingHandle(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSelecting, selectionDragAnchor, draggingClipInfo, draggingHandle, selection, pxPerSec, onSetSelection, onMoveClip]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-inner flex-1 min-h-[360px]"
    >
      {/* Timeline Toolbar Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-neutral-200">Timeline Tracks</span>
          <span className="text-neutral-400">
            {tracks.length} {tracks.length === 1 ? 'Track' : 'Tracks'} · {duration.toFixed(2)}s Total
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-neutral-950/80 p-1 rounded-lg border border-neutral-800">
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] text-neutral-400 px-1">
            {Math.round((pxPerSec / 80) * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomFit}
            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
            title="Zoom to Fit Project"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Workspace: Left Track Controls + Right Scrollable Waveforms */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Track Headers (Sticky Panel) */}
        <div className="w-48 sm:w-56 shrink-0 bg-neutral-900/90 border-r border-neutral-800 flex flex-col z-20 shadow-md">
          {/* Ruler Corner Spacer */}
          <div className="h-7 border-b border-neutral-800 bg-neutral-900 flex items-center px-3 text-[10px] font-mono text-neutral-400">
            <span>TRACK / HEAD</span>
          </div>

          {/* Track Control Strips */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/80">
            {tracks.map((track, trackIdx) => (
              <div
                key={track.id}
                className="h-28 p-2.5 flex flex-col justify-between bg-neutral-900/40 hover:bg-neutral-800/30 transition-colors"
              >
                {/* Track Name & Delete */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        track.color === 'emerald'
                          ? 'bg-emerald-400'
                          : track.color === 'indigo'
                          ? 'bg-indigo-400'
                          : track.color === 'amber'
                          ? 'bg-amber-400'
                          : 'bg-purple-400'
                      }`}
                    />
                    <input
                      type="text"
                      value={track.name}
                      onChange={(e) => onUpdateTrack(track.id, { name: e.target.value })}
                      className="bg-transparent text-xs font-semibold text-neutral-200 focus:outline-none focus:bg-neutral-800 px-1 rounded truncate max-w-[100px]"
                    />
                  </div>

                  <button
                    onClick={() => onDeleteTrack(track.id)}
                    className="p-1 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors"
                    title="Delete Track"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Track Volume & Pan Sliders */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                    <span>Vol</span>
                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.05"
                      value={track.volume}
                      onChange={(e) =>
                        onUpdateTrack(track.id, { volume: parseFloat(e.target.value) })
                      }
                      className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <span className="font-mono text-[9px] w-6 text-right">
                      {Math.round(track.volume * 100)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                    <span>Pan</span>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.1"
                      value={track.pan}
                      onChange={(e) =>
                        onUpdateTrack(track.id, { pan: parseFloat(e.target.value) })
                      }
                      className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <span className="font-mono text-[9px] w-6 text-right">
                      {track.pan < 0 ? `L${Math.abs(Math.round(track.pan * 100))}` : track.pan > 0 ? `R${Math.round(track.pan * 100)}` : 'C'}
                    </span>
                  </div>
                </div>

                {/* Mute, Solo, and Add Audio button */}
                <div className="flex items-center justify-between gap-1 pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onUpdateTrack(track.id, { isMuted: !track.isMuted })}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                        track.isMuted
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      M
                    </button>

                    <button
                      onClick={() => onUpdateTrack(track.id, { isSolo: !track.isSolo })}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                        track.isSolo
                          ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      S
                    </button>
                  </div>

                  <button
                    onClick={() => onAddAudioToTrack(track.id)}
                    className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 hover:bg-neutral-800 px-1.5 py-0.5 rounded transition-colors"
                    title="Import Audio into this Track"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Audio</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Add Track Button */}
            <div className="p-3">
              <button
                onClick={onAddTrack}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-neutral-400 hover:text-white bg-neutral-800/50 hover:bg-neutral-800 border border-dashed border-neutral-700/80 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Track</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Scrollable Timeline Canvas */}
        <div
          ref={scrollAreaRef}
          onScroll={handleScroll}
          className="flex-1 overflow-x-auto overflow-y-auto relative bg-neutral-950"
        >
          {/* Top Ruler */}
          <TimelineRuler
            duration={duration}
            pxPerSec={pxPerSec}
            currentTime={currentTime}
            selection={selection}
            onSeek={onSeek}
            scrollLeft={scrollLeft}
          />

          {/* Timeline Tracks Lane */}
          <div
            className="relative min-h-[300px]"
            style={{ width: `${totalTimelineWidth}px` }}
            onMouseDown={(e) => handleTimelineMouseDown(e)}
          >
            {/* Global Timeline Selection Box */}
            {selection && selection.end > selection.start && (
              <div
                className="absolute top-0 bottom-0 bg-purple-500/20 border-x border-purple-400 pointer-events-auto z-20 group"
                style={{
                  left: `${selection.start * pxPerSec}px`,
                  width: `${(selection.end - selection.start) * pxPerSec}px`,
                }}
              >
                {/* Left Drag Handle */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDraggingHandle('left');
                  }}
                  className="handle-drag absolute top-0 bottom-0 -left-1.5 w-3 cursor-ew-resize hover:bg-purple-400/50 flex items-center justify-center"
                  title="Drag to adjust selection start"
                >
                  <div className="w-[2px] h-6 bg-purple-300 rounded" />
                </div>

                {/* Right Drag Handle */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDraggingHandle('right');
                  }}
                  className="handle-drag absolute top-0 bottom-0 -right-1.5 w-3 cursor-ew-resize hover:bg-purple-400/50 flex items-center justify-center"
                  title="Drag to adjust selection end"
                >
                  <div className="w-[2px] h-6 bg-purple-300 rounded" />
                </div>
              </div>
            )}

            {/* Playhead Needle (Runs across all tracks) */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-purple-500 pointer-events-none z-30 shadow-[0_0_8px_rgba(168,85,247,0.8)]"
              style={{ left: `${currentTime * pxPerSec}px` }}
            />

            {/* Track Lanes */}
            {tracks.map((track) => (
              <div
                key={track.id}
                className="h-28 border-b border-neutral-800/70 relative bg-neutral-950/60 hover:bg-neutral-900/20 transition-colors"
                onMouseDown={(e) => handleTimelineMouseDown(e, track.id)}
              >
                {/* Horizontal guide line */}
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-neutral-800/40 pointer-events-none" />

                {/* Render Audio Clips */}
                {track.clips.map((clip) => (
                  <WaveformClipCanvas
                    key={clip.id}
                    clip={clip}
                    pxPerSec={pxPerSec}
                    height={100}
                    color={track.color}
                    isSelected={selectedClipId === clip.id}
                    selection={selection}
                    onClipMouseDown={(e, c) => handleClipMouseDown(e, c, track.id)}
                    onSelectionDragStart={(e, c) => handleClipSelectionDrag(e, c)}
                  />
                ))}

                {/* Empty Track Drop Zone Hint */}
                {track.clips.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-400 pointer-events-none">
                    <span>Empty Track — click "+ Audio" on left to add clip</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
