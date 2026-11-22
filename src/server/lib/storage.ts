/**
 * Supabase Storage adapter (service-role key, server only).
 *
 * The browser never receives the service key: it gets a one-time signed upload
 * token for ONE server-chosen path, and the backend later downloads the object
 * to validate it. UploadService depends on the small `StorageAdapter` interface
 * so tests can inject an in-memory fake.
 */
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/server/config/env";

export interface StorageAdapter {
  bucket: string;
  createSignedUpload(path: string): Promise<{ path: string; token: string; signedUrl: string }>;
  downloadObject(path: string): Promise<Uint8Array>;
  removeObject(path: string): Promise<void>;
}

let client: SupabaseClient | null = null;

function admin(): SupabaseClient {
  if (!client) {
    const env = getServerEnv();
    client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export function createSupabaseStorage(): StorageAdapter {
  const bucket = getServerEnv().SUPABASE_STORAGE_BUCKET;
  return {
    bucket,
    async createSignedUpload(path) {
      const { data, error } = await admin().storage.from(bucket).createSignedUploadUrl(path);
      if (error || !data) throw new Error(`Could not create signed upload URL: ${error?.message}`);
      return data;
    },
    async downloadObject(path) {
      const { data, error } = await admin().storage.from(bucket).download(path);
      if (error || !data) throw new Error(`Could not download upload: ${error?.message}`);
      return new Uint8Array(await data.arrayBuffer());
    },
    async removeObject(path) {
      await admin().storage.from(bucket).remove([path]);
    },
  };
}
