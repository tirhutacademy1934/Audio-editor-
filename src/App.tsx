import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AudioClip,
  AudioTrack,
  AudioProject,
  TimelineSelection,
  EqualizerSettings,
  ReverbSettings,
  EchoSettings,
  CompressorSettings,
  NoiseReductionSettings,
  SilenceRemovalSettings,
} from './types/audio';
import { PlaybackEngine } from './audio/PlaybackEngine';
import {
  decodeAudioData,
  cloneAudioBuffer,
  getAudioContext,
} from './utils/audioContext';
import {
  cutAudioSelection,
  deleteAudioSelection,
  trimAudio,
  splitAudioBuffer,
  pasteAudio,
  mergeAudioBuffers,
  fadeInAudio,
  fadeOutAudio,
  muteAudioSelection,
  adjustBufferVolume,
  normalizeAudioBuffer,
  changeBufferSpeed,
} from './utils/audioOperations';
import {
  applyEqualizer,
  applyReverb,
  applyEcho,
  applyCompressor,
  applyNoiseReduction,
  applySilenceRemoval,
  applyBackgroundNoiseCleaner,
  applyPitchShift,
} from './utils/audioDSP';
import { renderProjectMixdown } from './utils/audioExport';
import { SAMPLE_AUDIO_PRESETS } from './utils/sampleGenerator';
import {
  saveProjectToStorage,
  loadProjectFromStorage,
  getProjectSummaries,
  deleteProjectFromStorage,
  ProjectSummary,
} from './storage/projectStore';

