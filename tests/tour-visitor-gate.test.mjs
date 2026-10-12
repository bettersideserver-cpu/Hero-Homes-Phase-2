import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const tours = ['9-12-Typical/Typical.html', 'Tower-10-12/360/Typical.html', 'Tower-B/360/Typical.html'];
const gateSource = readFileSync(new URL('../map/IPX/JS/HeroHomesLeadCaptureGlobal.js', import.meta.url), 'utf8');

// Run the real tour navigation and form scripts; replace only WebGL rendering
// and animation scheduling so these checks need no graphics device or network.
async function tour(t, route, { query = '', registered = false, optIn = true } = {}) {
  const html = readFileSync(new URL(`../map/IPX/Subpages/${route}`, import.meta.url), 'utf8');
  const dom = new JSDOM(html, {
    url: `https://example.test/map/IPX/Subpages/${route}${query}`,
    runScripts: 'outside-only'
  });
  t.after(() => dom.window.close());
  const { window } = dom;
  const timers = [];
  window.setTimeout = callback => timers.push(callback);
  window.requestAnimationFrame = callback => timers.push(callback);
  const flush = () => {
    let remaining = 1000;
    while (timers.length) {
      assert.ok(remaining-- > 0, 'Animations should finish');
      timers.shift()();
    }
  };
  class Panorama extends window.EventTarget {
    constructor(src) { super(); this.src = src; this.children = []; this.userData = {}; this.position = { set() {} }; }
    add(child) { this.children.push(child); }
    addHoverText() {}
  }
  let viewer;
  window.PANOLENS = {
    ImagePanorama: Panorama,
    Infospot: Panorama,
    Viewer: class {
      constructor() { viewer = this; this.camera = { fov: 100, updateProjectionMatrix() {} }; }
      add() {}
      remove() {}
      setPanorama(panorama) { assert.ok(panorama); this.panorama = panorama; }
      tweenControlCenter() {}
    }
  };
  window.THREE = { MathUtils: { degToRad: degrees => degrees * Math.PI / 180 }, Vector3: class {} };
  window.fetch = async () => ({ ok: true });
  if (registered) window.sessionStorage.setItem('heroHomesVisitor', JSON.stringify({ fullName: 'Visitor', mobile: '9000000001' }));
  if (!optIn) window.document.documentElement.removeAttribute('data-hero-homes-visitor-gate');
  window.eval(gateSource);
  const tourScript = [...window.document.scripts].find(script => script.textContent.includes('new PANOLENS.Viewer('));
  assert.ok(tourScript, 'The actual tour initialization script must be present');
  window.eval(tourScript.textContent);
  flush();
  await new Promise(resolve => setImmediate(resolve));
  const gateOpen = () => !!window.document.querySelector('#hhRequiredVisitorGate.open');
  return { window, viewer, flush, gateOpen };
}

