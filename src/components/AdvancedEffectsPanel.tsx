import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  Volume2,
  Activity,
  Layers,
  Wand2,
  Wind,
  MicOff,
  Music,
  Check,
  RotateCcw,
} from 'lucide-react';
import {
  EqualizerSettings,
  ReverbSettings,
  EchoSettings,
  CompressorSettings,
  NoiseReductionSettings,
  SilenceRemovalSettings,
  AudioClip,
} from '../types/audio';

interface AdvancedEffectsPanelProps {
  activeClip: AudioClip | null;
  onApplyEqualizer: (settings: EqualizerSettings) => Promise<void>;
  onApplyReverb: (settings: ReverbSettings) => Promise<void>;
  onApplyEcho: (settings: EchoSettings) => Promise<void>;
  onApplyCompressor: (settings: CompressorSettings) => Promise<void>;
  onApplyNoiseReduction: (settings: NoiseReductionSettings) => Promise<void>;
  onApplySilenceRemoval: (settings: SilenceRemovalSettings) => Promise<void>;
  onApplyBackgroundCleaner: () => Promise<void>;
  onApplyPitchShift: (semitones: number) => Promise<void>;
  onClose: () => void;
}

type TabType =
  | 'cleaner'
  | 'noise'
  | 'silence'
  | 'eq'
  | 'reverb'
  | 'echo'
  | 'compressor'
  | 'pitch';

