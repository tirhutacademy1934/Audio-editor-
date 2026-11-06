import React, { useState } from 'react';
import {
  UploadCloud,
  FileAudio,
  Sparkles,
  Plus,
  Clock,
  Trash2,
  Edit2,
  Play,
  ArrowRight,
  Music,
  Mic,
  Disc,
} from 'lucide-react';
import { ProjectSummary } from '../storage/projectStore';
import { SAMPLE_AUDIO_PRESETS } from '../utils/sampleGenerator';
import { formatTime } from '../utils/audioContext';

interface DashboardProps {
  recentProjects: ProjectSummary[];
  onOpenProject: (id: string) => void;
  onNewProject: () => void;
  onImportAudioFiles: (files: FileList | File[]) => void;
  onLoadSample: (sampleId: string) => void;
  onDeleteProject: (id: string, name: string) => void;
  onRenameProject: (id: string, currentName: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  recentProjects,
  onOpenProject,
  onNewProject,
  onImportAudioFiles,
  onLoadSample,
  onDeleteProject,
  onRenameProject,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportAudioFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportAudioFiles(e.target.files);
    }
  };

  const getSampleIcon = (category: string) => {
    switch (category) {
      case 'Podcast':
        return <Mic className="w-4 h-4 text-purple-400" />;
      case 'Beats':
        return <Disc className="w-4 h-4 text-indigo-400" />;
      case 'Acoustic':
        return <Music className="w-4 h-4 text-emerald-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="min-h-[calc(100vh-53px)] bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col justify-between p-4 md:p-8 lg:p-12 max-w-6xl mx-auto w-full transition-colors">
      <div className="space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-3 pt-4 md:pt-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-purple-500/10 dark:bg-purple-600/20 border border-purple-500/20 dark:border-purple-500/30 text-purple-600 dark:text-purple-400 mb-2">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Audio Studio AI
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Professional browser-native audio editing suite. Precision cut, multi-track timeline, spectral noise cleaning, and studio-grade export.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={onNewProject}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 active:bg-purple-700 rounded-xl shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>New Empty Project</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-neutral-700/60 rounded-xl shadow-xs transition-all"
            >
              <UploadCloud className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              <span>Import Audio File</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 md:p-10 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-purple-500 bg-purple-500/10 dark:bg-purple-950/20 scale-[1.01]'
              : 'border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 bg-white/60 dark:bg-neutral-900/40 hover:bg-white dark:hover:bg-neutral-900/70 shadow-xs'
          }`}
        >
          <div className="w-12 h-12 mx-auto rounded-xl bg-purple-50 dark:bg-neutral-800/80 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
            Drag & drop audio files here, or click to browse
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Supports MP3, WAV, M4A, AAC, OGG, and FLAC (Lossless processing in browser)
          </p>
        </div>

        {/* Quick Start with Pre-made Samples */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            <span>Or try instant demo audio (Ready offline)</span>
            <span className="text-neutral-400 dark:text-neutral-500 normal-case">No upload needed</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SAMPLE_AUDIO_PRESETS.map((sample) => (
              <button
                key={sample.id}
                onClick={() => onLoadSample(sample.id)}
                className="flex flex-col text-left p-4 rounded-xl bg-white dark:bg-neutral-900/60 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-800 hover:border-purple-300 dark:hover:border-neutral-700 shadow-xs transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getSampleIcon(sample.category)}
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{sample.category}</span>
                  </div>
                  <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">{sample.duration}s</span>
                </div>
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors mb-1">
                  {sample.name}
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                  {sample.description}
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium group-hover:translate-x-1 transition-transform">
                  <span>Open in Editor</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Projects Section */}
        {recentProjects.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              <span>Recent Projects</span>
              <span className="text-neutral-400 dark:text-neutral-500 normal-case">{recentProjects.length} saved</span>
            </div>

            <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-xl divide-y divide-neutral-100 dark:divide-neutral-800/80 shadow-xs overflow-hidden">
              {recentProjects.map((proj) => (
                <div
                  key={proj.id}
                  className="flex items-center justify-between p-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors gap-3"
                >
                  <div
                    onClick={() => onOpenProject(proj.id)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                  >
                    <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-neutral-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                      <FileAudio className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate hover:text-purple-600 dark:hover:text-purple-300 transition-colors">
                        {proj.name}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                        <span>{formatTime(proj.duration)}</span>
                        <span>·</span>
                        <span>{proj.trackCount} {proj.trackCount === 1 ? 'track' : 'tracks'}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1 font-sans">
                          <Clock className="w-3 h-3" />
                          {new Date(proj.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onRenameProject(proj.id, proj.name)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
                      title="Rename Project"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteProject(proj.id, proj.name)}
                      className="p-1.5 text-neutral-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onOpenProject(proj.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors ml-2"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>Open</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <footer className="mt-12 pt-6 border-t border-neutral-200 dark:border-neutral-900 text-center text-xs text-neutral-400 dark:text-neutral-500">
        <p>Audio Studio AI — Fast, local, private in-browser digital audio editing workstation.</p>
      </footer>
    </div>
  );
};
