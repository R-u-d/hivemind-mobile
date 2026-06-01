import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const DRAFT_KEY = 'hm_event_draft';

export interface EventDraft {
  title?: string;
  description?: string;
  community?: string;
  location_text?: string;
  lat?: number | null;
  lng?: number | null;
  startAt?: string | null; // ISO string
  endAt?: string | null; // ISO string
  capacity?: string;
  coverUri?: string | null;
}

const webStorage = {
  getItemAsync: async (key: string): Promise<string | null> => localStorage.getItem(key),
  setItemAsync: async (key: string, value: string): Promise<void> => {
    localStorage.setItem(key, value);
  },
  deleteItemAsync: async (key: string): Promise<void> => {
    localStorage.removeItem(key);
  },
};

const storage = Platform.OS === 'web' ? webStorage : SecureStore;

export const eventDraftStorage = {
  load: async (): Promise<EventDraft | null> => {
    try {
      const raw = await storage.getItemAsync(DRAFT_KEY);
      return raw ? (JSON.parse(raw) as EventDraft) : null;
    } catch {
      return null;
    }
  },
  save: (draft: EventDraft) => storage.setItemAsync(DRAFT_KEY, JSON.stringify(draft)),
  clear: () => storage.deleteItemAsync(DRAFT_KEY),
};
