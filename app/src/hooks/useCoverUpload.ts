import { useMutation } from '@tanstack/react-query';

import { client } from '@/api/client';

interface PresignedUrlResponse {
  upload_url: string;
  public_url: string;
  key: string;
}

async function uploadCover(localUri: string, communityId: string): Promise<void> {
  const blob = await (await fetch(localUri)).blob();
  const contentType = blob.type || 'image/jpeg';

  const { data: presigned } = await client.post<PresignedUrlResponse>(
    `/communities/${communityId}/cover-upload-url/`,
    { content_type: contentType, file_size: blob.size },
  );

  await fetch(presigned.upload_url, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': contentType },
  });
}

export function useCoverUpload() {
  return useMutation({
    mutationFn: ({ localUri, communityId }: { localUri: string; communityId: string }) =>
      uploadCover(localUri, communityId),
  });
}
