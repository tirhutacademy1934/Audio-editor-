import React from 'react';
import {
  Volume2,
  FolderOpen,
  Download,
  Sliders,
  Layers,
  Info,
  Keyboard,
  Sun,
  Moon,
  Plus,
  RotateCcw,
} from 'lucide-react';

interface HeaderProps {
  currentTab: 'editor' | 'advanced' | 'multitrack' | 'info';
  setCurrentTab: (tab: 'editor' | 'advanced' | 'multitrack' | 'info') => void;
  projectName: string;
  onRenameProject: () => void;
  onNewProject: () => void;
  onOpenDashboard: () => void;
  onOpenExport: () => void;
  onOpenShortcuts: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  projectName,
  onRenameProject,
  onNewProject,
  onOpenDashboard,
  onOpenExport,
  onOpenShortcuts,
  isDarkMode,
  toggleDarkMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  return (
    <header className="flex items-center justify-between gap-4 md:gap-8 px-4 md:px-6 py-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 backdrop-blur select-none sticky top-0 z-40">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenDashboard}
          className="flex items-center gap-2.5 text-neutral-900 dark:text-neutral-100 font-bold tracking-tight hover:opacity-80 transition-opacity"
          title="Return to Dashboard"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-sm">
            <Volume2 className="w-4 h-4" />
          </div>
          <span className="text-base md:text-lg whitespace-nowrap">Audio Studio AI</span>
        </button>

        <span className="text-neutral-300 dark:text-neutral-700 hidden sm:inline" aria-hidden="true">|</span>

        {/* Project Name editable pill */}
        <button
          onClick={onRenameProject}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800/80 rounded-md transition-colors max-w-[160px] truncate"
          title="Click to rename project"
        >
          <span className="truncate">{projectName}</span>
        </button>
      </div>

      {/* Zone 2: Navigation Links (Clean single-line segmented control) */}
      <nav className="hidden lg:flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800/60 rounded-lg text-xs font-medium">
        <button
          onClick={() => setCurrentTab('editor')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
            currentTab === 'editor'
              ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          <span>Editor</span>
        </button>

        <button
          onClick={() => setCurrentTab('advanced')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
            currentTab === 'advanced'
              ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Advanced DSP</span>
        </button>

        <button
          onClick={() => setCurrentTab('multitrack')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
            currentTab === 'multitrack'
              ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Multi-Track</span>
        </button>

        <button
          onClick={() => setCurrentTab('info')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
            currentTab === 'info'
              ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span>Audio Info</span>
        </button>
      </nav>

      {/* Zone 3: Primary Action & Utilities */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Undo/Redo quick controls */}
        <div className="hidden sm:flex items-center gap-1 border-r border-neutral-200 dark:border-neutral-800 pr-2 mr-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <RotateCcw className="w-4 h-4 -scale-x-100" />
          </button>
        </div>

        {/* Shortcuts button */}
        <button
          onClick={onOpenShortcuts}
          className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Keyboard Shortcuts (?)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Dark/Light mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* New / Dashboard Button */}
        <button
          onClick={onNewProject}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>

        {/* Primary CTA: Export Audio */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 active:bg-purple-700 rounded-lg shadow-sm transition-colors whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audio</span>
        </button>
      </div>
    </header>
  );
};
