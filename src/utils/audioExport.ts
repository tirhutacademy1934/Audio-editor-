/**
 * Audio Export & Mixdown Engine
 * Lossless WAV and MP3 encoding with customizable bitrates and sample rates.
 */

import { Mp3Encoder } from 'lamejs';
import { AudioTrack, EqualizerSettings, ExportSettings } from '../types/audio';
import { normalizeAudioBuffer } from './audioOperations';

/**
 * Encodes an AudioBuffer into a standard 16-bit PCM WAV Blob.
 */
export function encodeWAV(audioBuffer: AudioBuffer, isMono = false): Blob {
  const numChannels = isMono ? 1 : Math.min(2, audioBuffer.numberOfChannels);
  const sampleRate = audioBuffer.sampleRate;
  const numSamples = audioBuffer.length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels & write 16-bit PCM samples
  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    if (numChannels === 1) {
      // Mono downmix
      const monoSample = audioBuffer.numberOfChannels > 1 ? (left[i] + right[i]) * 0.5 : left[i];
      const s = Math.max(-1, Math.min(1, monoSample));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    } else {
      // Stereo
      const sL = Math.max(-1, Math.min(1, left[i]));
      const sR = Math.max(-1, Math.min(1, right[i]));
      view.setInt16(offset, sL < 0 ? sL * 0x8000 : sL * 0x7fff, true);
      view.setInt16(offset + 2, sR < 0 ? sR * 0x8000 : sR * 0x7fff, true);
      offset += 4;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Encodes an AudioBuffer into an MP3 Blob using lamejs.
 */
export function encodeMP3(
  audioBuffer: AudioBuffer,
  bitrate: 128 | 192 | 256 | 320 = 256,
  isMono = false
): Blob {
  const numChannels = isMono ? 1 : Math.min(2, audioBuffer.numberOfChannels);
  const sampleRate = audioBuffer.sampleRate;
  const encoder = new Mp3Encoder(numChannels, sampleRate, bitrate);

  const numSamples = audioBuffer.length;
  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;

  // Convert float32 to int16
  const leftInt16 = new Int16Array(numSamples);
  const rightInt16 = new Int16Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const sL = Math.max(-1, Math.min(1, left[i]));
    leftInt16[i] = sL < 0 ? sL * 0x8000 : sL * 0x7fff;

    if (numChannels > 1) {
      const sR = Math.max(-1, Math.min(1, right[i]));
      rightInt16[i] = sR < 0 ? sR * 0x8000 : sR * 0x7fff;
    }
  }

  const mp3Data: Int8Array[] = [];
  const chunkSize = 1152; // standard MP3 frame size

  for (let i = 0; i < numSamples; i += chunkSize) {
    const end = Math.min(i + chunkSize, numSamples);
    const leftChunk = leftInt16.subarray(i, end);

    let mp3buf: Int8Array;
    if (numChannels === 1) {
      mp3buf = encoder.encodeBuffer(leftChunk);
    } else {
      const rightChunk = rightInt16.subarray(i, end);
      mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
    }

    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }

  const endBuffer = encoder.flush();
  if (endBuffer.length > 0) {
    mp3Data.push(endBuffer);
  }

  return new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' });
}

/**
 * Mixes down all audio tracks into a single master AudioBuffer.
 * Respects track volume, pan, mute, solo, and clip timeline positions.
 */
export async function renderProjectMixdown(
  tracks: AudioTrack[],
  masterEq?: EqualizerSettings,
  targetSampleRate = 44100
): Promise<AudioBuffer> {
  // Check if any track is soloed
  const hasSolo = tracks.some(t => t.isSolo);

  // Calculate project total duration
  let maxEndTime = 0;
  for (const track of tracks) {
    for (const clip of track.clips) {
      const end = clip.startTime + clip.duration;
      if (end > maxEndTime) maxEndTime = end;
    }
  }

  // Ensure minimum duration
  const totalDuration = Math.max(0.5, maxEndTime);
  const totalLength = Math.ceil(totalDuration * targetSampleRate);

  const offlineCtx = new OfflineAudioContext(2, totalLength, targetSampleRate);

  // Setup Master EQ if provided
  let masterInput: AudioNode = offlineCtx.destination;
  if (masterEq && (masterEq.bass !== 0 || masterEq.mid !== 0 || masterEq.treble !== 0)) {
    const bass = offlineCtx.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.value = 100;
    bass.gain.value = masterEq.bass;

    const mid = offlineCtx.createBiquadFilter();
    mid.type = 'peaking';
    mid.frequency.value = 1000;
    mid.gain.value = masterEq.mid;

    const treble = offlineCtx.createBiquadFilter();
    treble.type = 'highshelf';
    treble.frequency.value = 4000;
    treble.gain.value = masterEq.treble;

    bass.connect(mid);
    mid.connect(treble);
    treble.connect(offlineCtx.destination);
    masterInput = bass;
  }

  // Render each track
  for (const track of tracks) {
    // If there is any solo track, only play soloed tracks
    if (hasSolo && !track.isSolo) continue;
    // If track is muted, skip
    if (track.isMuted) continue;

    // Track Gain & Pan
    const trackGain = offlineCtx.createGain();
    trackGain.gain.value = track.volume;

    const panner = offlineCtx.createStereoPanner ? offlineCtx.createStereoPanner() : null;
    if (panner) {
      panner.pan.value = track.pan;
      trackGain.connect(panner);
      panner.connect(masterInput);
    } else {
      trackGain.connect(masterInput);
    }

    // Schedule all clips on this track
    for (const clip of track.clips) {
      if (!clip.buffer) continue;
      const clipSource = offlineCtx.createBufferSource();
      clipSource.buffer = clip.buffer;

      const clipGain = offlineCtx.createGain();
      clipGain.gain.value = clip.volume ?? 1.0;

      clipSource.connect(clipGain);
      clipGain.connect(trackGain);

      // Start clip at its timeline position
      clipSource.start(
        Math.max(0, clip.startTime),
        Math.max(0, clip.offset),
        Math.max(0.01, clip.duration)
      );
    }
  }

  const rendered = await offlineCtx.startRendering();
  return rendered;
}

/**
 * High-level export helper taking export settings and returning the file Blob and URL.
 */
export async function exportProjectAudio(
  tracks: AudioTrack[],
  settings: ExportSettings,
  masterEq?: EqualizerSettings
): Promise<{ blob: Blob; url: string; duration: number }> {
  let mixed = await renderProjectMixdown(tracks, masterEq, settings.sampleRate);

  if (settings.normalize) {
    const { normalizedBuffer } = normalizeAudioBuffer(mixed, -0.3);
    mixed = normalizedBuffer;
  }

  const isMono = settings.channels === 'mono';
  let blob: Blob;

  if (settings.format === 'wav') {
    blob = encodeWAV(mixed, isMono);
  } else {
    blob = encodeMP3(mixed, settings.bitrate, isMono);
  }

  const url = URL.createObjectURL(blob);
  return { blob, url, duration: mixed.duration };
}

/**
 * Trigger browser file download
 */
export function downloadFile(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