import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { TransportBar } from './components/TransportBar';
import { EditingToolbar } from './components/EditingToolbar';
import { WaveformTimeline } from './components/WaveformTimeline';
import { AdvancedEffectsPanel } from './components/AdvancedEffectsPanel';
import { MultiTrackManagerModal } from './components/MultiTrackManagerModal';
import { ExportModal } from './components/ExportModal';
import { AudioInfoModal } from './components/AudioInfoModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // View mode
  const [viewMode, setViewMode] = useState<'dashboard' | 'workspace'>('dashboard');
  const [currentTab, setCurrentTab] = useState<'editor' | 'advanced' | 'multitrack' | 'info'>('editor');

  // Modals
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameInputVal, setRenameInputVal] = useState<string>('');

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Recent Projects
  const [recentProjects, setRecentProjects] = useState<ProjectSummary[]>([]);

  // Active Project State
  const [project, setProject] = useState<AudioProject>({
    id: 'proj-' + Date.now(),
    name: 'Untitled Project',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tracks: [],
  });

  // Undo / Redo History Stack
  const [history, setHistory] = useState<AudioProject[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Playback & Selection State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [masterVolume, setMasterVolume] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState<boolean>(false);

  const [selection, setSelection] = useState<TimelineSelection | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [clipboardBuffer, setClipboardBuffer] = useState<AudioBuffer | null>(null);

  // Playback engine ref
  const playbackEngineRef = useRef<PlaybackEngine | null>(null);

  // Initialize Playback Engine & Theme
  useEffect(() => {
    const engine = new PlaybackEngine();
    playbackEngineRef.current = engine;

    engine.setTimeUpdateCallback((time) => {
      setCurrentTime(time);
    });

    engine.setPlaybackEndedCallback(() => {
      setIsPlaying(false);
    });

    // Load recent projects
    refreshRecentProjects();

    return () => {
      engine.destroy();
    };
  }, []);

  // Theme synchronization
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const refreshRecentProjects = async () => {
    const summaries = await getProjectSummaries();
    setRecentProjects(summaries);
  };

  // Compute total duration of current project
  const projectDuration = React.useMemo(() => {
    let max = 0;
    project.tracks.forEach((t) => {
      t.clips.forEach((c) => {
        const end = c.startTime + c.duration;
        if (end > max) max = end;
      });
    });
    return max;
  }, [project.tracks]);

  // Find active selected clip
  const activeClip = React.useMemo<AudioClip | null>(() => {
    if (!selectedClipId) {
      // Default to first clip in first track if available
      return project.tracks[0]?.clips[0] || null;
    }
    for (const t of project.tracks) {
      const found = t.clips.find((c) => c.id === selectedClipId);
      if (found) return found;
    }
    return project.tracks[0]?.clips[0] || null;
  }, [selectedClipId, project.tracks]);

  // Push state to History for Undo / Redo
  const pushHistory = useCallback(
    (newProject: AudioProject) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, newProject];
      });
      setHistoryIndex((prev) => prev + 1);
      setProject(newProject);

      // Auto-save to IndexedDB
      saveProjectToStorage(newProject).catch((e) => console.error(e));
      refreshRecentProjects();
    },
    [historyIndex]
  );

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setProject(prev);
      saveProjectToStorage(prev).catch((e) => console.error(e));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setProject(next);
      saveProjectToStorage(next).catch((e) => console.error(e));
    }
  };

  // ----------------------------------------------------
  // Project Management Actions
  // ----------------------------------------------------
  const handleNewProject = () => {
    if (playbackEngineRef.current) {
      playbackEngineRef.current.stop(0);
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setSelection(null);
    setSelectedClipId(null);

    const emptyProject: AudioProject = {
      id: 'proj-' + Date.now(),
      name: 'Untitled Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tracks: [
        {
          id: 'track-1',
          name: 'Track 1',
          color: 'purple',
          volume: 1.0,
          pan: 0,
          isMuted: false,
          isSolo: false,
          clips: [],
        },
      ],
    };

    setProject(emptyProject);
    setHistory([emptyProject]);
    setHistoryIndex(0);
    setViewMode('workspace');
    setCurrentTab('editor');
  };

  const handleOpenProject = async (id: string) => {
    if (playbackEngineRef.current) {
      playbackEngineRef.current.stop(0);
    }
    setIsPlaying(false);
    setCurrentTime(0);

    const loaded = await loadProjectFromStorage(id);
    if (loaded) {
      setProject(loaded);
      setHistory([loaded]);
      setHistoryIndex(0);
      setViewMode('workspace');
      setCurrentTab('editor');
    }
  };

  const handleDeleteProjectConfirmed = async () => {
    if (deleteConfirmModal) {
      await deleteProjectFromStorage(deleteConfirmModal.id);
      setDeleteConfirmModal(null);
      refreshRecentProjects();
      if (project.id === deleteConfirmModal.id) {
        handleNewProject();
        setViewMode('dashboard');
      }
    }
  };

  const handleRenameSubmit = () => {
    if (!renameInputVal.trim()) return;
    if (renameTargetId === project.id || !renameTargetId) {
      const updated = { ...project, name: renameInputVal.trim(), updatedAt: Date.now() };
      pushHistory(updated);
    }
    setShowRenameModal(false);
  };

  // ----------------------------------------------------
  // Audio Import & Sample Loading
  // ----------------------------------------------------
  const handleImportAudioFiles = async (files: FileList | File[]) => {
    if (files.length === 0) return;

    try {
      const newTracks = [...project.tracks];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const arrayBuf = await file.arrayBuffer();
        const audioBuf = await decodeAudioData(arrayBuf);

        const newClip: AudioClip = {
          id: 'clip-' + Date.now() + '-' + i,
          name: file.name.replace(/\.[^/.]+$/, ''),
          buffer: audioBuf,
          startTime: 0,
          duration: audioBuf.duration,
          offset: 0,
          volume: 1.0,
        };

        // If current project has an empty track, put it in the first empty track
        const emptyTrack = newTracks.find((t) => t.clips.length === 0);
        if (emptyTrack) {
          emptyTrack.name = newClip.name;
          emptyTrack.clips.push(newClip);
        } else {
          // Otherwise add a new track
          const colors = ['purple', 'indigo', 'emerald', 'amber'];
          const trackColor = colors[newTracks.length % colors.length];
          newTracks.push({
            id: 'track-' + Date.now() + '-' + i,
            name: newClip.name,
            color: trackColor,
            volume: 1.0,
            pan: 0,
            isMuted: false,
            isSolo: false,
            clips: [newClip],
          });
        }
      }

      const updatedProj: AudioProject = {
        ...project,
        name: project.name === 'Untitled Project' ? files[0].name.replace(/\.[^/.]+$/, '') : project.name,
        tracks: newTracks,
        updatedAt: Date.now(),
      };

      pushHistory(updatedProj);
      setViewMode('workspace');
      setCurrentTab('editor');
    } catch (err) {
      console.error('Failed to decode audio file:', err);
      alert('Could not decode audio file. Please check that the file is a valid audio format.');
    }
  };

  const handleLoadSample = (sampleId: string) => {
    const sampleDef = SAMPLE_AUDIO_PRESETS.find((s) => s.id === sampleId);
    if (!sampleDef) return;

    const buffer = sampleDef.generate();

    const sampleClip: AudioClip = {
      id: 'clip-' + Date.now(),
      name: sampleDef.name,
      buffer,
      startTime: 0,
      duration: buffer.duration,
      offset: 0,
      volume: 1.0,
    };

    const newProject: AudioProject = {
      id: 'proj-' + Date.now(),
      name: sampleDef.name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tracks: [
        {
          id: 'track-1',
          name: sampleDef.category + ' Track',
          color: sampleDef.category === 'Podcast' ? 'purple' : sampleDef.category === 'Beats' ? 'indigo' : 'emerald',
          volume: 1.0,
          pan: 0,
          isMuted: false,
          isSolo: false,
          clips: [sampleClip],
        },
      ],
    };

    setProject(newProject);
    setHistory([newProject]);
    setHistoryIndex(0);
    setViewMode('workspace');
    setCurrentTab('editor');
  };

  // ----------------------------------------------------
  // Transport Handlers
  // ----------------------------------------------------
  const handlePlay = () => {
    if (!playbackEngineRef.current) return;
    const startAt = selection && selection.end > selection.start ? selection.start : currentTime;
    playbackEngineRef.current.play(project.tracks, startAt);
    setIsPlaying(true);
  };

  const handlePause = () => {
    if (!playbackEngineRef.current) return;
    playbackEngineRef.current.pause();
    setIsPlaying(false);
  };

  const handleStop = () => {
    if (!playbackEngineRef.current) return;
    const resetTime = selection && selection.end > selection.start ? selection.start : 0;
    playbackEngineRef.current.stop(resetTime);
    setIsPlaying(false);
    setCurrentTime(resetTime);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (isPlaying && playbackEngineRef.current) {
      playbackEngineRef.current.play(project.tracks, time);
    }
  };

  const handleSkipBackward = () => {
    handleSeek(Math.max(0, currentTime - 5));
  };

  const handleSkipForward = () => {
    handleSeek(Math.min(projectDuration, currentTime + 5));
  };

  const handleReturnToZero = () => {
    handleSeek(0);
  };

  const handleToggleLoop = () => {
    const next = !isLooping;
    setIsLooping(next);
    if (playbackEngineRef.current) {
      if (next && selection && selection.end > selection.start) {
        playbackEngineRef.current.setLoop(true, selection.start, selection.end);
      } else {
        playbackEngineRef.current.setLoop(next, 0, projectDuration);
      }
    }
  };

  const handleChangePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (playbackEngineRef.current) {
      playbackEngineRef.current.setPlaybackRate(rate);
    }
  };

  const handleChangeMasterVolume = (vol: number) => {
    setMasterVolume(vol);
    if (playbackEngineRef.current) {
      playbackEngineRef.current.setMasterVolume(vol);
    }
  };

  // ----------------------------------------------------
  // Track & Clip Manipulations
  // ----------------------------------------------------
  const handleSelectClip = (clip: AudioClip, trackId: string) => {
    setSelectedClipId(clip.id);
    setSelectedTrackId(trackId);
    setSelection({
      start: clip.startTime,
      end: clip.startTime + clip.duration,
      trackId,
    });
  };

  const handleUpdateTrack = (trackId: string, updates: Partial<AudioTrack>) => {
    const updatedTracks = project.tracks.map((t) => (t.id === trackId ? { ...t, ...updates } : t));
    const updatedProj = { ...project, tracks: updatedTracks, updatedAt: Date.now() };
    pushHistory(updatedProj);
  };

  const handleDeleteTrack = (trackId: string) => {
    if (project.tracks.length <= 1) {
      alert('A project must contain at least one track.');
      return;
    }
    const updatedTracks = project.tracks.filter((t) => t.id !== trackId);
    pushHistory({ ...project, tracks: updatedTracks, updatedAt: Date.now() });
  };

  const handleAddTrack = () => {
    const colors = ['purple', 'indigo', 'emerald', 'amber'];
    const trackColor = colors[project.tracks.length % colors.length];
    const newTrack: AudioTrack = {
      id: 'track-' + Date.now(),
      name: `Track ${project.tracks.length + 1}`,
      color: trackColor,
      volume: 1.0,
      pan: 0,
      isMuted: false,
      isSolo: false,
      clips: [],
    };
    pushHistory({ ...project, tracks: [...project.tracks, newTrack], updatedAt: Date.now() });
  };

  const handleMoveClip = (trackId: string, clipId: string, newStartTime: number) => {
    const updatedTracks = project.tracks.map((track) => {
      if (track.id !== trackId) return track;
      return {
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId ? { ...clip, startTime: Math.max(0, newStartTime) } : clip
        ),
      };
    });
    setProject({ ...project, tracks: updatedTracks, updatedAt: Date.now() });
  };

  const handleAddAudioToTrack = (trackId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac';
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        const file = files[0];
        const arrayBuf = await file.arrayBuffer();
        const audioBuf = await decodeAudioData(arrayBuf);

        // Put clip at end of track
        const targetTrack = project.tracks.find((t) => t.id === trackId);
        let endOfTrack = 0;
        if (targetTrack) {
          targetTrack.clips.forEach((c) => {
            const end = c.startTime + c.duration;
            if (end > endOfTrack) endOfTrack = end;
          });
        }

        const newClip: AudioClip = {
          id: 'clip-' + Date.now(),
          name: file.name.replace(/\.[^/.]+$/, ''),
          buffer: audioBuf,
          startTime: endOfTrack,
          duration: audioBuf.duration,
          offset: 0,
          volume: 1.0,
        };

        const updatedTracks = project.tracks.map((t) =>
          t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t
        );
        pushHistory({ ...project, tracks: updatedTracks, updatedAt: Date.now() });
      }
    };
    input.click();
  };

  const handleMoveTrackOrder = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= project.tracks.length) return;

    const newTracks = [...project.tracks];
    const temp = newTracks[index];
    newTracks[index] = newTracks[targetIdx];
    newTracks[targetIdx] = temp;

    pushHistory({ ...project, tracks: newTracks, updatedAt: Date.now() });
  };

  const handleDuplicateTrack = (trackId: string) => {
    const target = project.tracks.find((t) => t.id === trackId);
    if (!target) return;

    const clonedClips = target.clips.map((c) => ({
      ...c,
      id: 'clip-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      buffer: cloneAudioBuffer(c.buffer),
    }));

    const clonedTrack: AudioTrack = {
      ...target,
      id: 'track-' + Date.now(),
      name: `${target.name} (Copy)`,
      clips: clonedClips,
    };

    pushHistory({ ...project, tracks: [...project.tracks, clonedTrack], updatedAt: Date.now() });
  };

  const handleMixdownTracks = async () => {
    const mixed = await renderProjectMixdown(project.tracks);
    const masterClip: AudioClip = {
      id: 'clip-master-' + Date.now(),
      name: 'Master Mixdown',
      buffer: mixed,
      startTime: 0,
      duration: mixed.duration,
      offset: 0,
      volume: 1.0,
    };

    const masterTrack: AudioTrack = {
      id: 'track-master-' + Date.now(),
      name: 'Master Track',
      color: 'purple',
      volume: 1.0,
      pan: 0,
      isMuted: false,
      isSolo: false,
      clips: [masterClip],
    };

    pushHistory({ ...project, tracks: [masterTrack], updatedAt: Date.now() });
    alert('All tracks successfully mixed down to 1 master audio track!');
  };

  // ----------------------------------------------------
  // 15 Essential Editing Operations
  // ----------------------------------------------------

  // 1. CUT
  const handleCut = () => {
    if (!activeClip || !selection) return;
    const clipStart = activeClip.startTime;
    const clipEnd = activeClip.startTime + activeClip.duration;

    const selStart = Math.max(clipStart, selection.start);
    const selEnd = Math.min(clipEnd, selection.end);
    if (selEnd <= selStart) return;

    const internalStart = selStart - clipStart + activeClip.offset;
    const internalEnd = selEnd - clipStart + activeClip.offset;

    const { remainingBuffer, cutBuffer } = cutAudioSelection(
      activeClip.buffer,
      internalStart,
      internalEnd
    );

    setClipboardBuffer(cutBuffer);

    // Update active clip
    const updatedTracks = project.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) => {
        if (c.id !== activeClip.id) return c;
        return {
          ...c,
          buffer: remainingBuffer,
          duration: remainingBuffer.duration,
        };
      }),
    }));

    pushHistory({ ...project, tracks: updatedTracks, updatedAt: Date.now() });
    setSelection(null);
  };

  // 2. SPLIT
  const handleSplit = () => {
    if (!activeClip) return;
    const splitTime = currentTime;
    const clipStart = activeClip.startTime;
    const clipEnd = activeClip.startTime + activeClip.duration;

    if (splitTime <= clipStart + 0.05 || splitTime >= clipEnd - 0.05) {
      alert('Please position the playhead inside the clip to split.');
      return;
    }

    const internalSplit = splitTime - clipStart + activeClip.offset;
    const [partA, partB] = splitAudioBuffer(activeClip.buffer, internalSplit);

    const clipA: AudioClip = {
      ...activeClip,
      name: `${activeClip.name} (Part 1)`,
      buffer: partA,
      duration: partA.duration,
    };

    const clipB: AudioClip = {
      ...activeClip,
      id: 'clip-' + Date.now(),
      name: `${activeClip.name} (Part 2)`,
      buffer: partB,
      startTime: splitTime,
      duration: partB.duration,
      offset: 0,
    };

    const updatedTracks = project.tracks.map((t) => {
      const idx = t.clips.findIndex((c) => c.id === activeClip.id);
      if (idx === -1) return t;
      const newClips = [...t.clips];
      newClips.splice(idx, 1, clipA, clipB);
      return { ...t, clips: newClips };
    });

    pushHistory({ ...project, tracks: updatedTracks, updatedAt: Date.now() });
    setSelectedClipId(clipB.id);
  };

  // 3. MERGE
  const handleMerge = () => {
    if (!selectedTrackId) {
      const track = project.tracks.find((t) => t.clips.some((c) => c.id === selectedClipId)) || project.tracks[0];
      if (track && track.clips.length > 1) {
        mergeClipsOnTrack(track.id);
      } else {
        alert('Select a track with multiple clips to merge.');
      }
      return;
    }
    mergeClipsOnTrack(selectedTrackId);
  };

  const mergeClipsOnTrack = (trackId: string) => {
    const track = project.tracks.find((t) => t.id === trackId);
    if (!track || track.clips.length <= 1) return;

    // Sort clips by startTime
    const sortedClips = [...track.clips].sort((a, b) => a.startTime - b.startTime);
    const mergedBuffer = mergeAudioBuffers(sortedClips.map((c) => c.buffer));

    const mergedClip: AudioClip = {
      id: 'clip-merged-' + Date.now(),
      name: `${track.name} Merged`,
      buffer: mergedBuffer,
      startTime: sortedClips[0].startTime,
      duration: mergedBuffer.duration,
      offset: 0,
      volume: 1.0,
    };

    const updatedTracks = project.tracks.map((t) =>
      t.id === trackId ? { ...t, clips: [mergedClip] } : t
    );

    pushHistory({ ...project, tracks: updatedTracks, updatedAt: Date.now() });
    setSelectedClipId(mergedClip.id);
  };

  // 4. TRIM
  const handleTrim = () => {
    if (!activeClip || !selection) return;
    const clipStart = activeClip.startTime;
    const clipEnd = activeClip.startTime + activeClip.duration;

    const selStart = Math.max(clipStart, selection.start);
    const selEnd = Math.min(clipEnd, selection.end);
    if (selEnd <= selStart) return;

    const internalStart = selStart - clipStart + activeClip.offset;
    const internalEnd = selEnd - clipStart + activeClip.offset;

    const trimmed = trimAudio(activeClip.buffer, internalStart, internalEnd);

    const updatedTracks = project.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) => {
        if (c.id !== activeClip.id) return c;
        return {
          ...c,
          buffer: trimmed,
          startTime: selStart,
          duration: trimmed.duration,
          offset: 0,
        };
      }),
    }));

    pushHistory({ ...project, tracks: updatedTracks, updatedAt: Date.now() });
    setSelection(null);
  };

  // 5. COPY
  const handleCopy = () => {
    if (!activeClip) return;
    if (selection && selection.end > selection.start) {
      const clipStart = activeClip.startTime;
      const internalStart = Math.max(0, selection.start - clipStart + activeClip.offset);
      const internalEnd = Math.min(activeClip.buffer.duration, selection.end - clipStart + activeClip.offset);
      const slice = trimAudio(activeClip.buffer, internalStart, internalEnd);
      setClipboardBuffer(slice);
    } else {
      setClipboardBuffer(cloneAudioBuffer(activeClip.buffer));
    }
  };

  // 6. PASTE
  const handlePaste = () => {
    if (!clipboardBuffer) return;
    const targetTrack = project.tracks.find((t) => t.id === selectedTrackId) || project.tracks[0];
    if (!targetTrack) return;

    const pasteClip: AudioClip = {
      id: 'clip-' + Date.now(),
      name: 'Pasted Audio',
      buffer: cloneAudioBuffer(clipboardBuffer),
      startTime: currentTime,
      duration: clipboardBuffer.duration,
      offset: 0,
      volume: 1.0,
    };

    const updatedTracks = project.tracks.map((t) =>
      t.id === targetTrack.id ? { ...t, clips: [...t.clips, pasteClip] } : t
    );

    pushHistory({ ...project, tracks: updatedTracks, updatedAt: Date.now() });
    setSelectedClipId(pasteClip.id);
  };

  // 7. DELETE
  const handleDelete = () => {
    if (selection && activeClip && selection.end > selection.start) {
      // Delete selection within clip
      const clipStart = activeClip.startTime;
      const internalStart = Math.max(0, selection.start - clipStart + activeClip.offset);
      const internalEnd = Math.min(activeClip.buffer.duration, selection.end - clipStart + activeClip.offset);

      const remaining = deleteAudioSelection(activeClip.buffer, internalStart, internalEnd);

      const updatedTracks = project.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => {
          if (c.id !== activeClip.id) return c;
          return {
            ...c,
            buffer: remaining,
            duration: remaining.duration,
          };
        }),
      }));

      pushHistory({ ...project, tracks: updatedTracks, updatedAt: Date.now() });
      setSelection(null);
    } else if (activeClip) {
      // Delete whole clip
      const updatedTracks = project.tracks.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => c.id !== activeClip.id),
      }));
      pushHistory({ ...project, tracks: updatedTracks, updatedAt: Date.now() });
      setSelectedClipId(null);
    }
  };

  // 8. DUPLICATE
  const handleDuplicate = () => {
    if (!activeClip) return;
    const targetTrack = project.tracks.find((t) => t.clips.some((c) => c.id === activeClip.id));
    if (!targetTrack) return;

    const dupClip: AudioClip = {
      ...activeClip,
      id: 'clip-' + Date.now(),
      name: `${activeClip.name} (Copy)`,
      startTime: activeClip.startTime + activeClip.duration + 0.5,
      buffer: cloneAudioBuffer(activeClip.buffer),
    };

    const updatedTracks = project.tracks.map((t) =>
      t.id === targetTrack.id ? { ...t, clips: [...t.clips, dupClip] } : t
    );

    pushHistory({ ...project, tracks: updatedTracks, updatedAt: Date.now() });
    setSelectedClipId(dupClip.id);
  };

  // 10. FADE IN
  const handleFadeIn = () => {
    if (!activeClip) return;
    const clipStart = activeClip.startTime;
    let startSec = 0;
    let endSec = Math.min(activeClip.duration, 2.0);

    if (selection && selection.end > selection.start) {
      startSec = Math.max(0, selection.start - clipStart);
      endSec = Math.min(activeClip.duration, selection.end - clipStart);
    }

    const faded = fadeInAudio(activeClip.buffer, startSec, endSec);
    updateClipBuffer(activeClip.id, faded);
  };

  // 11. FADE OUT
  const handleFadeOut = () => {
    if (!activeClip) return;
    const clipStart = activeClip.startTime;
    let startSec = Math.max(0, activeClip.duration - 2.0);
    let endSec = activeClip.duration;

    if (selection && selection.end > selection.start) {
      startSec = Math.max(0, selection.start - clipStart);
      endSec = Math.min(activeClip.duration, selection.end - clipStart);
    }

    const faded = fadeOutAudio(activeClip.buffer, startSec, endSec);
    updateClipBuffer(activeClip.id, faded);
  };

  // 12. MUTE SELECTION
  const handleMuteSelection = () => {
    if (!activeClip || !selection) return;
    const clipStart = activeClip.startTime;
    const startSec = Math.max(0, selection.start - clipStart);
    const endSec = Math.min(activeClip.duration, selection.end - clipStart);

    const muted = muteAudioSelection(activeClip.buffer, startSec, endSec);
    updateClipBuffer(activeClip.id, muted);
  };

  // 13. ADJUST VOLUME
  const handleAdjustVolume = (linearGain: number) => {
    if (!activeClip) return;
    let startSec: number | undefined;
    let endSec: number | undefined;

    if (selection && selection.end > selection.start) {
      startSec = Math.max(0, selection.start - activeClip.startTime);
      endSec = Math.min(activeClip.duration, selection.end - activeClip.startTime);
    }

    const adjusted = adjustBufferVolume(activeClip.buffer, linearGain, startSec, endSec);
    updateClipBuffer(activeClip.id, adjusted);
  };

  // 14. CHANGE SPEED
  const handleChangeSpeed = async (multiplier: number) => {
    if (!activeClip) return;
    const resampled = await changeBufferSpeed(activeClip.buffer, multiplier);
    const updatedTracks = project.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) => {
        if (c.id !== activeClip.id) return c;
        return {
          ...c,
          buffer: resampled,
          duration: resampled.duration,
        };
      }),
    }));
    pushHistory({ ...project, tracks: updatedTracks, updatedAt: Date.now() });
  };

  // 15. NORMALIZE
  const handleNormalize = () => {
    if (!activeClip) return;
    const { normalizedBuffer, appliedGainDb } = normalizeAudioBuffer(activeClip.buffer, -0.2);
    updateClipBuffer(activeClip.id, normalizedBuffer);
  };

  // Helper to replace clip buffer and push to history
  const updateClipBuffer = (clipId: string, newBuffer: AudioBuffer) => {
    const updatedTracks = project.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) => (c.id === clipId ? { ...c, buffer: newBuffer } : c)),
    }));
    pushHistory({ ...project, tracks: updatedTracks, updatedAt: Date.now() });
  };

  // ----------------------------------------------------
  // Advanced DSP Callbacks
  // ----------------------------------------------------
  const handleApplyEqualizer = async (settings: EqualizerSettings) => {
    if (!activeClip) return;
    const processed = await applyEqualizer(activeClip.buffer, settings);
    updateClipBuffer(activeClip.id, processed);
  };

  const handleApplyReverb = async (settings: ReverbSettings) => {
    if (!activeClip) return;
    const processed = await applyReverb(activeClip.buffer, settings);
    const updatedTracks = project.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) =>
        c.id === activeClip.id ? { ...c, buffer: processed, duration: processed.duration } : c
      ),
    }));
    pushHistory({ ...project, tracks: updatedTracks, updatedAt: Date.now() });
  };

  const handleApplyEcho = async (settings: EchoSettings) => {
    if (!activeClip) return;
    const processed = await applyEcho(activeClip.buffer, settings);
    const updatedTracks = project.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) =>
        c.id === activeClip.id ? { ...c, buffer: processed, duration: processed.duration } : c
      ),
    }));
    pushHistory({ ...project, tracks: updatedTracks, updatedAt: Date.now() });
  };

  const handleApplyCompressor = async (settings: CompressorSettings) => {
    if (!activeClip) return;
    const processed = await applyCompressor(activeClip.buffer, settings);
    updateClipBuffer(activeClip.id, processed);
  };

  const handleApplyNoiseReduction = async (settings: NoiseReductionSettings) => {
    if (!activeClip) return;
    const processed = applyNoiseReduction(activeClip.buffer, settings);
    updateClipBuffer(activeClip.id, processed);
  };

  const handleApplySilenceRemoval = async (settings: SilenceRemovalSettings) => {
    if (!activeClip) return;
    const { processedBuffer, silencesRemovedCount, secondsSaved } = applySilenceRemoval(
      activeClip.buffer,
      settings
    );
    const updatedTracks = project.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) =>
        c.id === activeClip.id ? { ...c, buffer: processedBuffer, duration: processedBuffer.duration } : c
      ),
    }));
    pushHistory({ ...project, tracks: updatedTracks, updatedAt: Date.now() });
    alert(`Removed ${silencesRemovedCount} silent gaps, trimming ${secondsSaved}s!`);
  };

  const handleApplyBackgroundCleaner = async () => {
    if (!activeClip) return;
    const processed = await applyBackgroundNoiseCleaner(activeClip.buffer);
    updateClipBuffer(activeClip.id, processed);
  };

  const handleApplyPitchShift = async (semitones: number) => {
    if (!activeClip) return;
    const processed = await applyPitchShift(activeClip.buffer, semitones);
    const updatedTracks = project.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) =>
        c.id === activeClip.id ? { ...c, buffer: processed, duration: processed.duration } : c
      ),
    }));
    pushHistory({ ...project, tracks: updatedTracks, updatedAt: Date.now() });
  };

  // ----------------------------------------------------
  // Global Keyboard Shortcuts
  // ----------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) {
          handlePause();
        } else {
          handlePlay();
        }
      } else if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleSplit();
      } else if (e.code === 'KeyT' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleTrim();
      } else if (e.code === 'KeyM' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (selection && selection.end > selection.start) {
          handleMuteSelection();
        } else {
          handleMerge();
        }
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.code === 'KeyC' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleCopy();
      } else if (e.code === 'KeyV' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handlePaste();
      } else if (e.code === 'KeyX' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleCut();
      } else if (e.code === 'KeyD' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleDuplicate();
      } else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        (e.code === 'KeyY' && (e.ctrlKey || e.metaKey)) ||
        (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey) && e.shiftKey)
      ) {
        e.preventDefault();
        handleRedo();
      } else if (e.code === 'Home' || e.code === 'Numpad0') {
        e.preventDefault();
        handleReturnToZero();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSkipBackward();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSkipForward();
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        handleToggleLoop();
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, activeClip, selection, clipboardBuffer, historyIndex]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-purple-600/30 font-sans">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        projectName={project.name}
        onRenameProject={() => {
          setRenameTargetId(project.id);
          setRenameInputVal(project.name);
          setShowRenameModal(true);
        }}
        onNewProject={handleNewProject}
        onOpenDashboard={() => setViewMode('dashboard')}
        onOpenExport={() => setShowExportModal(true)}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Main View Router */}
      {viewMode === 'dashboard' ? (
        <Dashboard
          recentProjects={recentProjects}
          onOpenProject={handleOpenProject}
          onNewProject={handleNewProject}
          onImportAudioFiles={handleImportAudioFiles}
          onLoadSample={handleLoadSample}
          onDeleteProject={(id, name) => setDeleteConfirmModal({ id, name })}
          onRenameProject={(id, currentName) => {
            setRenameTargetId(id);
            setRenameInputVal(currentName);
            setShowRenameModal(true);
          }}
        />
      ) : (
        <main className="flex-1 flex flex-col p-3 md:p-6 max-w-[1600px] w-full mx-auto space-y-3">
          {/* View Tab Selector (Mobile / Tablet) */}
          <div className="lg:hidden flex items-center gap-1 p-1 bg-neutral-900 rounded-lg text-xs font-medium self-start">
            <button
              onClick={() => setCurrentTab('editor')}
              className={`px-3 py-1.5 rounded-md ${currentTab === 'editor' ? 'bg-purple-600 text-white' : 'text-neutral-400'}`}
            >
              Editor
            </button>
            <button
              onClick={() => setCurrentTab('advanced')}
              className={`px-3 py-1.5 rounded-md ${currentTab === 'advanced' ? 'bg-purple-600 text-white' : 'text-neutral-400'}`}
            >
              Advanced DSP
            </button>
            <button
              onClick={() => setCurrentTab('multitrack')}
              className={`px-3 py-1.5 rounded-md ${currentTab === 'multitrack' ? 'bg-purple-600 text-white' : 'text-neutral-400'}`}
            >
              Mixer
            </button>
            <button
              onClick={() => setCurrentTab('info')}
              className={`px-3 py-1.5 rounded-md ${currentTab === 'info' ? 'bg-purple-600 text-white' : 'text-neutral-400'}`}
            >
              Info
            </button>
          </div>

          {/* Sub-view: Advanced DSP */}
          {currentTab === 'advanced' && (
            <AdvancedEffectsPanel
              activeClip={activeClip}
              onApplyEqualizer={handleApplyEqualizer}
              onApplyReverb={handleApplyReverb}
              onApplyEcho={handleApplyEcho}
              onApplyCompressor={handleApplyCompressor}
              onApplyNoiseReduction={handleApplyNoiseReduction}
              onApplySilenceRemoval={handleApplySilenceRemoval}
              onApplyBackgroundCleaner={handleApplyBackgroundCleaner}
              onApplyPitchShift={handleApplyPitchShift}
              onClose={() => setCurrentTab('editor')}
            />
          )}

          {/* Sub-view: Multi-Track Mixer */}
          {currentTab === 'multitrack' && (
            <MultiTrackManagerModal
              tracks={project.tracks}
              onAddTrack={handleAddTrack}
              onDeleteTrack={handleDeleteTrack}
              onUpdateTrack={handleUpdateTrack}
              onMoveTrackOrder={handleMoveTrackOrder}
              onDuplicateTrack={handleDuplicateTrack}
              onAddAudioToTrack={handleAddAudioToTrack}
              onMixdownTracks={handleMixdownTracks}
              onClose={() => setCurrentTab('editor')}
            />
          )}

          {/* Sub-view: Audio Info */}
          {currentTab === 'info' && (
            <AudioInfoModal
              activeClip={activeClip}
              tracks={project.tracks}
              onClose={() => setCurrentTab('editor')}
            />
          )}

          {/* Main Editor View */}
          <div className="space-y-3 flex-1 flex flex-col">
            {/* 15 Essential Editing Tools Bar */}
            <EditingToolbar
              hasSelection={!!selection && selection.end > selection.start}
              hasSelectedClip={!!activeClip}
              clipboardAvailable={!!clipboardBuffer}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
              onCut={handleCut}
              onSplit={handleSplit}
              onMerge={handleMerge}
              onTrim={handleTrim}
              onCopy={handleCopy}
              onPaste={handlePaste}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onFadeIn={handleFadeIn}
              onFadeOut={handleFadeOut}
              onMuteSelection={handleMuteSelection}
              onAdjustVolume={handleAdjustVolume}
              onChangeSpeed={handleChangeSpeed}
              onNormalize={handleNormalize}
              onUndo={handleUndo}
              onRedo={handleRedo}
            />

            {/* Interactive Waveform Timeline */}
            <WaveformTimeline
              tracks={project.tracks}
              currentTime={currentTime}
              duration={projectDuration}
              selection={selection}
              onSetSelection={setSelection}
              onSeek={handleSeek}
              selectedClipId={selectedClipId}
              onSelectClip={handleSelectClip}
              onUpdateTrack={handleUpdateTrack}
              onDeleteTrack={handleDeleteTrack}
              onAddTrack={handleAddTrack}
              onMoveClip={handleMoveClip}
              onAddAudioToTrack={handleAddAudioToTrack}
            />

            {/* Transport Bar */}
            <TransportBar
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={projectDuration}
              selection={selection}
              playbackRate={playbackRate}
              masterVolume={masterVolume}
              isLooping={isLooping}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
              onPlay={handlePlay}
              onPause={handlePause}
              onStop={handleStop}
              onSkipBackward={handleSkipBackward}
              onSkipForward={handleSkipForward}
              onReturnToZero={handleReturnToZero}
              onToggleLoop={handleToggleLoop}
              onChangePlaybackRate={handleChangePlaybackRate}
              onChangeMasterVolume={handleChangeMasterVolume}
              onUndo={handleUndo}
              onRedo={handleRedo}
            />
          </div>
        </main>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          tracks={project.tracks}
          projectName={project.name}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}

      {/* Rename Project Dialog */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-neutral-100">Rename Project</h3>
            <input
              type="text"
              value={renameInputVal}
              onChange={(e) => setRenameInputVal(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-purple-500"
              placeholder="Enter new project name"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRenameModal(false)}
                className="px-3.5 py-2 text-xs font-medium text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSubmit}
                className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-xl"
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Dialog */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-3">
            <h3 className="text-base font-bold text-neutral-100">Delete Project?</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Are you sure you want to permanently delete "{deleteConfirmModal.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="px-3.5 py-2 text-xs font-medium text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProjectConfirmed}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
