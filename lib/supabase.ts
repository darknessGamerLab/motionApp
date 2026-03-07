import { Database } from '@/types/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mhgxrzejobmkuwylyelx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZ3hyemVqb2Jta3V3eWx5ZWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODY0NDksImV4cCI6MjA4MzE2MjQ0OX0.8IDCg303cgOsglyydOPm_-GBQaEJNKBFEZk8NrtSK24';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Storage bucket URLs
export const STORAGE_URL = `${supabaseUrl}/storage/v1/object/public`;
export const AVATARS_BUCKET = 'avatars';
export const VIDEOS_BUCKET = 'videos';
export const THUMBNAILS_BUCKET = 'thumbnails';

// Helper to get public URL for storage items
export const getPublicUrl = (bucket: string, path: string) => {
  return `${STORAGE_URL}/${bucket}/${path}`;
};

// Helper to upload file to storage
export const uploadFile = async (
  bucket: string,
  path: string,
  file: Blob | ArrayBuffer,
  contentType: string
) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType,
      upsert: true,
    });

  if (error) throw error;
  return getPublicUrl(bucket, data.path);
};

// Helper to delete file from storage
export const deleteFile = async (bucket: string, path: string) => {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
};

