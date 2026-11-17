import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(process.argv[2]);
const root = resolve(process.argv[3]);
const capture = JSON.parse(await readFile(join(root, 'capture/capture.json'), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const ffmpeg = process.env.FFMPEG || '/opt/homebrew/bin/ffmpeg';
const ffprobe = process.env.FFPROBE || '/opt/homebrew/bin/ffprobe';
const output = join(root, 'gravity-golf-desktop-gameplay-draft.mp4');
const music = join(repo, 'soundtrack.mp3');
const logo = join(repo, 'marketing/store-art-2026-09-11/png/library-logo.png');
const font = '/System/Library/Fonts/Avenir Next.ttc';
assert.equal(capture.status, 'private-raw-video-captured');
assert.deepEqual(capture.errors, []);
assert.deepEqual(capture.externalRendererRequests, []);
assert.equal(capture.source.sourceIndexSha256, hash(await readFile(join(repo, 'index.html'))));
assert.equal(capture.source.inputs['soundtrack.mp3'], hash(await readFile(music)));
const cuts = [
  { hole: 1, start: 7.4, seconds: 7, note: 'Aim, launch and actual one-stroke completion' },
  { hole: 6, start: 8.8, seconds: 10, note: 'Aim and first flight; no hole completion claim' },
  { hole: 11, start: 12.4, seconds: 10, note: 'Aim and first flight; no hole completion claim' },
];
const inputs = [];
for (const cut of cuts) {
  const take = capture.holes.find(take => take.hole === cut.hole);
  assert(take && take.samples.some(sample => sample.state.strokes === 1 && sample.state.mode === 'flight'));
  assert(take.samples.some(sample => sample.action === 'fire' && sample.state.aim.assisted));
  if (cut.hole === 1) assert(take.samples.some(sample => sample.state.mode === 'hole_complete' && sample.state.strokes === 1));
  const file = join(root, 'capture', take.file);
  assert.equal(hash(await readFile(file)), take.videoSha256);
  const probe = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }));
  assert.equal(probe.streams.length, 1);
  assert.equal(probe.streams[0].width, 1920);
  assert.equal(probe.streams[0].height, 1080);
  assert.equal(probe.streams[0].avg_frame_rate, '25/1');
  assert(Number(probe.format.duration) >= cut.start + cut.seconds);
  cut.source = `capture/${take.file}`;
  cut.sourceSha256 = take.videoSha256;
  inputs.push('-ss', String(cut.start), '-t', String(cut.seconds), '-i', file);
}
await mkdir(join(root, 'review'), { recursive: true });
await mkdir(join(root, 'source'), { recursive: true });
await copyFile(logo, join(root, 'source/library-logo.png'));
const filters = cuts.map((cut, i) => `[${i}:v]fps=30,setpts=PTS-STARTPTS,setsar=1,format=yuv420p[v${i}]`);
filters.push('[v0][v1][v2]concat=n=3:v=1:a=0[game]');
filters.push("[game]drawbox=x=28:y=994:w=626:h=58:color=0x070a0f@0.86:t=fill," +
  `drawtext=fontfile='${font}':text='LOCAL DESKTOP BUILD / ASSISTED AIM':expansion=none:fontsize=28:fontcolor=0xf4dda4:x=45:y=1009[marked]`);
filters.push('[3:v][4:v]overlay=x=(W-w)/2:y=230:shortest=1[card]');
filters.push(`[card]drawtext=fontfile='${font}':text='PLAYABLE WORK IN PROGRESS':expansion=none:fontsize=38:fontcolor=0xe7d5a7:x=(w-tw)/2:y=810,format=yuv420p[end]`);
filters.push('[marked][end]concat=n=2:v=1:a=0[v]');
// Music is an editorial bed, not a claim that the raw renderer video has live audio.
filters.push('[5:a]atrim=0:30,asetpts=PTS-STARTPTS,loudnorm=I=-18:TP=-1.5:LRA=11,aresample=48000,afade=t=in:d=0.25,afade=t=out:st=28.5:d=1.5[a]');
const args = ['-hide_banner', '-loglevel', 'warning', '-n', ...inputs,
  '-f', 'lavfi', '-i', 'color=c=0x080d14:s=1920x1080:r=30:d=3',
  '-loop', '1', '-framerate', '30', '-t', '3', '-i', join(root, 'source/library-logo.png'),
  '-i', music, '-filter_complex', filters.join(';'), '-map', '[v]', '-map', '[a]',
  '-t', '30', '-c:v', 'libx264', '-preset', 'medium', '-b:v', '8M', '-minrate', '8M', '-maxrate', '8M', '-bufsize', '16M',
  '-x264-params', 'nal-hrd=cbr:force-cfr=1', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
  '-movflags', '+faststart', '-metadata', 'title=Gravity Golf - Desktop Gameplay - Private Draft',
  '-metadata', 'comment=Real native gameplay with assisted aim. Editorial music bed. Local work in progress; not a release or performance benchmark.', output];
execFileSync(ffmpeg, args, { stdio: 'inherit' });
const metadata = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', output], { encoding: 'utf8' }));
await writeFile(join(root, 'edit.json'), JSON.stringify({ status: 'private-owner-review',
  output: 'gravity-golf-desktop-gameplay-draft.mp4', outputSha256: hash(await readFile(output)),
  archiveSha256: capture.archiveSha256, sourceIndexSha256: capture.source.sourceIndexSha256,
  captureReceiptSha256: hash(await readFile(join(root, 'capture/capture.json'))),
  renderScriptSha256: hash(await readFile(fileURLToPath(import.meta.url))),
  cuts, endCardSeconds: 3, durationSeconds: 30,
  video: '27s of real gameplay with original HUD plus a 3s static title card. Hard cuts, no camera/physics/state manipulation, no speed changes, no frame interpolation. 25fps source conformed to 30fps by duplicating frames; this does not demonstrate 30fps game performance.',
  audio: { source: 'soundtrack.mp3', sha256: hash(await readFile(music)),
    use: 'First 30 seconds as an edited music bed, normalized and edge-faded. Raw renderer captures are silent; no gameplay SFX or live audio claimed.',
    humanListeningComplete: false, rightsCleared: false },
  logo: { source: 'source/library-logo.png', sha256: hash(await readFile(logo)), ownerApproved: false },
  release: { uploaded: false, published: false, ownerApproved: false, storeAccepted: false },
  metadata,
}, null, 2) + '\n');
for (const time of [0, 2, 4, 6, 7, 10, 14, 16, 17, 20, 24, 26, 27, 29]) {
  execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-n', '-ss', String(time), '-i', output,
    '-frames:v', '1', join(root, 'review', `frame-${String(time).padStart(2, '0')}.png`)]);
}
execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-n', '-i', output,
  '-vf', 'fps=1/2,scale=384:216,tile=5x3', '-frames:v', '1', join(root, 'review/contact-sheet.png')]);
console.log(JSON.stringify({ output, status: 'private-owner-review', durationSeconds: 30 }));
