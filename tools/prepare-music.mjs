import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes, createCipheriv } from 'node:crypto';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name) => args[args.indexOf(name) + 1];
if (!args.includes('--library') || !args.includes('--ffmpeg')) {
  throw new Error('Usage: node tools/prepare-music.mjs --library /path/to/library --ffmpeg /path/to/ffmpeg');
}
const library = path.resolve(option('--library'));
const ffmpeg = option('--ffmpeg');
const output = args.includes('--output') ? path.resolve(option('--output')) : path.join(root, 'source/music');
const bitrate = args.includes('--bitrate') ? option('--bitrate') : '128k';
if (!/^\d+k$/.test(bitrate)) throw new Error('Bitrate must be a value such as 72k or 128k');
const cache = path.join(root, '.music-cache');
await fs.mkdir(path.join(output, 'encrypted'), { recursive: true });
await fs.mkdir(cache, { recursive: true });
const readJSON = async (name) => JSON.parse(await fs.readFile(path.join(library, name), 'utf8'));
const qq = (await readJSON('manifest-qqmusic.json')).filter((track) => track.status === 'ready');
const base = (await readJSON('manifest.json')).filter((track) => track.status === 'ready');
const sources = [...qq.map((track) => ({ ...track, input: track.file })), ...base.map((track) => ({ ...track, input: track.web }))];
const seen = new Set();
const tracks = [];
for (const track of sources) {
  const identity = `${track.title.trim().toLowerCase()}|${track.artist.trim().toLowerCase()}`;
  if (seen.has(identity)) continue;
  await fs.access(path.join(library, track.input));
  seen.add(identity);
  tracks.push({ ...track, id: createHash('sha256').update(identity).digest('hex').slice(0, 20) });
}
const key = randomBytes(32);
const ivs = new Set();
const results = new Array(tracks.length);
let cursor = 0;
let complete = 0;
const transcode = (input, destination) => new Promise((resolve, reject) => {
  const child = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-vn', '-map_metadata', '-1', '-c:a', 'aac', '-b:a', bitrate, '-movflags', '+faststart', destination], { stdio: ['ignore', 'ignore', 'pipe'] });
  let error = '';
  child.stderr.on('data', (data) => { error += data; });
  child.once('error', reject);
  child.once('close', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg: ${error}`)));
});
async function worker() {
  while (cursor < tracks.length) {
    const index = cursor++;
    const track = tracks[index];
    const converted = path.join(cache, `${track.id}.m4a`);
    await transcode(path.join(library, track.input), converted);
    const plain = await fs.readFile(converted);
    let iv;
    do { iv = randomBytes(12); } while (ivs.has(iv.toString('hex')));
    ivs.add(iv.toString('hex'));
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(track.id));
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final(), cipher.getAuthTag()]);
    const file = `encrypted/${track.id}.enc`;
    await fs.writeFile(path.join(output, file), encrypted);
    results[index] = { id: track.id, title: track.title, artist: track.artist, duration: track.duration,
      source: track.source_url || track.source, mime: 'audio/mp4', file,
      iv: iv.toString('base64'), bytes: encrypted.length,
      sha256: createHash('sha256').update(encrypted).digest('hex'),
      audioSha256: createHash('sha256').update(plain).digest('hex') };
    complete++;
    if (complete % 10 === 0 || complete === tracks.length) console.log(`Prepared ${complete}/${tracks.length} encrypted tracks`);
  }
}
await Promise.all(Array.from({ length: 3 }, worker));
await fs.writeFile(path.join(output, 'playlist.json'), JSON.stringify({ version: 1, algorithm: 'AES-256-GCM', audioBitrate: bitrate, key: key.toString('base64'), tracks: results }, null, 2) + '\n');
console.log(`Encrypted library ready: ${results.length} tracks, ${(results.reduce((sum, t) => sum + t.bytes, 0) / 1024 / 1024).toFixed(1)} MiB. Originals unchanged.`);
