import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const repo = resolve(process.argv[2]);
const root = resolve(process.argv[3]);
const ffmpeg = process.env.FFMPEG || '/opt/homebrew/bin/ffmpeg';
const ffprobe = process.env.FFPROBE || '/opt/homebrew/bin/ffprobe';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const edit = JSON.parse(await readFile(join(root, 'edit.json'), 'utf8'));
const receiptBytes = await readFile(join(root, 'capture/capture.json'));
const capture = JSON.parse(receiptBytes);
assert.equal(edit.status, 'private-owner-review');
assert.equal(capture.status, 'private-raw-video-captured');
assert.deepEqual(capture.errors, []);
assert.deepEqual(capture.externalRendererRequests, []);
assert.equal(edit.captureReceiptSha256, hash(receiptBytes));
assert.equal(edit.renderScriptSha256, hash(await readFile(join(root, 'scripts/render-trailer.mjs'))));
assert.equal(edit.sourceIndexSha256, hash(await readFile(join(repo, 'index.html'))));
assert.equal(edit.audio.sha256, hash(await readFile(join(repo, 'soundtrack.mp3'))));
assert.equal(edit.logo.sha256, hash(await readFile(join(root, 'source/library-logo.png'))));
const archive = join(repo, 'desktop/out/Gravity Golf Prototype-darwin-arm64/Gravity Golf Prototype.app/Contents/Resources/app.asar');
assert.equal(edit.archiveSha256, hash(await readFile(archive)));
assert.equal(capture.archiveSha256, edit.archiveSha256);
assert.deepEqual(edit.cuts.map(cut => cut.hole), [1, 6, 11]);
assert.equal(edit.cuts.reduce((sum, cut) => sum + cut.seconds, 0), 27);
assert.equal(edit.endCardSeconds, 3);
for (const cut of edit.cuts) {
  const take = capture.holes.find(take => take.hole === cut.hole);
  const bytes = await readFile(join(root, cut.source));
  assert.equal(hash(bytes), cut.sourceSha256);
  assert.equal(take.videoSha256, cut.sourceSha256);
  assert.equal(take.inputs.filter(input => input.selector === '#fireBtn').length, 1);
  assert(take.samples.some(sample => sample.state.mode === 'flight' && sample.state.strokes === 1));
  assert(take.samples.every(sample => sample.state.commerce.liveServices === false));
}
assert(capture.holes[0].samples.some(sample => sample.state.mode === 'hole_complete' && sample.state.strokes === 1));
const path = join(root, edit.output);
const bytes = await readFile(path);
assert.equal(hash(bytes), edit.outputSha256);
const probe = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path], { encoding: 'utf8' }));
const video = probe.streams.find(stream => stream.codec_type === 'video');
const audio = probe.streams.find(stream => stream.codec_type === 'audio');
assert.equal(probe.streams.length, 2);
assert.equal(video.codec_name, 'h264');
assert.equal(video.width, 1920); assert.equal(video.height, 1080);
assert.equal(video.avg_frame_rate, '30/1'); assert.equal(Number(video.nb_frames), 900);
assert.equal(video.pix_fmt, 'yuv420p'); assert(Number(video.bit_rate) >= 5000000);
assert.equal(audio.codec_name, 'aac'); assert.equal(audio.sample_rate, '48000'); assert.equal(audio.channels, 2);
assert(Math.abs(Number(probe.format.duration) - 30) < .05);
const boxes = {};
for (let offset = 0; offset + 8 <= bytes.length;) {
  const size = bytes.readUInt32BE(offset);
  assert(size >= 8 && offset + size <= bytes.length, 'Valid MP4 box sizes');
  boxes[bytes.toString('ascii', offset + 4, offset + 8)] = offset;
  offset += size;
}
assert(boxes.moov < boxes.mdat, 'Fast-start metadata must precede the video data');
execFileSync(ffmpeg, ['-v', 'error', '-i', path, '-f', 'null', '-']);
const levels = spawnSync(ffmpeg, ['-hide_banner', '-nostats', '-i', path, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
assert.equal(levels.status, 0);
const summary = levels.stderr.slice(levels.stderr.lastIndexOf('Summary:'));
const integrated = Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]);
const peak = Number(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]);
assert(Number.isFinite(integrated) && integrated > -40 && integrated < -10);
assert(Number.isFinite(peak) && peak < 0);
await writeFile(join(root, 'review/audio-levels.txt'), summary);
const verified = { status: 'private-video-files-verified', outputSha256: hash(bytes),
  currentPackageAndSourceMatch: true, genuineInputReceipts: true,
  width: 1920, height: 1080, outputFps: 30, rawCaptureFps: 25,
  duration: Number(probe.format.duration), frames: Number(video.nb_frames), videoBitrate: Number(video.bit_rate),
  audio: { codec: audio.codec_name, sampleRate: Number(audio.sample_rate), channels: audio.channels,
    integratedLUFS: integrated, truePeakDbFS: peak, humanListeningComplete: false },
  fullDecodePassed: true, fastStart: true, ownerApproved: false, storeAccepted: false };
await writeFile(join(root, 'verification.json'), JSON.stringify(verified, null, 2) + '\n');
console.log(JSON.stringify(verified));