for (const route of tours) {
  test(`${route}: closing cancels navigation and submission resumes only the new selection`, async t => {
    const { window, viewer, flush, gateOpen } = await tour(t, route);
    const lobby = viewer.panorama;
    window.goToRoom('kitchen');
    window.document.getElementById('hhReqClose').click(); flush();
    assert.equal(gateOpen(), false);
    assert.equal(viewer.panorama, lobby);
    assert.equal(window.sessionStorage.getItem('heroHomesVisitor'), null);
    assert.equal(window.document.body.style.overflow, '');
    window.goToRoom('lobby'); flush();
    assert.equal(gateOpen(), false);
    window.goToRoom('dinning'); flush();
    assert.equal(gateOpen(), true);
    assert.equal(viewer.panorama, lobby);
    const form = window.document.getElementById('hhRequiredVisitorForm');
    form.dispatchEvent(new window.Event('submit', { cancelable: true }));
    assert.equal(gateOpen(), true, 'Empty details cannot unlock navigation');
    for (const [id, value] of Object.entries({ hhReqName: 'Test Visitor', hhReqPhone: '9000000001', hhReqCity: 'Test City' })) {
      window.document.getElementById(id).value = value;
    }
    form.dispatchEvent(new window.Event('submit', { cancelable: true }));
    assert.equal(window.document.getElementById('hhReqClose').disabled, true);
    await new Promise(resolve => setImmediate(resolve)); flush();
    assert.equal(gateOpen(), false);
    assert.equal(window.document.getElementById('cardName').textContent, 'Dining Room');
    window.goToRoom('kitchen'); flush();
    assert.equal(gateOpen(), false);
    assert.equal(window.document.getElementById('cardName').textContent, 'Kitchen');
  });

  test(`${route}: closing from a direct balcony returns to lobby and preserves page Back`, async t => {
    const { window, viewer, flush, gateOpen } = await tour(t, route, { query: '?room=balcony&balconyFloor=5' });
    const balcony = viewer.panorama;
    window.goToRoom('kitchen');
    window.document.getElementById('hhReqClose').click(); flush();
    assert.equal(gateOpen(), false);
    assert.notEqual(viewer.panorama, balcony);
    assert.equal(window.document.getElementById('cardName').textContent, 'Lobby');
    assert.equal(window.document.getElementById('balconyControls').style.display, 'none');
    assert.equal(window.document.querySelector('.tour-pill.active').textContent.trim(), 'Lobby');
    let backCalls = 0;
    window.history.back = () => backCalls++;
    window.document.getElementById('backBtn').click(); flush();
    assert.equal(backCalls, 1, 'Back leaves the tour instead of returning to the old balcony');
    assert.equal(gateOpen(), false);
    window.goToRoom('balcony'); flush();
    assert.equal(gateOpen(), true, 'The former entry view is now gated too');
    window.document.getElementById('hhReqClose').click(); flush();
    viewer.panorama.children[0].dispatchEvent(new window.Event('click')); flush();
    assert.equal(gateOpen(), true, 'Lobby hotspots remain gated after closing');
  });

  test(`${route}: Escape closes a hold-request form without unlocking the tour`, async t => {
    const { window, flush, gateOpen } = await tour(t, route, { query: '?room=balcony' });
    window.document.getElementById('holdRequestBtn').click();
    assert.equal(gateOpen(), true);
    window.document.getElementById('hhReqClose').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    flush();
    assert.equal(gateOpen(), false);
    assert.equal(window.document.getElementById('cardName').textContent, 'Lobby');
    window.goToRoom('kitchen'); flush();
    assert.equal(gateOpen(), true);
  });

  test(`${route}: first view stays open until a different room is selected`, async t => {
    const { window, viewer, flush, gateOpen } = await tour(t, route);
    const initial = viewer.panorama;
    assert.equal(gateOpen(), false);
    window.goToRoom('lobby'); flush();
    assert.equal(viewer.panorama, initial);
    assert.equal(gateOpen(), false);
    window.goToRoom('kitchen');
    assert.equal(gateOpen(), true, 'The next-room request opens the form immediately');
    flush();
    assert.equal(viewer.panorama, initial, 'Keep the first scene until the visitor submits');
    assert.equal(gateOpen(), true);
    for (const [id, value] of Object.entries({ hhReqName: 'Test Visitor', hhReqPhone: '9000000001', hhReqCity: 'Test City' })) {
      window.document.getElementById(id).value = value;
    }
    window.document.getElementById('hhRequiredVisitorForm').dispatchEvent(new window.Event('submit', { cancelable: true }));
    await new Promise(resolve => setImmediate(resolve));
    flush();
    assert.equal(gateOpen(), false);
    assert.notEqual(viewer.panorama, initial, 'Successful submission resumes the requested room');
    assert.equal(window.document.getElementById('cardName').textContent, 'Kitchen');
    window.goToRoom('lobby'); flush();
    assert.equal(viewer.panorama, initial);
    assert.equal(gateOpen(), false);
  });

  test(`${route}: hotspot navigation also opens the form`, async t => {
    const { window, viewer, flush, gateOpen } = await tour(t, route);
    const initial = viewer.panorama;
    initial.children[0].dispatchEvent(new window.Event('click'));
    assert.equal(gateOpen(), true);
    flush();
    assert.equal(viewer.panorama, initial, 'Hotspots must not bypass the registration gate');
    assert.equal(gateOpen(), true);
  });

  test(`${route}: a direct balcony view is free until its side changes`, async t => {
    const { window, viewer, flush, gateOpen } = await tour(t, route, { query: '?room=balcony&balconyType=F&balconyFloor=5' });
    const initial = viewer.panorama;
    assert.equal(gateOpen(), false);
    window.goToRoom('balcony', null, 'F'); flush();
    assert.equal(gateOpen(), false);
    window.goToRoom('balcony', null, 'B'); flush();
    assert.equal(gateOpen(), true);
    assert.equal(viewer.panorama, initial);
  });

  test(`${route}: changing the balcony floor opens the form`, async t => {
    const { window, viewer, flush, gateOpen } = await tour(t, route, { query: '?room=balcony&balconyFloor=5' });
    const initial = viewer.panorama;
    assert.equal(gateOpen(), false);
    const select = window.document.getElementById('balconyFloorSelect');
    select.value = '10';
    select.dispatchEvent(new window.Event('change')); flush();
    assert.equal(gateOpen(), true);
    assert.equal(viewer.panorama, initial);
    assert.equal(select.value, '5');
  });

  test(`${route}: loading or updating scene controls never opens the form`, async t => {
    const { window, flush, gateOpen } = await tour(t, route);
    window.updateBalconyControls('kitchen');
    window.updateBalconyControls('lobby');
    window.dispatchEvent(new window.CustomEvent('hero-homes:panorama-change', { detail: { room: 'balcony', balconyType: 'B', balconyFloor: 10 } }));
    window.document.getElementById('viewer').dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true }));
    flush();
    assert.equal(gateOpen(), false);
  });

  test(`${route}: registered visitors can change rooms without another form`, async t => {
    const { window, flush, gateOpen } = await tour(t, route, { registered: true });
    window.goToRoom('kitchen'); flush();
    assert.equal(gateOpen(), false);
  });

  test(`${route}: an explicit hold request still asks for visitor details`, async t => {
    const { window, gateOpen } = await tour(t, route);
    assert.equal(gateOpen(), false);
    window.document.getElementById('holdRequestBtn').click();
    assert.equal(gateOpen(), true);
  });
}

