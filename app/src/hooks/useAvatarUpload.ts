import { useMutation } from '@tanstack/react-query';

import { client } from '@/api/client';

interface PresignedUrlResponse {
  upload_url: string;
  public_url: string;
}

async function uploadAvatar(localUri: string): Promise<string> {
  const blob = await (await fetch(localUri)).blob();
  const contentType = blob.type || 'image/jpeg';

  const { data: presigned } = await client.post<PresignedUrlResponse>(
    '/users/me/avatar-upload-url/',
    { content_type: contentType, file_size: blob.size },
  );
  await fetch(presigned.upload_url, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': contentType },
  });
  return presigned.public_url;
}

export function useAvatarUpload() {
  return useMutation({ mutationFn: uploadAvatar });
}
