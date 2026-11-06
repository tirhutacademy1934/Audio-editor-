/**
 * Web Audio Context singleton and buffer utility helpers.
 */

let sharedAudioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioContext) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioContext = new AudioCtx();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch((err) => {
      console.warn('AudioContext resume postponed until user interaction:', err);
    });
  }
  return sharedAudioContext;
}

/**
 * Decode file ArrayBuffer to AudioBuffer
 */
export async function decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  // Clone arrayBuffer because decodeAudioData detaches the buffer
  const bufferCopy = arrayBuffer.slice(0);
  return await ctx.decodeAudioData(bufferCopy);
}

/**
 * Deep-clone an AudioBuffer so modifications do not mutate the original.
 */
export function cloneAudioBuffer(source: AudioBuffer): AudioBuffer {
  const ctx = getAudioContext();
  const clone = ctx.createBuffer(
    source.numberOfChannels,
    source.length,
    source.sampleRate
  );

  for (let channel = 0; channel < source.numberOfChannels; channel++) {
    const srcData = source.getChannelData(channel);
    const destData = clone.getChannelData(channel);
    destData.set(srcData);
  }

  return clone;
}

/**
 * Create an empty AudioBuffer of specified duration in seconds.
 */
export function createEmptyAudioBuffer(
  durationSeconds: number,
  channels = 2,
  sampleRate = 44100
): AudioBuffer {
  const ctx = getAudioContext();
  const safeDuration = Math.max(0.01, durationSeconds);
  const length = Math.ceil(safeDuration * sampleRate);
  return ctx.createBuffer(channels, length, sampleRate);
}

/**
 * Calculate peak and RMS decibels of an AudioBuffer.
 */
export function calculateBufferStats(buffer: AudioBuffer): { peakDb: number; rmsDb: number } {
  let peak = 0;
  let sumOfSquares = 0;
  let totalSamples = 0;

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    const len = data.length;
    totalSamples += len;
    for (let i = 0; i < len; i++) {
      const abs = Math.abs(data[i]);
      if (abs > peak) peak = abs;
      sumOfSquares += abs * abs;
    }
  }

  const rms = totalSamples > 0 ? Math.sqrt(sumOfSquares / totalSamples) : 0;
  const peakDb = peak > 0 ? 20 * Math.log10(peak) : -100;
  const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -100;

  return {
    peakDb: Math.max(-100, Math.min(6, Math.round(peakDb * 10) / 10)),
    rmsDb: Math.max(-100, Math.min(0, Math.round(rmsDb * 10) / 10)),
  };
}

/**
 * Format time in seconds to mm:ss.ms
 */
export function formatTime(seconds: number, includeMs = true): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  const mStr = String(mins).padStart(2, '0');
  const sStr = String(secs).padStart(2, '0');
  const msStr = String(ms).padStart(3, '0');

  return includeMs ? `${mStr}:${sStr}.${msStr}` : `${mStr}:${sStr}`;
}
