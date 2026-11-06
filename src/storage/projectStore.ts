/**
 * IndexedDB and Local Storage Project Manager
 * Supports full project persistence including track clips, AudioBuffers, and settings.
 */

import { AudioProject, AudioTrack, AudioClip } from '../types/audio';
import { getAudioContext } from '../utils/audioContext';

const DB_NAME = 'AudioStudioAI_DB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

interface SerializedClip {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  offset: number;
  volume: number;
  sampleRate: number;
  channels: number;
  channelData: Float32Array[];
}

interface SerializedTrack {
  id: string;
  name: string;
  color: string;
  volume: number;
  pan: number;
  isMuted: boolean;
  isSolo: boolean;
  clips: SerializedClip[];
}

interface SerializedProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  tracks: SerializedTrack[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  duration: number;
  trackCount: number;
  clipCount: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Serializes an AudioProject with its AudioBuffers for storage.
 */
function serializeProject(project: AudioProject): SerializedProject {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: Date.now(),
    tracks: project.tracks.map((track) => ({
      id: track.id,
      name: track.name,
      color: track.color,
      volume: track.volume,
      pan: track.pan,
      isMuted: track.isMuted,
      isSolo: track.isSolo,
      clips: track.clips.map((clip) => {
        const channels: Float32Array[] = [];
        if (clip.buffer) {
          for (let c = 0; c < clip.buffer.numberOfChannels; c++) {
            channels.push(clip.buffer.getChannelData(c));
          }
        }
        return {
          id: clip.id,
          name: clip.name,
          startTime: clip.startTime,
          duration: clip.duration,
          offset: clip.offset,
          volume: clip.volume,
          sampleRate: clip.buffer?.sampleRate || 44100,
          channels: clip.buffer?.numberOfChannels || 2,
          channelData: channels,
        };
      }),
    })),
  };
}

/**
 * Deserializes stored data back into an AudioProject with live AudioBuffers.
 */
function deserializeProject(data: SerializedProject): AudioProject {
  const ctx = getAudioContext();

  const tracks: AudioTrack[] = data.tracks.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    volume: t.volume,
    pan: t.pan,
    isMuted: t.isMuted,
    isSolo: t.isSolo,
    clips: t.clips.map((c) => {
      const numChannels = c.channels || 2;
      const length = c.channelData[0]?.length || Math.ceil(c.duration * (c.sampleRate || 44100));
      const buffer = ctx.createBuffer(numChannels, length, c.sampleRate || 44100);

      for (let ch = 0; ch < numChannels && ch < c.channelData.length; ch++) {
        buffer.getChannelData(ch).set(c.channelData[ch]);
      }

      return {
        id: c.id,
        name: c.name,
        startTime: c.startTime,
        duration: c.duration,
        offset: c.offset,
        volume: c.volume,
        buffer,
      };
    }),
  }));

  return {
    id: data.id,
    name: data.name,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    tracks,
  };
}

/**
 * Save project to IndexedDB.
 */
export async function saveProjectToStorage(project: AudioProject): Promise<void> {
  try {
    const db = await openDB();
    const serialized = serializeProject(project);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(serialized);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to save project to IndexedDB:', err);
  }
}

/**
 * Load project by ID from IndexedDB.
 */
export async function loadProjectFromStorage(id: string): Promise<AudioProject | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        if (!req.result) {
          resolve(null);
          return;
        }
        try {
          resolve(deserializeProject(req.result));
        } catch (e) {
          reject(e);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to load project from IndexedDB:', err);
    return null;
  }
}

/**
 * Get summaries of all saved projects for recent projects list.
 */
export async function getProjectSummaries(): Promise<ProjectSummary[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = req.result as SerializedProject[];
        const summaries: ProjectSummary[] = results.map((p) => {
          let maxDuration = 0;
          let clipCount = 0;
          p.tracks.forEach((t) => {
            clipCount += t.clips.length;
            t.clips.forEach((c) => {
              const end = c.startTime + c.duration;
              if (end > maxDuration) maxDuration = end;
            });
          });

          return {
            id: p.id,
            name: p.name,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            duration: maxDuration,
            trackCount: p.tracks.length,
            clipCount,
          };
        });

        // Sort descending by most recently updated
        summaries.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(summaries);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to get project summaries:', err);
    return [];
  }
}

/**
 * Delete a project by ID from IndexedDB.
 */
export async function deleteProjectFromStorage(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to delete project:', err);
  }
}
