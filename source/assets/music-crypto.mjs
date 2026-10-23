// This is client-side packaging protection, not DRM. The playback key is public.
export function fromBase64(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

export async function importPlaybackKey(value) {
  return crypto.subtle.importKey('raw', fromBase64(value), 'AES-GCM', false, ['decrypt']);
}

export async function decryptTrack(key, track, encrypted) {
  return crypto.subtle.decrypt({
    name: 'AES-GCM', iv: fromBase64(track.iv),
    additionalData: new TextEncoder().encode(track.id), tagLength: 128,
  }, key, encrypted);
}

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
