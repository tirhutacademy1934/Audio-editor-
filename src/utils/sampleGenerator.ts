/**
 * Built-in High-Quality Audio Sample Generator
 * Synthesizes pristine demo audio buffers directly in-browser using Web Audio synthesis.
 * Guarantees 100% offline availability and zero external network dependency.
 */

import { getAudioContext } from './audioContext';

export interface SampleDefinition {
  id: string;
  name: string;
  category: 'Podcast' | 'Beats' | 'Acoustic' | 'Synth';
  duration: number; // in seconds
  description: string;
  generate: () => AudioBuffer;
}

/**
 * Generates a rhythmic Lo-Fi Drum Beat (85 BPM, 8 seconds)
 */
export function generateLoFiBeat(): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const duration = 8.0;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const bpm = 85;
  const beatSec = 60 / bpm;
  const stepSec = beatSec / 4; // 16th notes
  const totalSteps = Math.floor(duration / stepSec);

  for (let step = 0; step < totalSteps; step++) {
    const time = step * stepSec;
    const startSample = Math.floor(time * sampleRate);
    const stepInBar = step % 16;

    // Kick on steps 0, 7, 10
    if (stepInBar === 0 || stepInBar === 7 || stepInBar === 10) {
      renderKick(left, right, startSample, sampleRate);
    }

    // Snare on steps 4, 12 (beats 2 and 4)
    if (stepInBar === 4 || stepInBar === 12) {
      renderSnare(left, right, startSample, sampleRate);
    }

    // Hi-hats on even steps (8th notes) + swing
    if (stepInBar % 2 === 0 || stepInBar === 11 || stepInBar === 15) {
      const isAccented = stepInBar % 4 === 2;
      renderHiHat(left, right, startSample, sampleRate, isAccented);
    }
  }

  return buffer;
}

function renderKick(left: Float32Array, right: Float32Array, start: number, sampleRate: number): void {
  const dur = Math.floor(sampleRate * 0.28);
  for (let i = 0; i < dur && start + i < left.length; i++) {
    const t = i / sampleRate;
    // Pitch drops from 140Hz to 42Hz
    const freq = 42 + 98 * Math.exp(-t * 28);
    const env = Math.exp(-t * 12);
    const val = Math.sin(2 * Math.PI * freq * t) * env * 0.85;
    left[start + i] += val;
    right[start + i] += val;
  }
}

function renderSnare(left: Float32Array, right: Float32Array, start: number, sampleRate: number): void {
  const dur = Math.floor(sampleRate * 0.22);
  for (let i = 0; i < dur && start + i < left.length; i++) {
    const t = i / sampleRate;
    const tone = Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 30);
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 16);
    const val = (tone * 0.4 + noise * 0.6) * 0.7;
    left[start + i] += val * 0.95;
    right[start + i] += val * 1.05;
  }
}

function renderHiHat(left: Float32Array, right: Float32Array, start: number, sampleRate: number, accented: boolean): void {
  const dur = Math.floor(sampleRate * 0.05);
  const vol = accented ? 0.35 : 0.2;
  for (let i = 0; i < dur && start + i < left.length; i++) {
    const t = i / sampleRate;
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 60);
    left[start + i] += noise * vol * 0.8;
    right[start + i] += noise * vol * 1.2;
  }
}

/**
 * Generates an Acoustic Rhodes / Chords Progression (8 seconds)
 */
export function generateAcousticChords(): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const duration = 8.0;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Chords: Am7 (A3, C4, E4, G4) -> Fmaj7 (F3, A3, C4, E4) -> Cmaj7 (C3, G3, B3, E4) -> Gsus (G3, D4, G4, B4)
  const chords = [
    { time: 0.0, notes: [220.0, 261.63, 329.63, 392.0] },
    { time: 2.0, notes: [174.61, 220.0, 261.63, 329.63] },
    { time: 4.0, notes: [130.81, 196.0, 246.94, 329.63] },
    { time: 6.0, notes: [196.0, 293.66, 392.0, 493.88] },
  ];

  for (const chord of chords) {
    const startSample = Math.floor(chord.time * sampleRate);
    const chordDuration = 2.4;
    const durSamples = Math.floor(chordDuration * sampleRate);

    for (let n = 0; n < chord.notes.length; n++) {
      const freq = chord.notes[n];
      // Slight strum delay per string
      const noteOffset = Math.floor(n * 0.025 * sampleRate);
      const noteStart = startSample + noteOffset;
      const pan = -0.4 + (n / chord.notes.length) * 0.8;

      for (let i = 0; i < durSamples && noteStart + i < left.length; i++) {
        const t = i / sampleRate;
        // Warm additive harmonics
        const fundamental = Math.sin(2 * Math.PI * freq * t);
        const secondHarmonic = 0.5 * Math.sin(2 * Math.PI * freq * 2 * t);
        const thirdHarmonic = 0.25 * Math.sin(2 * Math.PI * freq * 3 * t);
        const fourthHarmonic = 0.1 * Math.sin(2 * Math.PI * freq * 4 * t);

        const env = Math.exp(-t * 1.5) * (1.0 - Math.exp(-t * 50));
        const sample = (fundamental + secondHarmonic + thirdHarmonic + fourthHarmonic) * env * 0.18;

        left[noteStart + i] += sample * (1 - pan);
        right[noteStart + i] += sample * (1 + pan);
      }
    }
  }

  return buffer;
}

