import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SECURE_STORE_CHUNK_LIMIT = 1800;
const CHUNK_MANIFEST_SUFFIX = '.chunks';

type ChunkManifest = {
  generation: string;
  count: number;
};

let storageGeneration = 0;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

function parseChunkManifest(
  value: string | null
): ChunkManifest | 'deleted' | null {
  if (value === null) return null;
  if (value === 'deleted') return 'deleted';

  const match = /^([a-z0-9-]+):(\d+)$/i.exec(value);
  const count = match ? Number(match[2]) : Number.NaN;

  if (!match || !Number.isSafeInteger(count) || count < 1 || count > 10000) {
    throw new Error('Stored authentication data has an invalid manifest.');
  }

  return { generation: match[1], count };
}

function splitSecureStoreValue(value: string): string[] {
  const chunks: string[] = [];
  let chunk = '';
  let chunkBytes = 0;

  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) {
      throw new Error('Unable to encode authentication storage data.');
    }

    const characterBytes =
      codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;

    if (chunk && chunkBytes + characterBytes > SECURE_STORE_CHUNK_LIMIT) {
      chunks.push(chunk);
      chunk = '';
      chunkBytes = 0;
    }

    chunk += character;
    chunkBytes += characterBytes;
  }

  if (chunk) chunks.push(chunk);
  return chunks;
}

function chunkKey(key: string, generation: string, index: number): string {
  return `${key}.chunk.${generation}.${index}`;
}

async function removeStoredChunks(
  key: string,
  manifest: ChunkManifest
): Promise<void> {
  await Promise.all(
    Array.from({ length: manifest.count }, (_, index) =>
      SecureStore.deleteItemAsync(
        chunkKey(key, manifest.generation, index)
      )
    )
  );
}

const secureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    const manifest = parseChunkManifest(
      await SecureStore.getItemAsync(`${key}${CHUNK_MANIFEST_SUFFIX}`)
    );

    if (manifest === 'deleted') return null;
    if (!manifest) return SecureStore.getItemAsync(key);

    const chunks = await Promise.all(
      Array.from({ length: manifest.count }, (_, index) =>
        SecureStore.getItemAsync(
          chunkKey(key, manifest.generation, index)
        )
      )
    );

    if (chunks.some((chunk) => chunk === null)) {
      throw new Error('Stored authentication data is incomplete.');
    }

    return chunks.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const manifestKey = `${key}${CHUNK_MANIFEST_SUFFIX}`;
    const previousManifest = parseChunkManifest(
      await SecureStore.getItemAsync(manifestKey)
    );
    const chunks = splitSecureStoreValue(value);

    if (chunks.length <= 1) {
      await SecureStore.setItemAsync(key, value);
      await SecureStore.deleteItemAsync(manifestKey);

      if (previousManifest && previousManifest !== 'deleted') {
        await removeStoredChunks(key, previousManifest);
      }

      return;
    }

    const generation =
      `${Date.now().toString(36)}-${(++storageGeneration).toString(36)}-` +
      Math.random().toString(36).slice(2);
    const nextManifest = `${generation}:${chunks.length}`;

    for (const [index, chunk] of chunks.entries()) {
      await SecureStore.setItemAsync(
        chunkKey(key, generation, index),
        chunk
      );
    }

    await SecureStore.setItemAsync(manifestKey, nextManifest);
    await SecureStore.deleteItemAsync(key);

    if (
      previousManifest &&
      previousManifest !== 'deleted' &&
      previousManifest.generation !== generation
    ) {
      await removeStoredChunks(key, previousManifest);
    }
  },

  async removeItem(key: string): Promise<void> {
    const manifestKey = `${key}${CHUNK_MANIFEST_SUFFIX}`;
    const manifest = parseChunkManifest(
      await SecureStore.getItemAsync(manifestKey)
    );

    if (manifest) {
      await SecureStore.setItemAsync(manifestKey, 'deleted');
      await SecureStore.deleteItemAsync(key);

      if (manifest !== 'deleted') {
        await removeStoredChunks(key, manifest);
      }

      await SecureStore.deleteItemAsync(manifestKey);
      return;
    }

    await SecureStore.deleteItemAsync(key);
  },
};

const authStorage =
  Platform.OS === 'web'
    ? {
        getItem: async (key: string) =>
          typeof localStorage === 'undefined'
            ? null
            : localStorage.getItem(key),
        setItem: async (key: string, value: string) => {
          if (typeof localStorage === 'undefined') {
            throw new Error('Browser storage is unavailable.');
          }

          localStorage.setItem(key, value);
        },
        removeItem: async (key: string) => {
          if (typeof localStorage === 'undefined') {
            throw new Error('Browser storage is unavailable.');
          }

          localStorage.removeItem(key);
        },
      }
    : {
        getItem: secureStoreAdapter.getItem,
        setItem: secureStoreAdapter.setItem,
        removeItem: secureStoreAdapter.removeItem,
      };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: authStorage,
  },
});