test('Pages without a visitor-gate opt-in do not open a form during navigation', async t => {
  const { window, flush, gateOpen } = await tour(t, tours[0], { optIn: false });
  window.goToRoom('kitchen'); flush();
  assert.equal(gateOpen(), false);
});

for (const type of ['B', 'F', 'C1 F', 'C1 B', 'C2 F', 'C2 B']) {
  test(`Tower 11: ${type} opens existing images at every selectable floor`, async t => {
    const route = 'Tower-B/360/Typical.html';
    const { window, viewer, flush } = await tour(t, route, {
      query: `?tower=11&room=balcony&floor=32&balconyType=${encodeURIComponent(type)}`,
      registered: true
    });
    const select = window.document.getElementById('balconyFloorSelect');
    const topFloor = type.startsWith('C') ? 30 : 32;
    const extension = type.startsWith('C') ? 'jpg' : 'webp';
    assert.equal(viewer.panorama.userData.balconyType, type);
    assert.equal(viewer.panorama.userData.balconyFloor, topFloor);
    assert.equal(select.value, String(topFloor));
    assert.deepEqual(Array.from(select.options, option => Number(option.value)), [1, 5, 10, 15, 20, 25, topFloor]);
    for (const floor of [1, 5, 10, 15, 20, 25, topFloor]) {
      select.value = String(floor);
      select.dispatchEvent(new window.Event('change')); flush();
      assert.equal(viewer.panorama.src, `../../balcony/360/Floor_11/${type} Floor ${floor}.${extension}`);
      const image = new URL(viewer.panorama.src, new URL(`../map/IPX/Subpages/${route}`, import.meta.url));
      assert.ok(existsSync(image), `Missing panorama: ${image.pathname}`);
      if (extension === 'webp') {
        assert.ok(existsSync(new URL(viewer.panorama.userData.pngPath, new URL(`../map/IPX/Subpages/${route}`, import.meta.url))));
      }
    }
  });
}

test('Tower 11: switching balcony types and Back retain C1/C2 views and valid floors', async t => {
  const { window, viewer, flush } = await tour(t, 'Tower-B/360/Typical.html', {
    query: '?tower=11&room=balcony&balconyType=F&floor=32', registered: true
  });
  window.goToRoom('balcony', null, 'C2 B'); flush();
  assert.equal(viewer.panorama.userData.balconyType, 'C2 B');
  assert.equal(viewer.panorama.userData.balconyFloor, 30);
  window.goToRoom('balcony', null, 'B'); flush();
  assert.equal(viewer.panorama.userData.balconyType, 'B');
  assert.equal(viewer.panorama.userData.balconyFloor, 32);
  window.document.getElementById('backBtn').click(); flush();
  assert.equal(viewer.panorama.userData.balconyType, 'C2 B');
  assert.equal(viewer.panorama.userData.balconyFloor, 30);
  window.goToRoom('kitchen'); flush();
  window.goToRoom('balcony'); flush();
  assert.equal(viewer.panorama.userData.balconyType, 'C2 B');
  assert.equal(window.sessionStorage.getItem('balconyType'), 'C2 B');
});