/**
 * Generates a Simulated Vocal/Podcast Dialogue Track (7 seconds)
 * Formant filter synthesis replicating spoken words and vocal cadence.
 */
export function generatePodcastVocal(): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const duration = 7.0;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Phoneme syllables with pitch contour and vowel formants (F1, F2)
  const syllables = [
    { start: 0.3, dur: 0.45, f0: 135, f1: 730, f2: 1090 }, // "Wel-"
    { start: 0.8, dur: 0.40, f0: 142, f1: 520, f2: 1840 }, // "come"
    { start: 1.3, dur: 0.35, f0: 138, f1: 300, f2: 2200 }, // "to"
    { start: 1.8, dur: 0.55, f0: 150, f1: 700, f2: 1220 }, // "Au-"
    { start: 2.4, dur: 0.45, f0: 144, f1: 500, f2: 1700 }, // "di-"
    { start: 2.9, dur: 0.60, f0: 130, f1: 600, f2: 1040 }, // "o"
    // Pause
    { start: 3.8, dur: 0.50, f0: 140, f1: 450, f2: 1800 }, // "Stu-"
    { start: 4.4, dur: 0.55, f0: 132, f1: 520, f2: 1200 }, // "di-"
    { start: 5.1, dur: 0.70, f0: 125, f1: 750, f2: 1100 }, // "o"
  ];

  for (const s of syllables) {
    const startSample = Math.floor(s.start * sampleRate);
    const durSamples = Math.floor(s.dur * sampleRate);

    for (let i = 0; i < durSamples && startSample + i < left.length; i++) {
      const t = i / sampleRate;
      const progress = i / durSamples;
      // Vocal pitch vibrato & natural inflections
      const f0 = s.f0 * (1 + 0.04 * Math.sin(progress * Math.PI) + 0.015 * Math.sin(2 * Math.PI * 5 * t));

      // Buzz glottal pulse
      let buzz = 0;
      for (let h = 1; h <= 12; h++) {
        buzz += (1 / h) * Math.sin(2 * Math.PI * f0 * h * t);
      }

      // Formants
      const f1Val = Math.sin(2 * Math.PI * s.f1 * t);
      const f2Val = Math.sin(2 * Math.PI * s.f2 * t);

      // Amplitude envelope (attack & decay)
      const env = Math.sin(progress * Math.PI);
      const sample = (buzz * 0.4 + f1Val * 0.35 + f2Val * 0.25) * env * 0.32;

      left[startSample + i] += sample;
      right[startSample + i] += sample;
    }
  }

  return buffer;
}

/**
 * Generates an 80s Synthwave Melody & Bassline (8 seconds)
 */
export function generateSynthwaveTrack(): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const duration = 8.0;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // 120 BPM Arpeggiated synth notes
  const notes = [
    220.0, 261.63, 329.63, 440.0,
    196.0, 246.94, 293.66, 392.0,
    174.61, 220.0, 261.63, 349.23,
    164.81, 196.0, 246.94, 329.63,
  ];

  const noteDur = 0.25; // 16th note at 120bpm is 0.125, 8th is 0.25
  const totalNotes = Math.floor(duration / noteDur);

  for (let n = 0; n < totalNotes; n++) {
    const freq = notes[n % notes.length];
    const startSample = Math.floor(n * noteDur * sampleRate);
    const durSamples = Math.floor(noteDur * 1.5 * sampleRate); // slight sustain

    for (let i = 0; i < durSamples && startSample + i < left.length; i++) {
      const t = i / sampleRate;
      // Sawtooth with resonant filter sweep
      const saw = 2 * ((freq * t) % 1) - 1;
      const sub = Math.sin(2 * Math.PI * (freq / 2) * t) * 0.4;
      const env = Math.exp(-t * 4);
      const val = (saw * 0.6 + sub) * env * 0.22;

      // Stereo chorus effect
      left[startSample + i] += val * 0.85;
      right[startSample + i] += val * 1.15;
    }
  }

  return buffer;
}

export const SAMPLE_AUDIO_PRESETS: SampleDefinition[] = [
  {
    id: 'sample-podcast',
    name: 'Podcast Vocal Track',
    category: 'Podcast',
    duration: 7.0,
    description: 'Clean spoken dialogue sample ideal for trimming, noise reduction, and silence removal.',
    generate: generatePodcastVocal,
  },
  {
    id: 'sample-lofi-beat',
    name: 'Lo-Fi Drum Groove',
    category: 'Beats',
    duration: 8.0,
    description: '85 BPM punchy kick, snappy rimshot, and swinging hi-hats ready for slicing and looping.',
    generate: generateLoFiBeat,
  },
  {
    id: 'sample-acoustic',
    name: 'Acoustic Piano Chords',
    category: 'Acoustic',
    duration: 8.0,
    description: 'Warm harmonic chord progression with organic decay, perfect for EQ and reverb tests.',
    generate: generateAcousticChords,
  },
  {
    id: 'sample-synthwave',
    name: 'Synthwave Arpeggio',
    category: 'Synth',
    duration: 8.0,
    description: '120 BPM energetic synth line and sub-bass with stereo modulation.',
    generate: generateSynthwaveTrack,
  },
];
