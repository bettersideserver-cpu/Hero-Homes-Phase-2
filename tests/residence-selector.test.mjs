import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source = readFileSync(new URL('../map/IPX/JS/HeroHomesResidenceSelector.js', import.meta.url), 'utf8');
async function setup(t, route = 'index.html', query = '', mobile = false) {
    const html = readFileSync(new URL('../map/IPX/' + route, import.meta.url), 'utf8');
    const dom = new JSDOM(html, { url: 'https://example.test/map/IPX/' + route + query, runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    const w = dom.window;
    const mq = { matches: mobile, addEventListener() {} };
    w.matchMedia = () => mq;
    Object.defineProperty(w.document, 'currentScript', { value: w.document.querySelector('script[src*="HeroHomesResidenceSelector"]') });
    w.eval(source);
    await new Promise(resolve => setImmediate(resolve));
    return w;
}

test('the project view shows both BHK sizes without selecting towers on load', async t => {
    const w = await setup(t);
    assert.equal(w.document.querySelector('[data-bhk="3"]').textContent, '3 BHK1,412 sq ft');
    assert.equal(w.document.querySelector('[data-bhk="4"]').textContent, '4 BHK2,131 – 2,595 sq ft');
    assert.equal(w.document.querySelectorAll('.hh-residence-match').length, 0);
    assert.equal(w.document.querySelectorAll('.hh-residence-towers a').length, 0);
    w.eval(source);
    assert.equal(w.document.querySelectorAll('#hhResidenceSelector').length, 1);
});

test('3 BHK and 4 BHK highlight the approved towers and reset restores all', async t => {
    const w = await setup(t);
    const highlighted = () => [...w.document.querySelectorAll('.hh-residence-match')].map(p => p.dataset.name);
    w.document.querySelector('[data-bhk="3"]').click();
    assert.deepEqual(highlighted(), ['Tower_10', 'Tower_12']);
    assert.equal(w.document.querySelectorAll('.hh-residence-muted').length, 3);
    assert.equal(w.document.querySelector('[data-bhk="3"]').getAttribute('aria-pressed'), 'true');
    w.document.querySelector('[data-bhk="4"]').click();
    assert.deepEqual(highlighted(), ['Tower_9', 'Tower_11', 'Tower_12A']);
    assert.equal(w.document.querySelector('.hh-residence-towers [data-tower="11"]').textContent, 'Tower 112,595 sq ft→');
    assert.equal(w.document.querySelectorAll('.hh-residence-towers a').length, 3);
    w.document.querySelector('.hh-residence-reset').click();
    assert.deepEqual(highlighted(), []);
    assert.equal(w.document.querySelectorAll('.hh-residence-muted').length, 0);
    assert.equal(w.document.querySelectorAll('.Cutout path[tabindex="0"]').length, 5);
    assert.equal(new URLSearchParams(w.location.search).has('bhk'), false);
});

test('clicking a matching tower opens its exact context and suppresses old group navigation', async t => {
    const w = await setup(t, 'index.html', '?bhk=3');
    const path = w.document.querySelector('[data-name="Tower_10"]');
    let oldNavigation = 0;
    path.addEventListener('click', () => oldNavigation++);
    const link = w.document.querySelector('.hh-residence-towers [data-tower="10"]');
    let opened = null;
    link.addEventListener('click', event => { event.preventDefault(); opened = link.href; });
    w.sessionStorage.setItem('selectedFloor', '25');
    w.sessionStorage.setItem('selectedUnit', '2');
    path.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
    assert.equal(opened, 'https://example.test/map/IPX/Subpages/Tower_A.html?tower=10&bhk=3');
    assert.equal(oldNavigation, 0);
    assert.equal(w.sessionStorage.getItem('selectedTower'), '10');
    assert.equal(w.sessionStorage.getItem('selectedFloor'), null);
    assert.equal(w.sessionStorage.getItem('selectedUnit'), null);
    opened = null;
    path.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert.ok(opened);
    const inactive = w.document.querySelector('[data-name="Tower_11"]');
    inactive.addEventListener('click', () => oldNavigation++);
    inactive.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
    assert.equal(oldNavigation, 0);
});

test('all five tower links resolve to existing overview files with exact tower context', async t => {
    const w = await setup(t);
    for (const type of ['3', '4']) {
        w.document.querySelector(`[data-bhk="${type}"]`).click();
        for (const link of w.document.querySelectorAll('.hh-residence-towers a')) {
            const url = new URL(link.href);
            assert.equal(url.searchParams.get('tower'), link.dataset.tower);
            assert.equal(url.searchParams.get('bhk'), type);
            assert.ok(existsSync(new URL('..' + url.pathname, import.meta.url)));
        }
    }
});

for (const [route, towers] of [['Tower_A.html', ['9', '10']], ['Tower_B.html', ['11']], ['Tower_C.html', ['12', '12A']]]) {
    test(`${route}: highlights only the requested tower in the floor view`, async t => {
        for (const tower of towers) {
            const w = await setup(t, 'Subpages/' + route, '?tower=' + tower);
            const matching = [...w.document.querySelectorAll('.hh-residence-match')];
            assert.ok(matching.length > 0);
            assert.ok(matching.every(p => p.dataset.name.startsWith(tower + '_Floor_') || (tower === '11' && p.dataset.link === 'Floor/Tower-11.html')));
            assert.ok(w.document.querySelector('#hhSelectedTower').textContent.includes('Tower ' + tower + ' selected'));
            w.document.querySelector('#hhSelectedTower button').click();
            assert.equal(w.document.querySelectorAll('.hh-residence-match').length, 0);
            assert.equal(w.document.querySelector('#hhSelectedTower'), null);
            assert.equal(w.location.search, '');
        }
    });
}

test('mobile panel opens and Escape closes it with focus restored', async t => {
    const w = await setup(t, 'index.html', '', true);
    const toggle = w.document.querySelector('.hh-residence-toggle');
    const panel = w.document.querySelector('#hhResidencePanel');
    assert.ok(panel.hidden);
    toggle.click();
    assert.equal(panel.hidden, false);
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    w.document.querySelector('[data-bhk="4"]').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.ok(panel.hidden);
    assert.equal(w.document.activeElement, toggle);
});

test('returning to the page clears restored tower focus without changing the selection', async t => {
    const w = await setup(t, 'index.html', '?bhk=3');
    const path = w.document.querySelector('[data-name="Tower_10"]');
    path.focus();
    assert.equal(w.document.activeElement, path);
    w.dispatchEvent(new w.PageTransitionEvent('pageshow', { persisted: true }));
    assert.notEqual(w.document.activeElement, path);
    assert.ok(path.classList.contains('hh-residence-match'));
    const button = w.document.querySelector('[data-bhk="3"]');
    button.focus();
    w.dispatchEvent(new w.PageTransitionEvent('pageshow', { persisted: true }));
    assert.equal(w.document.activeElement, button);
});

test('invalid URL selections do not highlight an arbitrary tower', async t => {
    const w = await setup(t, 'index.html', '?bhk=invalid');
    assert.equal(w.document.querySelectorAll('.hh-residence-match').length, 0);
    const tower = await setup(t, 'Subpages/Tower_A.html', '?tower=11');
    assert.equal(tower.document.querySelector('#hhSelectedTower'), null);
});
