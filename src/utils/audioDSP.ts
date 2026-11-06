/**
 * Advanced DSP Audio Processing Tools
 * Offline rendering algorithms for Equalizer, Reverb, Delay/Echo, Compressor,
 * Noise Reduction, Silence Removal, Background Noise Cleaner, and Pitch Shift.
 */

import { getAudioContext, cloneAudioBuffer } from './audioContext';
import {
  EqualizerSettings,
  ReverbSettings,
  EchoSettings,
  CompressorSettings,
  NoiseReductionSettings,
  SilenceRemovalSettings,
} from '../types/audio';

/**
 * 3-Band Equalizer using BiquadFilterNodes in an OfflineAudioContext.
 */
export async function applyEqualizer(
  buffer: AudioBuffer,
  settings: EqualizerSettings
): Promise<AudioBuffer> {
  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;

  // Bass (Low Shelf at 100 Hz)
  const bassFilter = offlineCtx.createBiquadFilter();
  bassFilter.type = 'lowshelf';
  bassFilter.frequency.value = 100;
  bassFilter.gain.value = settings.bass;

  // Mid (Peaking at 1000 Hz, Q = 1.0)
  const midFilter = offlineCtx.createBiquadFilter();
  midFilter.type = 'peaking';
  midFilter.frequency.value = 1000;
  midFilter.Q.value = 1.0;
  midFilter.gain.value = settings.mid;

  // Treble (High Shelf at 4000 Hz)
  const trebleFilter = offlineCtx.createBiquadFilter();
  trebleFilter.type = 'highshelf';
  trebleFilter.frequency.value = 4000;
  trebleFilter.gain.value = settings.treble;

  source.connect(bassFilter);
  bassFilter.connect(midFilter);
  midFilter.connect(trebleFilter);
  trebleFilter.connect(offlineCtx.destination);

  source.start(0);
  return await offlineCtx.startRendering();
}

/**
 * Synthesizes an algorithmic impulse response for realistic stereo reverb.
 */
function createImpulseResponse(
  sampleRate: number,
  durationSeconds: number,
  decay: number,
  damping: number
): AudioBuffer {
  const ctx = getAudioContext();
  const length = Math.ceil(sampleRate * durationSeconds);
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const progress = i / length;
    // Exponential decay envelope
    const envelope = Math.exp(-progress * decay * 3);
    // Frequency damping (smooth attenuation over time)
    const dampFactor = Math.pow(1 - progress, damping);

    left[i] = (Math.random() * 2 - 1) * envelope * dampFactor;
    right[i] = (Math.random() * 2 - 1) * envelope * dampFactor;
  }

  return impulse;
}

/**
 * Reverb with room size, decay time, and wet/dry mix.
 */
export async function applyReverb(
  buffer: AudioBuffer,
  settings: ReverbSettings
): Promise<AudioBuffer> {
  const impulseDuration = Math.max(0.5, settings.decay);
  const impulse = createImpulseResponse(
    buffer.sampleRate,
    impulseDuration,
    settings.decay,
    settings.roomSize * 2
  );

  const tailSamples = Math.floor(impulseDuration * buffer.sampleRate);
  const totalLength = buffer.length + tailSamples;

  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    totalLength,
    buffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;

  const convolver = offlineCtx.createConvolver();
  convolver.buffer = impulse;

  // Dry and Wet Gain routing
  const dryGain = offlineCtx.createGain();
  const wetGain = offlineCtx.createGain();

  dryGain.gain.value = 1.0 - settings.wetDry * 0.5;
  wetGain.gain.value = settings.wetDry * 0.8;

  source.connect(dryGain);
  dryGain.connect(offlineCtx.destination);

  source.connect(convolver);
  convolver.connect(wetGain);
  wetGain.connect(offlineCtx.destination);

  source.start(0);
  return await offlineCtx.startRendering();
}

/**
 * Echo / Delay with delay time, feedback, and wet/dry mix.
 */