export const AdvancedEffectsPanel: React.FC<AdvancedEffectsPanelProps> = ({
  activeClip,
  onApplyEqualizer,
  onApplyReverb,
  onApplyEcho,
  onApplyCompressor,
  onApplyNoiseReduction,
  onApplySilenceRemoval,
  onApplyBackgroundCleaner,
  onApplyPitchShift,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('cleaner');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // EQ Settings
  const [eqSettings, setEqSettings] = useState<EqualizerSettings>({
    bass: 2,
    mid: 0,
    treble: 3,
  });

  // Reverb Settings
  const [reverbSettings, setReverbSettings] = useState<ReverbSettings>({
    roomSize: 0.5,
    decay: 1.8,
    wetDry: 0.35,
  });

  // Echo Settings
  const [echoSettings, setEchoSettings] = useState<EchoSettings>({
    delayTime: 0.25,
    feedback: 0.3,
    wetDry: 0.3,
  });

  // Compressor Settings
  const [compressorSettings, setCompressorSettings] = useState<CompressorSettings>({
    threshold: -24,
    ratio: 4,
    attack: 0.003,
    release: 0.25,
    makeupGain: 3,
  });

  // Noise Reduction
  const [noiseSettings, setNoiseSettings] = useState<NoiseReductionSettings>({
    threshold: -38,
    reduction: 12,
    spectralSmoothing: 0.5,
  });

  // Silence Removal
  const [silenceSettings, setSilenceSettings] = useState<SilenceRemovalSettings>({
    thresholdDb: -42,
    minSilenceDuration: 0.35,
    paddingDuration: 0.05,
  });

  // Pitch Shift
  const [pitchSemitones, setPitchSemitones] = useState<number>(0);

  const handleAction = async (fn: () => Promise<void>, successText: string) => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      await fn();
      setStatusMessage(successText);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setStatusMessage('Processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-w-4xl mx-auto w-full my-4">
      {/* Sidebar Tool Switcher */}
      <div className="w-full md:w-56 shrink-0 bg-neutral-950 p-3 border-b md:border-b-0 md:border-r border-neutral-800 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-y-auto">
        <div className="hidden md:block px-3 py-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
          Advanced Audio DSP
        </div>

        <button
          onClick={() => setActiveTab('cleaner')}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
            activeTab === 'cleaner'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5 shrink-0" />
          <span>Noise Cleaner</span>
        </button>

        <button
          onClick={() => setActiveTab('noise')}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
            activeTab === 'noise'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Wind className="w-3.5 h-3.5 shrink-0" />
          <span>Noise Reduction</span>
        </button>

        <button
          onClick={() => setActiveTab('silence')}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
            activeTab === 'silence'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <MicOff className="w-3.5 h-3.5 shrink-0" />
          <span>Silence Removal</span>
        </button>

        <button
          onClick={() => setActiveTab('eq')}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
            activeTab === 'eq'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 shrink-0" />
          <span>3-Band Equalizer</span>
        </button>

        <button
          onClick={() => setActiveTab('reverb')}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
            activeTab === 'reverb'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>Reverb</span>
        </button>

        <button
          onClick={() => setActiveTab('echo')}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
            activeTab === 'echo'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span>Echo & Delay</span>
        </button>

        <button
          onClick={() => setActiveTab('compressor')}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
            activeTab === 'compressor'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5 shrink-0" />
          <span>Audio Compressor</span>
        </button>

        <button
          onClick={() => setActiveTab('pitch')}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
            activeTab === 'pitch'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Music className="w-3.5 h-3.5 shrink-0" />
          <span>Pitch Control</span>
        </button>
      </div>

      {/* Main Tool Configuration Body */}
      <div className="flex-1 p-6 flex flex-col justify-between space-y-6">
        <div>
          {/* Header of selected tool */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <div>
              <h3 className="text-base font-bold text-neutral-100 capitalize">
                {activeTab === 'cleaner' && 'Background Noise Cleaner'}
                {activeTab === 'noise' && 'Spectral Noise Reduction'}
                {activeTab === 'silence' && 'Automatic Silence Removal'}
                {activeTab === 'eq' && '3-Band Equalizer (Bass, Mid, Treble)'}
                {activeTab === 'reverb' && 'Acoustic Studio Reverb'}
                {activeTab === 'echo' && 'Echo & Stereo Delay'}
                {activeTab === 'compressor' && 'Dynamics Compressor'}
                {activeTab === 'pitch' && 'Pitch Shift & Transposition'}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Target: {activeClip ? `Clip "${activeClip.name}"` : 'All Tracks / Active Clip'}
              </p>
            </div>

            {statusMessage && (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-md flex items-center gap-1.5 animate-fade-in">
                <Check className="w-3.5 h-3.5" />
                {statusMessage}
              </span>
            )}
          </div>

          {/* TAB 1: BACKGROUND NOISE CLEANER */}
          {activeTab === 'cleaner' && (
            <div className="pt-4 space-y-4">
              <p className="text-sm text-neutral-300 leading-relaxed">
                Applies a multi-stage acoustic filter to eliminate low-frequency microphone handling rumble (sub-85Hz), electrical mains hum (60Hz notch), and high-frequency background hiss (above 12kHz).
              </p>
              <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span>Sub-Rumble Highpass:</span>
                  <span className="font-mono text-purple-400 font-semibold">85 Hz</span>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span>Mains Hum Notch:</span>
                  <span className="font-mono text-purple-400 font-semibold">60 Hz / 50 Hz</span>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span>Hiss High-Cut:</span>
                  <span className="font-mono text-purple-400 font-semibold">12,000 Hz</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NOISE REDUCTION */}
          {activeTab === 'noise' && (
            <div className="pt-4 space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-neutral-200">Noise Threshold</span>
                  <span className="font-mono text-purple-400">{noiseSettings.threshold} dB</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="-15"
                  step="1"
                  value={noiseSettings.threshold}
                  onChange={(e) =>
                    setNoiseSettings({ ...noiseSettings, threshold: parseInt(e.target.value, 10) })
                  }
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <p className="text-[11px] text-neutral-400">
                  Audio below this energy floor will be attenuated as ambient noise.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-neutral-200">Reduction Amount</span>
                  <span className="font-mono text-purple-400">{noiseSettings.reduction} dB</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="24"
                  step="1"
                  value={noiseSettings.reduction}
                  onChange={(e) =>
                    setNoiseSettings({ ...noiseSettings, reduction: parseInt(e.target.value, 10) })
                  }
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <p className="text-[11px] text-neutral-400">
                  Amount of attenuation applied to detected background noise.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: SILENCE REMOVAL */}
          {activeTab === 'silence' && (
            <div className="pt-4 space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-neutral-200">Silence Threshold</span>
                  <span className="font-mono text-purple-400">{silenceSettings.thresholdDb} dB</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="-25"
                  step="1"
                  value={silenceSettings.thresholdDb}
                  onChange={(e) =>
                    setSilenceSettings({
                      ...silenceSettings,
                      thresholdDb: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-neutral-200">Minimum Silence Duration</span>
                  <span className="font-mono text-purple-400">
                    {silenceSettings.minSilenceDuration}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.05"
                  value={silenceSettings.minSilenceDuration}
                  onChange={(e) =>
                    setSilenceSettings({
                      ...silenceSettings,
                      minSilenceDuration: parseFloat(e.target.value),
                    })
                  }
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <p className="text-[11px] text-neutral-400">
                  Pauses longer than this duration will be automatically cut out.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: 3-BAND EQUALIZER */}
          {activeTab === 'eq' && (
            <div className="pt-4 space-y-5">
              {/* Bass Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-neutral-200">Bass (100 Hz Low Shelf)</span>
                  <span className="font-mono text-purple-400 font-semibold">
                    {eqSettings.bass > 0 ? `+${eqSettings.bass}` : eqSettings.bass} dB
                  </span>
                </div>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  step="1"
                  value={eqSettings.bass}
                  onChange={(e) =>
                    setEqSettings({ ...eqSettings, bass: parseInt(e.target.value, 10) })
                  }
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              {/* Mid Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-neutral-200">Mid (1,000 Hz Bell)</span>
                  <span className="font-mono text-purple-400 font-semibold">
                    {eqSettings.mid > 0 ? `+${eqSettings.mid}` : eqSettings.mid} dB
                  </span>
                </div>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  step="1"
                  value={eqSettings.mid}
                  onChange={(e) =>
                    setEqSettings({ ...eqSettings, mid: parseInt(e.target.value, 10) })
                  }
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              {/* Treble Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-neutral-200">Treble (4,000 Hz High Shelf)</span>
                  <span className="font-mono text-purple-400 font-semibold">
                    {eqSettings.treble > 0 ? `+${eqSettings.treble}` : eqSettings.treble} dB
                  </span>
                </div>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  step="1"
                  value={eqSettings.treble}
                  onChange={(e) =>
                    setEqSettings({ ...eqSettings, treble: parseInt(e.target.value, 10) })
                  }
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </div>
          )}

          {/* TAB 5: REVERB */}
          {activeTab === 'reverb' && (
            <div className="pt-4 space-y-5">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-neutral-200">Room Size</span>
                  <span className="font-mono text-purple-400 font-semibold">
                    {Math.round(reverbSettings.roomSize * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={reverbSettings.roomSize}
                  onChange={(e) =>
                    setReverbSettings({ ...reverbSettings, roomSize: parseFloat(e.target.value) })
                  }
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-neutral-200">Decay Time</span>
                  <span className="font-mono text-purple-400 font-semibold">
                    {reverbSettings.decay}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="4.0"
                  step="0.1"
                  value={reverbSettings.decay}
                  onChange={(e) =>
                    setReverbSettings({ ...reverbSettings, decay: parseFloat(e.target.value) })
                  }
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-neutral-200">Wet / Dry Mix</span>
                  <span className="font-mono text-purple-400 font-semibold">
                    {Math.round(reverbSettings.wetDry * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.8"
                  step="0.05"
                  value={reverbSettings.wetDry}
                  onChange={(e) =>
                    setReverbSettings({ ...reverbSettings, wetDry: parseFloat(e.target.value) })
                  }
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </div>
          )}

          {/* TAB 6: ECHO */}
          {activeTab === 'echo' && (
            <div className="pt-4 space-y-5">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-neutral-200">Delay Time</span>
                  <span className="font-mono text-purple-400 font-semibold">
                    {Math.round(echoSettings.delayTime * 1000)} ms
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.8"
                  step="0.05"
                  value={echoSettings.delayTime}
                  onChange={(e) =>
                    setEchoSettings({ ...echoSettings, delayTime: parseFloat(e.target.value) })
                  }
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-neutral-200">Feedback Repeats</span>
                  <span className="font-mono text-purple-400 font-semibold">
                    {Math.round(echoSettings.feedback * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.75"
                  step="0.05"
                  value={echoSettings.feedback}
                  onChange={(e) =>
                    setEchoSettings({ ...echoSettings, feedback: parseFloat(e.target.value) })
                  }
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-neutral-200">Echo Mix</span>
                  <span className="font-mono text-purple-400 font-semibold">
                    {Math.round(echoSettings.wetDry * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.8"
                  step="0.05"
                  value={echoSettings.wetDry}
                  onChange={(e) =>
                    setEchoSettings({ ...echoSettings, wetDry: parseFloat(e.target.value) })
                  }
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </div>
          )}

          {/* TAB 7: COMPRESSOR */}
          {activeTab === 'compressor' && (
            <div className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-neutral-200">Threshold</span>
                    <span className="font-mono text-purple-400">{compressorSettings.threshold} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="-5"
                    step="1"
                    value={compressorSettings.threshold}
                    onChange={(e) =>
                      setCompressorSettings({
                        ...compressorSettings,
                        threshold: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-neutral-200">Ratio</span>
                    <span className="font-mono text-purple-400">{compressorSettings.ratio}:1</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="16"
                    step="1"
                    value={compressorSettings.ratio}
                    onChange={(e) =>
                      setCompressorSettings({
                        ...compressorSettings,
                        ratio: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-neutral-200">Makeup Gain</span>
                  <span className="font-mono text-purple-400">+{compressorSettings.makeupGain} dB</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="1"
                  value={compressorSettings.makeupGain}
                  onChange={(e) =>
                    setCompressorSettings({
                      ...compressorSettings,
                      makeupGain: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </div>
          )}

          {/* TAB 8: PITCH */}
          {activeTab === 'pitch' && (
            <div className="pt-4 space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-neutral-200">Pitch Shift (Semitones)</span>
                  <span className="font-mono text-purple-400 font-semibold">
                    {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones} semitones
                  </span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={pitchSemitones}
                  onChange={(e) => setPitchSemitones(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-[10px] text-neutral-400">
                  <span>-1 Octave (-12)</span>
                  <span>Original (0)</span>
                  <span>+1 Octave (+12)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
          >
            Close Panel
          </button>

          <button
            onClick={() => {
              if (activeTab === 'cleaner') {
                handleAction(onApplyBackgroundCleaner, 'Background Noise Cleaned');
              } else if (activeTab === 'noise') {
                handleAction(() => onApplyNoiseReduction(noiseSettings), 'Noise Reduced');
              } else if (activeTab === 'silence') {
                handleAction(() => onApplySilenceRemoval(silenceSettings), 'Silences Removed');
              } else if (activeTab === 'eq') {
                handleAction(() => onApplyEqualizer(eqSettings), 'Equalizer Applied');
              } else if (activeTab === 'reverb') {
                handleAction(() => onApplyReverb(reverbSettings), 'Reverb Rendered');
              } else if (activeTab === 'echo') {
                handleAction(() => onApplyEcho(echoSettings), 'Echo Rendered');
              } else if (activeTab === 'compressor') {
                handleAction(() => onApplyCompressor(compressorSettings), 'Compressor Applied');
              } else if (activeTab === 'pitch') {
                handleAction(() => onApplyPitchShift(pitchSemitones), 'Pitch Shifted');
              }
            }}
            disabled={isProcessing}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 rounded-xl shadow-md transition-all"
          >
            {isProcessing ? (
              <span>Processing Audio...</span>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span>Apply to Audio</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
