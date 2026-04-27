export async function uploadCourseThumbnail(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload/image", {
    method: "POST",
    body: formData,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success || !payload?.data?.url) {
    throw new Error(payload?.error ?? "Failed to upload thumbnail");
  }

  return payload.data.url as string;
}
