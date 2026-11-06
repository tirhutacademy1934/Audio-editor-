/**
 * Essential Audio Editing Operations
 * Pure functions operating on Web Audio API AudioBuffers.
 */

import { getAudioContext, cloneAudioBuffer } from './audioContext';

/**
 * Extracts a region of an AudioBuffer from startSec to endSec.
 */
export function extractAudioSlice(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number
): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;

  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = Math.min(buffer.length, Math.ceil(endSec * sampleRate));
  const length = Math.max(1, endSample - startSample);

  const slice = ctx.createBuffer(numChannels, length, sampleRate);

  for (let c = 0; c < numChannels; c++) {
    const src = buffer.getChannelData(c);
    const dest = slice.getChannelData(c);
    const sourceSlice = src.subarray(startSample, endSample);
    dest.set(sourceSlice);
  }

  return slice;
}

/**
 * CUT: Removes selected range [startSec, endSec] from buffer and returns both
 * the spliced buffer and the cut slice (for clipboard).
 */
export function cutAudioSelection(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number
): { remainingBuffer: AudioBuffer; cutBuffer: AudioBuffer } {
  const cutBuffer = extractAudioSlice(buffer, startSec, endSec);
  const remainingBuffer = deleteAudioSelection(buffer, startSec, endSec);
  return { remainingBuffer, cutBuffer };
}

/**
 * DELETE: Deletes selected range [startSec, endSec] from buffer.
 */
export function deleteAudioSelection(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number
): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;

  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = Math.min(buffer.length, Math.ceil(endSec * sampleRate));
  const deleteCount = Math.max(0, endSample - startSample);

  const newLength = Math.max(1, buffer.length - deleteCount);
  const result = ctx.createBuffer(numChannels, newLength, sampleRate);

  for (let c = 0; c < numChannels; c++) {
    const src = buffer.getChannelData(c);
    const dest = result.getChannelData(c);

    // Copy part before startSample
    if (startSample > 0) {
      dest.set(src.subarray(0, startSample), 0);
    }
    // Copy part after endSample
    if (endSample < buffer.length) {
      dest.set(src.subarray(endSample), startSample);
    }
  }

  return result;
}

/**
 * TRIM: Keeps only [startSec, endSec], removing everything before and after.
 */
export function trimAudio(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number
): AudioBuffer {
  return extractAudioSlice(buffer, startSec, endSec);
}

/**
 * SPLIT: Divides an AudioBuffer at splitSec into two AudioBuffers.
 */
export function splitAudioBuffer(
  buffer: AudioBuffer,
  splitSec: number
): [AudioBuffer, AudioBuffer] {
  const partA = extractAudioSlice(buffer, 0, splitSec);
  const partB = extractAudioSlice(buffer, splitSec, buffer.duration);
  return [partA, partB];
}

/**
 * PASTE: Inserts pasteBuffer into targetBuffer at insertSec.
 */
export function pasteAudio(
  targetBuffer: AudioBuffer,
  pasteBuffer: AudioBuffer,
  insertSec: number
): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = targetBuffer.sampleRate;
  const numChannels = Math.max(targetBuffer.numberOfChannels, pasteBuffer.numberOfChannels);

  const insertSample = Math.max(0, Math.min(targetBuffer.length, Math.floor(insertSec * sampleRate)));
  const newLength = targetBuffer.length + pasteBuffer.length;

  const result = ctx.createBuffer(numChannels, newLength, sampleRate);

  for (let c = 0; c < numChannels; c++) {
    const targetSrc = c < targetBuffer.numberOfChannels ? targetBuffer.getChannelData(c) : targetBuffer.getChannelData(0);
    const pasteSrc = c < pasteBuffer.numberOfChannels ? pasteBuffer.getChannelData(c) : pasteBuffer.getChannelData(0);
    const dest = result.getChannelData(c);

    // Part 1: before insert
    if (insertSample > 0) {
      dest.set(targetSrc.subarray(0, insertSample), 0);
    }
    // Part 2: paste buffer
    dest.set(pasteSrc, insertSample);
    // Part 3: after insert
    if (insertSample < targetBuffer.length) {
      dest.set(targetSrc.subarray(insertSample), insertSample + pasteBuffer.length);
    }
  }

  return result;
}

/**
 * MERGE / CONCATENATE: Combines multiple buffers sequentially.
 */
export function mergeAudioBuffers(buffers: AudioBuffer[]): AudioBuffer {
  if (buffers.length === 0) {
    return getAudioContext().createBuffer(2, 44100, 44100);
  }
  if (buffers.length === 1) {
    return cloneAudioBuffer(buffers[0]);
  }

  const ctx = getAudioContext();
  const sampleRate = buffers[0].sampleRate;
  const numChannels = Math.max(...buffers.map(b => b.numberOfChannels));
  const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);

  const merged = ctx.createBuffer(numChannels, totalLength, sampleRate);

  for (let c = 0; c < numChannels; c++) {
    const dest = merged.getChannelData(c);
    let offset = 0;
    for (const b of buffers) {
      const src = c < b.numberOfChannels ? b.getChannelData(c) : b.getChannelData(0);
      dest.set(src, offset);
      offset += b.length;
    }
  }

  return merged;
}

/**
 * FADE IN: Gradually ramps volume from 0 to 1 over [startSec, endSec].
 */