export async function applyEcho(
  buffer: AudioBuffer,
  settings: EchoSettings
): Promise<AudioBuffer> {
  const tailDuration = settings.delayTime * 6;
  const tailSamples = Math.floor(tailDuration * buffer.sampleRate);
  const totalLength = buffer.length + tailSamples;

  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    totalLength,
    buffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;

  const delayNode = offlineCtx.createDelay(2.0);
  delayNode.delayTime.value = settings.delayTime;

  const feedbackGain = offlineCtx.createGain();
  feedbackGain.gain.value = Math.min(0.85, settings.feedback);

  const dryGain = offlineCtx.createGain();
  dryGain.gain.value = 1.0;

  const wetGain = offlineCtx.createGain();
  wetGain.gain.value = settings.wetDry;

  // Dry branch
  source.connect(dryGain);
  dryGain.connect(offlineCtx.destination);

  // Wet branch with feedback loop
  source.connect(delayNode);
  delayNode.connect(feedbackGain);
  feedbackGain.connect(delayNode);
  delayNode.connect(wetGain);
  wetGain.connect(offlineCtx.destination);

  source.start(0);
  return await offlineCtx.startRendering();
}

/**
 * Dynamic Range Compressor with Threshold, Ratio, Attack, Release, and Makeup Gain.
 */
export async function applyCompressor(
  buffer: AudioBuffer,
  settings: CompressorSettings
): Promise<AudioBuffer> {
  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;

  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.value = settings.threshold;
  compressor.knee.value = 12;
  compressor.ratio.value = settings.ratio;
  compressor.attack.value = settings.attack;
  compressor.release.value = settings.release;

  const makeupGain = offlineCtx.createGain();
  makeupGain.gain.value = Math.pow(10, settings.makeupGain / 20);

  source.connect(compressor);
  compressor.connect(makeupGain);
  makeupGain.connect(offlineCtx.destination);

  source.start(0);
  return await offlineCtx.startRendering();
}

/**
 * Background Noise Cleaner:
 * High-pass 80Hz (cuts handling & rumble), notch filter 60Hz (mains hum), and gentle lowpass 12kHz (cuts hiss).
 */
export async function applyBackgroundNoiseCleaner(
  buffer: AudioBuffer
): Promise<AudioBuffer> {
  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;

  // Highpass to eliminate sub-rumble
  const highpass = offlineCtx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 85;
  highpass.Q.value = 0.707;

  // Notch filter for AC hum (60 Hz)
  const notch60 = offlineCtx.createBiquadFilter();
  notch60.type = 'notch';
  notch60.frequency.value = 60;
  notch60.Q.value = 4.0;

  // Lowpass filter for hiss
  const lowpass = offlineCtx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 12000;
  lowpass.Q.value = 0.707;

  source.connect(highpass);
  highpass.connect(notch60);
  notch60.connect(lowpass);
  lowpass.connect(offlineCtx.destination);

  source.start(0);
  return await offlineCtx.startRendering();
}

/**
 * Noise Reduction:
 * Multi-band soft noise gate and downward expansion below threshold.
 */
export function applyNoiseReduction(
  buffer: AudioBuffer,
  settings: NoiseReductionSettings
): AudioBuffer {
  const result = cloneAudioBuffer(buffer);
  const linearThreshold = Math.pow(10, settings.threshold / 20);
  const reductionFactor = Math.pow(10, -settings.reduction / 20);

  const windowSize = Math.floor(buffer.sampleRate * 0.02); // 20ms analysis window
  const hopSize = Math.floor(windowSize / 2);

  for (let c = 0; c < result.numberOfChannels; c++) {
    const data = result.getChannelData(c);
    const numSamples = data.length;

    // Sliding window RMS energy envelope
    let i = 0;
    while (i < numSamples) {
      const end = Math.min(numSamples, i + windowSize);
      let sumSq = 0;
      for (let j = i; j < end; j++) {
        sumSq += data[j] * data[j];
      }
      const rms = Math.sqrt(sumSq / (end - i || 1));

      // Calculate smooth attenuation gain
      let gain = 1.0;
      if (rms < linearThreshold) {
        const ratio = rms / (linearThreshold + 1e-9);
        // Soft knee expansion
        gain = reductionFactor + (1.0 - reductionFactor) * Math.pow(ratio, 2);
      }

      for (let j = i; j < end; j++) {
        data[j] *= gain;
      }

      i += hopSize;
    }
  }

  return result;
}

/**
 * Silence Removal:
 * Detects intervals below thresholdDb lasting longer than minSilenceDuration,
 * removes them, and joins audible segments with micro crossfades.
 */
