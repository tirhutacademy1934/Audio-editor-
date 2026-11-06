/**
 * Real-Time Multi-Track Audio Playback Engine
 * Handles precise playback scheduling, track mixing, live EQ, volume metering,
 * and playhead tracking.
 */

import { AudioTrack, EqualizerSettings } from '../types/audio';
import { getAudioContext } from '../utils/audioContext';

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  masterVolume: number;
  isLooping: boolean;
  loopStart: number;
  loopEnd: number;
}

export class PlaybackEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private analyser: AnalyserNode;
  private bassFilter: BiquadFilterNode;
  private midFilter: BiquadFilterNode;
  private trebleFilter: BiquadFilterNode;

  private activeSources: {
    source: AudioBufferSourceNode;
    gain: GainNode;
  }[] = [];

  private isPlaying = false;
  private playbackRate = 1.0;
  private masterVolume = 1.0;
  private isLooping = false;
  private loopStart = 0;
  private loopEnd = 0;

  private playStartTimeCtx = 0;
  private playStartTimelineTime = 0;
  private currentTimelineTime = 0;
  private projectDuration = 0;

  private animFrameId: number | null = null;
  private onTimeUpdateCallback: ((time: number) => void) | null = null;
  private onPlaybackEndedCallback: (() => void) | null = null;

  constructor() {
    this.ctx = getAudioContext();

    // Master EQ Filters
    this.bassFilter = this.ctx.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 100;

    this.midFilter = this.ctx.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.value = 1000;
    this.midFilter.Q.value = 1.0;

    this.trebleFilter = this.ctx.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.value = 4000;

    // Master Gain & Analyser
    this.masterGain = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    // Chain: EQ -> MasterGain -> Analyser -> Destination
    this.bassFilter.connect(this.midFilter);
    this.midFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  public setTimeUpdateCallback(cb: (time: number) => void): void {
    this.onTimeUpdateCallback = cb;
  }

  public setPlaybackEndedCallback(cb: () => void): void {
    this.onPlaybackEndedCallback = cb;
  }

  public getAnalyser(): AnalyserNode {
    return this.analyser;
  }

  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(2.0, vol));
    this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.02);
  }

  public setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(0.25, Math.min(3.0, rate));
    for (const item of this.activeSources) {
      try {
        item.source.playbackRate.setValueAtTime(this.playbackRate, this.ctx.currentTime);
      } catch {
        // ignore
      }
    }
  }

  public setMasterEqualizer(eq: EqualizerSettings): void {
    this.bassFilter.gain.setTargetAtTime(eq.bass, this.ctx.currentTime, 0.05);
    this.midFilter.gain.setTargetAtTime(eq.mid, this.ctx.currentTime, 0.05);
    this.trebleFilter.gain.setTargetAtTime(eq.treble, this.ctx.currentTime, 0.05);
  }

  public setLoop(enabled: boolean, start = 0, end = 0): void {
    this.isLooping = enabled;
    this.loopStart = start;
    this.loopEnd = end;
  }

  /**
   * Starts playback from given timeline position for the specified tracks.
   */
  public async play(tracks: AudioTrack[], startTime = 0): Promise<void> {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.stopSourcesOnly();

    // Compute project duration
    let maxDuration = 0;
    for (const t of tracks) {
      for (const c of t.clips) {
        const end = c.startTime + c.duration;
        if (end > maxDuration) maxDuration = end;
      }
    }
    this.projectDuration = Math.max(0.1, maxDuration);

    const hasSolo = tracks.some((t) => t.isSolo);
    const now = this.ctx.currentTime;
    this.playStartTimeCtx = now;
    this.playStartTimelineTime = Math.max(0, startTime);
    this.currentTimelineTime = this.playStartTimelineTime;
    this.isPlaying = true;

    // Schedule sources
    for (const track of tracks) {
      if (hasSolo && !track.isSolo) continue;
      if (track.isMuted) continue;

      const trackGain = this.ctx.createGain();
      trackGain.gain.value = track.volume;

      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (panner) {
        panner.pan.value = track.pan;
        trackGain.connect(panner);
        panner.connect(this.bassFilter);
      } else {
        trackGain.connect(this.bassFilter);
      }

      for (const clip of track.clips) {
        if (!clip.buffer) continue;
        const clipEnd = clip.startTime + clip.duration;

        // Check if clip overlaps playback window
        if (clipEnd <= this.playStartTimelineTime) continue;

        const source = this.ctx.createBufferSource();
        source.buffer = clip.buffer;
        source.playbackRate.value = this.playbackRate;

        const clipGain = this.ctx.createGain();
        clipGain.gain.value = clip.volume ?? 1.0;

        source.connect(clipGain);
        clipGain.connect(trackGain);

        let delayInSec = 0;
        let clipOffsetSec = clip.offset;
        let playDurationSec = clip.duration;

        if (this.playStartTimelineTime > clip.startTime) {
          // Playback starts in the middle of this clip
          const timeIntoClip = this.playStartTimelineTime - clip.startTime;
          clipOffsetSec += timeIntoClip;
          playDurationSec -= timeIntoClip;
          delayInSec = 0;
        } else {
          // Playback starts before this clip
          delayInSec = (clip.startTime - this.playStartTimelineTime) / this.playbackRate;
        }

        const scheduledCtxTime = now + delayInSec;
        source.start(
          scheduledCtxTime,
          Math.max(0, clipOffsetSec),
          Math.max(0.01, playDurationSec)
        );

        this.activeSources.push({ source, gain: clipGain });
      }
    }

    this.startAnimationLoop(tracks);
  }

  /**
   * Pauses playback preserving current playhead.
   */
  public pause(): void {
    if (!this.isPlaying) return;
    this.stopSourcesOnly();
    this.isPlaying = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /**
   * Stops playback and resets to beginning or selection start.
   */
  public stop(resetTime = 0): void {
    this.stopSourcesOnly();
    this.isPlaying = false;
    this.currentTimelineTime = resetTime;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.onTimeUpdateCallback) {
      this.onTimeUpdateCallback(this.currentTimelineTime);
    }
  }

  private stopSourcesOnly(): void {
    for (const item of this.activeSources) {
      try {
        item.source.stop();
        item.source.disconnect();
        item.gain.disconnect();
      } catch {
        // source may have finished
      }
    }
    this.activeSources = [];
  }

  private startAnimationLoop(tracks: AudioTrack[]): void {
    const loop = () => {
      if (!this.isPlaying) return;

      const elapsedCtxTime = this.ctx.currentTime - this.playStartTimeCtx;
      const timelineElapsed = elapsedCtxTime * this.playbackRate;
      this.currentTimelineTime = this.playStartTimelineTime + timelineElapsed;

      // Handle loop region
      if (this.isLooping && this.loopEnd > this.loopStart && this.currentTimelineTime >= this.loopEnd) {
        this.play(tracks, this.loopStart);
        return;
      }

      // Handle end of project
      if (this.currentTimelineTime >= this.projectDuration) {
        this.stop(0);
        if (this.onPlaybackEndedCallback) {
          this.onPlaybackEndedCallback();
        }
        return;
      }

      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.currentTimelineTime);
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.animFrameId = requestAnimationFrame(loop);
  }

  public getCurrentTime(): number {
    return this.currentTimelineTime;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public destroy(): void {
    this.stop(0);
    this.stopSourcesOnly();
  }
}