export function fadeInAudio(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number
): AudioBuffer {
  const result = cloneAudioBuffer(buffer);
  const sampleRate = result.sampleRate;
  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = Math.min(result.length, Math.ceil(endSec * sampleRate));
  const fadeLength = Math.max(1, endSample - startSample);

  for (let c = 0; c < result.numberOfChannels; c++) {
    const data = result.getChannelData(c);
    for (let i = startSample; i < endSample; i++) {
      const progress = (i - startSample) / fadeLength;
      // Smooth sinusoidal / equal-power fade curve
      const gain = Math.sin((progress * Math.PI) / 2);
      data[i] *= gain;
    }
  }

  return result;
}

/**
 * FADE OUT: Gradually ramps volume from 1 to 0 over [startSec, endSec].
 */
export function fadeOutAudio(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number
): AudioBuffer {
  const result = cloneAudioBuffer(buffer);
  const sampleRate = result.sampleRate;
  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = Math.min(result.length, Math.ceil(endSec * sampleRate));
  const fadeLength = Math.max(1, endSample - startSample);

  for (let c = 0; c < result.numberOfChannels; c++) {
    const data = result.getChannelData(c);
    for (let i = startSample; i < endSample; i++) {
      const progress = (i - startSample) / fadeLength;
      // Smooth cosine fade curve
      const gain = Math.cos((progress * Math.PI) / 2);
      data[i] *= gain;
    }
  }

  return result;
}

/**
 * MUTE: Zeroes out audio within [startSec, endSec].
 */
export function muteAudioSelection(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number
): AudioBuffer {
  const result = cloneAudioBuffer(buffer);
  const sampleRate = result.sampleRate;
  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = Math.min(result.length, Math.ceil(endSec * sampleRate));

  for (let c = 0; c < result.numberOfChannels; c++) {
    const data = result.getChannelData(c);
    for (let i = startSample; i < endSample; i++) {
      data[i] = 0;
    }
  }

  return result;
}

/**
 * VOLUME / GAIN: Multiplies samples in range (or whole buffer) by linear gain.
 */
export function adjustBufferVolume(
  buffer: AudioBuffer,
  linearGain: number,
  startSec?: number,
  endSec?: number
): AudioBuffer {
  const result = cloneAudioBuffer(buffer);
  const sampleRate = result.sampleRate;
  const startSample = startSec !== undefined ? Math.max(0, Math.floor(startSec * sampleRate)) : 0;
  const endSample = endSec !== undefined ? Math.min(result.length, Math.ceil(endSec * sampleRate)) : result.length;

  for (let c = 0; c < result.numberOfChannels; c++) {
    const data = result.getChannelData(c);
    for (let i = startSample; i < endSample; i++) {
      // Clamp to prevent harsh clipping
      data[i] = Math.max(-1.0, Math.min(1.0, data[i] * linearGain));
    }
  }

  return result;
}

/**
 * NORMALIZE: Rescales peak amplitude to targetPeakDb (default -0.2 dBFS).
 */
export function normalizeAudioBuffer(
  buffer: AudioBuffer,
  targetPeakDb = -0.2
): { normalizedBuffer: AudioBuffer; appliedGainDb: number } {
  let maxPeak = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > maxPeak) maxPeak = abs;
    }
  }

  if (maxPeak === 0) {
    return { normalizedBuffer: cloneAudioBuffer(buffer), appliedGainDb: 0 };
  }

  const targetLinear = Math.pow(10, targetPeakDb / 20);
  const scale = targetLinear / maxPeak;
  const appliedGainDb = 20 * Math.log10(scale);

  const result = cloneAudioBuffer(buffer);
  for (let c = 0; c < result.numberOfChannels; c++) {
    const data = result.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.max(-1.0, Math.min(1.0, data[i] * scale));
    }
  }

  return {
    normalizedBuffer: result,
    appliedGainDb: Math.round(appliedGainDb * 10) / 10,
  };
}

/**
 * REVERSE: Reverses samples in [startSec, endSec] or entire buffer.
 */
export function reverseAudioBuffer(
  buffer: AudioBuffer,
  startSec?: number,
  endSec?: number
): AudioBuffer {
  const result = cloneAudioBuffer(buffer);
  const sampleRate = result.sampleRate;
  const startSample = startSec !== undefined ? Math.max(0, Math.floor(startSec * sampleRate)) : 0;
  const endSample = endSec !== undefined ? Math.min(result.length, Math.ceil(endSec * sampleRate)) : result.length;

  for (let c = 0; c < result.numberOfChannels; c++) {
    const data = result.getChannelData(c);
    let left = startSample;
    let right = endSample - 1;
    while (left < right) {
      const temp = data[left];
      data[left] = data[right];
      data[right] = temp;
      left++;
      right--;
    }
  }

  return result;
}

/**
 * SPEED: Changes playback speed and duration by high-quality resampling.
 */
export async function changeBufferSpeed(
  buffer: AudioBuffer,
  speedMultiplier: number
): Promise<AudioBuffer> {
  if (speedMultiplier <= 0) return buffer;
  if (Math.abs(speedMultiplier - 1.0) < 0.001) return cloneAudioBuffer(buffer);

  const targetDuration = buffer.duration / speedMultiplier;
  const targetLength = Math.max(1, Math.round(targetDuration * buffer.sampleRate));

  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    targetLength,
    buffer.sampleRate
  );

  const sourceNode = offlineCtx.createBufferSource();
  sourceNode.buffer = buffer;
  sourceNode.playbackRate.value = speedMultiplier;
  sourceNode.connect(offlineCtx.destination);
  sourceNode.start(0);

  return await offlineCtx.startRendering();
}