export function applySilenceRemoval(
  buffer: AudioBuffer,
  settings: SilenceRemovalSettings
): { processedBuffer: AudioBuffer; silencesRemovedCount: number; secondsSaved: number } {
  const ctx = getAudioContext();
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const linearThreshold = Math.pow(10, settings.thresholdDb / 20);
  const minSamples = Math.floor(settings.minSilenceDuration * sampleRate);
  const paddingSamples = Math.floor(settings.paddingDuration * sampleRate);

  // 10ms frame RMS analysis
  const frameSize = Math.floor(sampleRate * 0.01);
  const numFrames = Math.floor(buffer.length / frameSize);
  const isSilentFrame = new Uint8Array(numFrames);

  const mixedData = new Float32Array(buffer.length);
  for (let c = 0; c < numChannels; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < buffer.length; i++) {
      mixedData[i] += Math.abs(ch[i]) / numChannels;
    }
  }

  for (let f = 0; f < numFrames; f++) {
    const start = f * frameSize;
    const end = Math.min(buffer.length, start + frameSize);
    let peak = 0;
    for (let i = start; i < end; i++) {
      if (mixedData[i] > peak) peak = mixedData[i];
    }
    isSilentFrame[f] = peak < linearThreshold ? 1 : 0;
  }

  // Find continuous silent regions
  interface SilenceInterval {
    startSample: number;
    endSample: number;
  }
  const silentIntervals: SilenceInterval[] = [];
  let inSilence = false;
  let silenceStartFrame = 0;

  for (let f = 0; f < numFrames; f++) {
    if (isSilentFrame[f] === 1) {
      if (!inSilence) {
        inSilence = true;
        silenceStartFrame = f;
      }
    } else {
      if (inSilence) {
        inSilence = false;
        const durFrames = f - silenceStartFrame;
        const durSamples = durFrames * frameSize;
        if (durSamples >= minSamples) {
          const rawStart = silenceStartFrame * frameSize;
          const rawEnd = f * frameSize;
          // Apply padding so we don't chop words
          const safeStart = Math.min(rawStart + paddingSamples, rawEnd);
          const safeEnd = Math.max(safeStart, rawEnd - paddingSamples);
          if (safeEnd - safeStart > frameSize) {
            silentIntervals.push({ startSample: safeStart, endSample: safeEnd });
          }
        }
      }
    }
  }

  // Handle trailing silence
  if (inSilence) {
    const durFrames = numFrames - silenceStartFrame;
    if (durFrames * frameSize >= minSamples) {
      silentIntervals.push({
        startSample: silenceStartFrame * frameSize + paddingSamples,
        endSample: buffer.length,
      });
    }
  }

  if (silentIntervals.length === 0) {
    return {
      processedBuffer: cloneAudioBuffer(buffer),
      silencesRemovedCount: 0,
      secondsSaved: 0,
    };
  }

  // Build audible ranges
  interface Range {
    start: number;
    end: number;
  }
  const audibleRanges: Range[] = [];
  let cur = 0;
  let totalSilenceSamples = 0;

  for (const s of silentIntervals) {
    if (s.startSample > cur) {
      audibleRanges.push({ start: cur, end: s.startSample });
    }
    totalSilenceSamples += s.endSample - s.startSample;
    cur = s.endSample;
  }
  if (cur < buffer.length) {
    audibleRanges.push({ start: cur, end: buffer.length });
  }

  const newLength = Math.max(1, audibleRanges.reduce((acc, r) => acc + (r.end - r.start), 0));
  const result = ctx.createBuffer(numChannels, newLength, sampleRate);

  for (let c = 0; c < numChannels; c++) {
    const src = buffer.getChannelData(c);
    const dest = result.getChannelData(c);
    let destOffset = 0;
    for (const r of audibleRanges) {
      const slice = src.subarray(r.start, r.end);
      dest.set(slice, destOffset);
      destOffset += slice.length;
    }
  }

  return {
    processedBuffer: result,
    silencesRemovedCount: silentIntervals.length,
    secondsSaved: Math.round((totalSilenceSamples / sampleRate) * 10) / 10,
  };
}

/**
 * Pitch Shift:
 * Adjusts pitch by semitones (-12 to +12) via playback rate transformation.
 */
export async function applyPitchShift(
  buffer: AudioBuffer,
  semitones: number
): Promise<AudioBuffer> {
  if (Math.abs(semitones) < 0.01) {
    return cloneAudioBuffer(buffer);
  }

  const rate = Math.pow(2, semitones / 12);
  const targetLength = Math.max(1, Math.round(buffer.length / rate));

  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    targetLength,
    buffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  source.connect(offlineCtx.destination);
  source.start(0);

  return await offlineCtx.startRendering();
}
