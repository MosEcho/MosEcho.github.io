import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { decryptTrack, importPlaybackKey, shuffle } from '../source/assets/music-crypto.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const playlist = JSON.parse(await fs.readFile(path.join(root, 'source/music/playlist.json'), 'utf8'));
const key = await importPlaybackKey(playlist.key);
const encrypted = (track) => fs.readFile(path.join(root, 'source/music', track.file));

test('every published song decrypts to its prepared audio; IVs are unique', async () => {
  assert.ok(playlist.tracks.length > 0);
  assert.equal(new Set(playlist.tracks.map((track) => track.id)).size, playlist.tracks.length);
  assert.equal(new Set(playlist.tracks.map((track) => track.iv)).size, playlist.tracks.length);
  for (const track of playlist.tracks) {
    const bytes = await encrypted(track);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), track.sha256);
    const decoded = Buffer.from(await decryptTrack(key, track, bytes));
    assert.equal(createHash('sha256').update(decoded).digest('hex'), track.audioSha256, track.title);
    assert.equal(decoded.toString('ascii', 4, 8), 'ftyp', track.title);
    assert.ok(!bytes.subarray(0, 16).equals(decoded.subarray(0, 16)));
  }
});

test('GCM rejects altered audio, a different song identity, and an incorrect key', async () => {
  const track = playlist.tracks[0];
  const bytes = await encrypted(track);
  const damaged = Buffer.from(bytes);
  damaged[damaged.length - 1] ^= 1;
  await assert.rejects(decryptTrack(key, track, damaged), { name: 'OperationError' });
  await assert.rejects(decryptTrack(key, { ...track, id: 'wrong-track' }, bytes), { name: 'OperationError' });
  const wrongKey = await importPlaybackKey(randomBytes(32).toString('base64'));
  await assert.rejects(decryptTrack(wrongKey, track, bytes), { name: 'OperationError' });
});

test('random order contains each song once and preserves the source catalog', () => {
  const ids = playlist.tracks.map((track) => track.id);
  const original = [...ids];
  const order = shuffle(ids, () => 0);
  assert.deepEqual(ids, original);
  assert.deepEqual([...order].sort(), [...ids].sort());
  if (ids.length > 1) assert.notDeepEqual(order, original);
});

test('published music contains encrypted assets and metadata, no clear audio', async () => {
  const names = await fs.readdir(path.join(root, 'source/music'));
  assert.deepEqual(names.sort(), ['encrypted', 'playlist.json']);
  const files = await fs.readdir(path.join(root, 'source/music/encrypted'));
  assert.equal(files.length, playlist.tracks.length);
  assert.ok(files.every((file) => file.endsWith('.enc')));
  assert.ok(!JSON.stringify(playlist).includes('/Users/'));
});
