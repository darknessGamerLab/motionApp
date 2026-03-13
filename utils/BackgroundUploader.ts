import { supabase } from '@/lib/supabase';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Video } from 'react-native-compressor';

export interface UploadOptions {
  videoUri: string;
  userId: string;
  accessToken: string;
  description?: string;
  topic?: string;
  category?: string;
  onProgress?: (progress: number) => void;
  onSuccess?: (videoUrl: string) => void;
  onError?: (error: Error) => void;
}

export const uploadVideoSilently = async ({
  videoUri,
  userId,
  accessToken,
  description,
  topic,
  category,
  onProgress,
  onSuccess,
  onError
}: UploadOptions) => {
  try {
    // 1. COMPRESS (0-40% progress)
    onProgress?.(10);
    const compressedUri = await Video.compress(
      videoUri,
      {
        compressionMethod: 'auto',
        minimumFileSizeForCompress: 2,
        bitrateMultiplier: 0.8,
      } as any,
      (p) => onProgress?.(10 + p * 30) // Maps 0-1 to 10-40
    );

    // 2. PREPARE VIDEO
    onProgress?.(45);
    const fileExt = compressedUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'mp4';
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    let mimeType = `video/${fileExt}`;
    if (fileExt === 'mov') mimeType = 'video/quicktime';
    else if (fileExt === 'm4v') mimeType = 'video/x-m4v';

    const formData = new FormData();
    formData.append('file', {
      uri: compressedUri,
      name: `video.${fileExt}`,
      type: mimeType as any,
    } as any);

    // 3. UPLOAD VIDEO (45-75% progress)
    onProgress?.(55);
    const uploadResp = await fetch(
      `https://mhgxrzejobmkuwylyelx.supabase.co/storage/v1/object/videos/${fileName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Cache-Control': 'max-age=31536000',
        },
        body: formData as any,
      }
    );

    if (!uploadResp.ok) throw new Error(`Video upload failed: ${await uploadResp.text()}`);
    const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    // 4. GENERATE & UPLOAD THUMBNAIL (75-90% progress)
    onProgress?.(80);
    let thumbnailUrl = '';
    try {
      const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 1000 });
      const thumbExt = 'jpg';
      const thumbName = `${userId}/thumb_${Date.now()}.${thumbExt}`;
      const thumbFormData = new FormData();
      thumbFormData.append('file', { uri: thumbUri, name: `thumb.${thumbExt}`, type: 'image/jpeg' } as any);

      const thumbResp = await fetch(
        `https://mhgxrzejobmkuwylyelx.supabase.co/storage/v1/object/thumbnails/${thumbName}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Cache-Control': 'max-age=31536000' },
          body: thumbFormData as any,
        }
      );
      if (thumbResp.ok) {
        thumbnailUrl = supabase.storage.from('thumbnails').getPublicUrl(thumbName).data.publicUrl;
      }
    } catch (e) { console.log('Thumbnail error (silent):', e); }

    // 5. INSERT INTO DB (90-100% progress)
    onProgress?.(95);
    const { error: dbError } = await (supabase as any)
      .from('videos')
      .insert({
        user_id: userId,
        video_url: publicUrl,
        thumbnail_url: thumbnailUrl || '',
        description: description || '',
        topic: topic,
        category: category,
      });

    if (dbError) throw dbError;

    // FINISH
    onProgress?.(100);
    onSuccess?.(publicUrl);

  } catch (err: any) {
    console.error('Silent Upload Error:', err);
    onError?.(err);
  }
};
