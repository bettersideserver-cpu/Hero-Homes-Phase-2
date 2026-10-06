import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
