/**
 * Shared YouTube URL helpers — a funnel's `videoUrl` field holds EITHER a
 * pasted YouTube link OR a directly uploaded video file's URL (see
 * admin/pages/FunnelForm.jsx), so both the admin form and the public
 * FunnelPage need the exact same way of telling the two apart.
 */
export function youtubeEmbedUrl(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export function isYoutubeUrl(url) {
  return Boolean(youtubeEmbedUrl(url));
}
