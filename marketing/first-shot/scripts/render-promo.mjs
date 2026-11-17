import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';

const input = resolve(process.argv[2] || '/tmp/gravitygolf-promo/take-03/gameplay-raw.webm');
const output = resolve(process.argv[3] || '/tmp/gravitygolf-promo/gravity-golf-first-shot.mp4');
const capture = JSON.parse(await readFile(resolve(dirname(input), 'capture.json'), 'utf8'));
const completion = capture.samples.find(sample => sample.state.mode === 'hole_complete');
if (!completion || completion.state.hole !== 1 || completion.state.strokes !== 1 ||
    !completion.state.aim.assisted || (completion.at - capture.recorder.startedAt) / 1000 > 3.9) {
  throw new Error('This fixed cut requires a verified assisted Hole 1 completion before 3.9 seconds');
}
await mkdir(dirname(output), { recursive: true });
const font = '/System/Library/Fonts/Avenir Next.ttc';
const ffmpeg = process.env.FFMPEG || '/opt/homebrew/bin/ffmpeg';
const filters = ['fps=30:start_time=0', 'scale=1080:1920:flags=lanczos', 'setsar=1', 'tpad=stop_mode=clone:stop_duration=1'];
const box = (x, y, w, h, color, enable) => filters.push(
  `drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=${color}:t=fill${enable ? `:enable='${enable}'` : ''}`);
const text = (value, size, y, color, enable, extra = '') => filters.push(
  `drawtext=fontfile='${font}':text='${value}':expansion=none:fontsize=${size}:fontcolor=${color}:x=(w-tw)/2:y=${y}:shadowcolor=black@0.6:shadowx=0:shadowy=3${enable ? `:enable='${enable}'` : ''}${extra}`);

box(0, 0, 'iw', 430, '0x08060c@0.72', 'lt(t,1.7)');
text('GOLF THE', 84, 170, '0xffeb9b', 'lt(t,1.7)');
text('IMPOSSIBLE.', 100, 270, '0xffd83d', 'lt(t,1.7)', ':borderw=1:bordercolor=0xffd83d');

box(0, 0, 'iw', 420, '0x08060c@0.70', 'between(t,3.9,6)');
text('HOLE IN ONE.', 84, 190, '0xffdf5e', 'between(t,3.9,6)', ':borderw=1:bordercolor=0xffdf5e');
text('First hole. Built-in assisted route.', 34, 303, '0xfff0c9', 'between(t,3.9,6)');

box(0, 0, 'iw', 'ih', '0x08060c@0.87', 'gte(t,6)');
text('GRAVITY', 118, 630, '0xffdf5e', 'gte(t,6)', ':borderw=1:bordercolor=0xffdf5e');
text('GOLF', 118, 760, '0xffdf5e', 'gte(t,6)', ':borderw=1:bordercolor=0xffdf5e');
box(190, 945, 700, 2, '0xffd83d@0.7', 'gte(t,6)');
text('Play the free course', 46, 1035, '0xfff0d0', 'gte(t,6)');
box(140, 1130, 800, 120, '0xffdf5e', 'gte(t,6)');
text('gravitygolf.xyz', 63, 1156, '0x201602', 'gte(t,6)', ':shadowx=0:shadowy=0');
text('PLAYABLE WORK IN PROGRESS', 36, 1460, '0xcac0a3', 'gte(t,6)');

box(55, 72, 970, 55, '0x08060c@0.76');
text('LOCAL WIP / ASSISTED ROUTE', 36, 84, '0xe9d799');
text('GRAVITY GOLF', 33, 1640, '0xffdf5e', 'lt(t,6)');
filters.push('format=yuv420p');

const args = ['-hide_banner', '-n', '-i', input, '-map', '0:v:0', '-map', '0:a:0',
  '-vf', filters.join(','), '-af', 'afade=t=in:d=0.05,afade=t=out:st=9.35:d=0.65',
  '-t', '10', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-c:a', 'aac', '-b:a', '192k',
  '-movflags', '+faststart', '-metadata', 'title=Gravity Golf - First Shot - Local WIP',
  '-metadata', 'comment=Real local gameplay; built-in assisted route; no speed change; private marketing draft.', output];
execFileSync(ffmpeg, args, { stdio: 'inherit' });
await writeFile(output.replace(/\.mp4$/, '.edit.json'), JSON.stringify({
  input: 'source/gameplay-raw.webm', output: 'gravity-golf-first-shot.mp4',
  sourceSha256: createHash('sha256').update(await readFile(input)).digest('hex'),
  outputSha256: createHash('sha256').update(await readFile(output)).digest('hex'),
  durationSeconds: 10, size: '1080x1920', fps: 30,
  provenance: '720x1280 canvas capture with the game audio mix, upscaled. DOM HUD excluded from video; UI screenshots retained. Physics and game state unmodified.',
  edits: ['Real-time chronological footage, no speed changes or fabricated outcome',
    'Title 0-1.7s; verified result 3.9-6s; end card 6-10s',
    'Common original audio/video timestamps retained; only audio edge fades',
    'Final-frame hold allowed only after completion if capture ends before 10s'],
  releaseStatus: 'PRIVATE DRAFT. Owner approval, current live availability and soundtrack rights review required before posting.',
}, null, 2) + '\n');
