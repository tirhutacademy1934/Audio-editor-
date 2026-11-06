/**
 * Core type definitions for Audio Studio AI
 */

export interface AudioClip {
  id: string;
  name: string;
  buffer: AudioBuffer;
  startTime: number; // timeline placement in seconds
  duration: number; // playback duration in seconds
  offset: number; // start offset within buffer in seconds
  volume: number; // local clip volume (0 to 2.0)
}

export interface AudioTrack {
  id: string;
  name: string;
  color: string;
  volume: number; // 0.0 to 2.0 (1.0 = 0dB)
  pan: number; // -1.0 to 1.0
  isMuted: boolean;
  isSolo: boolean;
  clips: AudioClip[];
}

export interface AudioProject {
  id: string;
  name: string;
  tracks: AudioTrack[];
  createdAt: number;
  updatedAt: number;
}

export interface TimelineSelection {
  start: number; // in seconds
  end: number; // in seconds
  trackId?: string; // specific track or all tracks
}

export interface AudioFileInfo {
  fileName: string;
  fileSize: number;
  format: string;
  duration: number;
  sampleRate: number;
  channels: number;
  peakDb: number;
  rmsDb: number;
}

export interface EqualizerSettings {
  bass: number; // -15dB to +15dB
  mid: number; // -15dB to +15dB
  treble: number; // -15dB to +15dB
}

export interface ReverbSettings {
  roomSize: number; // 0.1 to 1.0
  decay: number; // 0.2 to 5.0 seconds
  wetDry: number; // 0.0 to 1.0
}

export interface EchoSettings {
  delayTime: number; // 0.05 to 1.0 seconds
  feedback: number; // 0.0 to 0.8
  wetDry: number; // 0.0 to 1.0
}

export interface CompressorSettings {
  threshold: number; // -60 to 0 dB
  ratio: number; // 1 to 20
  attack: number; // 0.001 to 0.1 seconds
  release: number; // 0.05 to 1.0 seconds
  makeupGain: number; // 0 to 18 dB
}

export interface NoiseReductionSettings {
  threshold: number; // -60 to -10 dB
  reduction: number; // 3 to 24 dB
  spectralSmoothing: number; // 0.1 to 1.0
}

export interface SilenceRemovalSettings {
  thresholdDb: number; // e.g. -40 dB
  minSilenceDuration: number; // seconds, e.g. 0.3s
  paddingDuration: number; // seconds, e.g. 0.05s
}

export interface ExportSettings {
  format: 'wav' | 'mp3';
  bitrate: 128 | 192 | 256 | 320;
  sampleRate: 44100 | 48000 | 22050;
  channels: 'stereo' | 'mono';
  filename: string;
  normalize: boolean;
}
