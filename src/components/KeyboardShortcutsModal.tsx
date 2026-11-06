import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  onClose,
}) => {
  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause playback' },
    { key: 'S', desc: 'Split selected clip at current playhead position' },
    { key: 'T', desc: 'Trim audio (keep only selected range)' },
    { key: 'M', desc: 'Mute selection / Merge clips' },
    { key: 'Del / Backspace', desc: 'Delete active selection or clip' },
    { key: 'Ctrl + C / ⌘ + C', desc: 'Copy selected audio range' },
    { key: 'Ctrl + V / ⌘ + V', desc: 'Paste copied audio at playhead' },
    { key: 'Ctrl + X / ⌘ + X', desc: 'Cut selected audio into clipboard' },
    { key: 'Ctrl + D / ⌘ + D', desc: 'Duplicate selected clip' },
    { key: 'Ctrl + Z / ⌘ + Z', desc: 'Undo last editing action' },
    { key: 'Ctrl + Y / ⌘ + Shift + Z', desc: 'Redo undone action' },
    { key: 'Home / 0', desc: 'Return playhead to beginning' },
    { key: '← / →', desc: 'Jump backward / forward 5 seconds' },
    { key: 'L', desc: 'Toggle loop playback' },
    { key: '?', desc: 'Toggle keyboard shortcuts guide' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100">Keyboard Shortcuts</h3>
              <p className="text-xs text-neutral-400">
                Speed up your audio editing workflow with hotkeys
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-5 max-h-[60vh] overflow-y-auto divide-y divide-neutral-800/80 text-xs">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between py-2.5">
              <span className="text-neutral-300 font-medium">{s.desc}</span>
              <kbd className="px-2 py-1 bg-neutral-950 border border-neutral-800 text-purple-400 font-mono font-semibold rounded-md shadow-xs text-[11px]">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
