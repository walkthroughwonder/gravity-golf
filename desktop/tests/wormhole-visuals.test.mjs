import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { pathToFileURL } from 'node:url';

const root = process.env.GG_SOURCE_ROOT || resolve(import.meta.dirname, '../..');
const desktop = process.env.GG_DESKTOP_ROOT || resolve(import.meta.dirname, '..');
const THREE = await import(pathToFileURL(join(desktop, 'node_modules/three/build/three.module.js')).href);
const source = await readFile(join(root, 'index.html'), 'utf8');
const start = source.indexOf('// ===================== WORMHOLES =====================');
const end = source.indexOf('// Reusable objects for hole/flag', start);
assert(start > 0 && end > start);
const section = source.slice(start, end);

function fixture() {
  const canvases = [];
  const stops = [];
  const scene = new THREE.Scene();
  const document = { createElement(tag) {
    assert.equal(tag, 'canvas');
    const canvas = { getContext(type) {
      assert.equal(type, '2d');
      return { createRadialGradient(...args) {
        assert.deepEqual(args, [32, 32, 0, 32, 32, 32]);
        return { addColorStop: (offset, color) => stops.push([offset, color]) };
      }, fillRect(...args) { assert.deepEqual(args, [0, 0, 64, 64]); } };
    } };
    canvases.push(canvas);
    return canvas;
  } };
  const api = runInNewContext(`${section}\n({ createWormholePair, clearWormholes, animateWormholes, wormholes })`,
    { THREE, document, scene });
  return { api, canvases, stops, scene };
}

test('portal glows lazily share a bounded radial alpha texture without changing geometry', () => {
  const { api, canvases, stops } = fixture();
  assert.equal(canvases.length, 0);
  const pair = api.createWormholePair([0, 0, 0], [20, 5, -10], 0x4488ff, 0xff8844);
  const a = pair.a.portal;
  const b = pair.b.portal;
  assert.equal(canvases.length, 1);
  assert.equal(canvases[0].width * canvases[0].height * 4, 16384);
  assert.deepEqual(stops, [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
  assert.equal(a.spriteMat.map, b.spriteMat.map);
  assert.equal(a.spriteMat.map.isCanvasTexture, true);
  assert.equal(a.spriteMat.map.generateMipmaps, false);
  assert.equal(a.spriteMat.map.minFilter, THREE.LinearFilter);
  assert.equal(a.spriteMat.depthWrite, false);
  assert.equal(a.spriteMat.blending, THREE.AdditiveBlending);
  assert.equal(a.spriteMat.color.getHex(), 0x4488ff);
  assert.equal(a.group.children.length, 4);
  assert.equal(a.group.children.filter(child => child.isSprite).length, 1);
  assert.equal(pair.radius, 1.8);
});

test('level cleanup and repeated portal creation reuse the texture without per-frame uploads', () => {
  const { api, canvases, scene } = fixture();
  const pair = api.createWormholePair([0, 0, 0], [20, 5, -10], 0x4488ff, 0xff8844);
  const texture = pair.a.portal.spriteMat.map;
  const version = texture.version;
  let textureDisposals = 0;
  let materialDisposals = 0;
  texture.addEventListener('dispose', () => textureDisposals++);
  pair.a.portal.spriteMat.addEventListener('dispose', () => materialDisposals++);
  for (let i = 0; i < 120; i++) api.animateWormholes(i / 60);
  assert.equal(canvases.length, 1);
  assert.equal(texture.version, version);
  api.clearWormholes();
  assert.equal(api.wormholes.length, 0);
  assert.equal(scene.children.length, 0);
  assert.equal(materialDisposals, 1);
  assert.equal(textureDisposals, 0);
  const next = api.createWormholePair([1, 2, 3], [30, 5, 10], 0xaa22ff, 0x22ffaa);
  assert.equal(next.a.portal.spriteMat.map, texture);
  assert.equal(canvases.length, 1);
  assert.equal(texture.version, version);
});
