import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = readFileSync(path.join(root, 'assets/site-actions.js'), 'utf8');

async function setup(t, { url = 'https://example.test/map/IPX/index.html', html = '', blockedStorage = false, stored = {} } = {}) {
    const dom = new JSDOM(`<body>${html}<script src="https://example.test/assets/site-actions.js"></script></body>`, { url, runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    const w = dom.window;
    let network = 0;
    w.fetch = () => { network++; throw new Error('Actions must not submit data'); };
    w.open = () => { network++; throw new Error('No automatic outbound window'); };
    w.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
    w.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new w.Event('close')); };
    if (blockedStorage) {
        for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(w, key, { get() { throw new Error('Storage unavailable'); } });
    } else {
        for (const [key, value] of Object.entries(stored)) w.localStorage.setItem(key, value);
    }
    Object.defineProperty(w.document, 'currentScript', { value: w.document.querySelector('script') });
    const original = w.document.querySelector('#enquiryBtn');
    let enquiryClicks = 0;
    original?.addEventListener('click', () => enquiryClicks++);
    w.eval(source);
    await new Promise(resolve => setImmediate(resolve));
    return { w, original, enquiryClicks: () => enquiryClicks, network: () => network };
}

test('keeps the original enquiry handler, orders controls and removes duplicate WhatsApp UI', async t => {
    const { w, original, enquiryClicks } = await setup(t, { html: '<button id="enquiryBtn">Enquiry</button><button id="waFab">Old WhatsApp</button><span id="waLabel">WhatsApp</span>' });
    const dock = w.document.querySelector('#hhSiteActions');
    assert.equal(dock.firstElementChild, original);
    original.click();
    assert.equal(enquiryClicks(), 1);
    assert.deepEqual([...dock.querySelectorAll('a,button')].map(el => el.title || el.textContent), ['Enquiry', 'WhatsApp', 'Comment', 'Like this page']);
    assert.equal(w.document.querySelector('#waFab').style.display, 'none');
    w.eval(source);
    assert.equal(w.document.querySelectorAll('#hhSiteActions').length, 1);
    assert.equal(w.document.querySelectorAll('#hhCommentDialog').length, 1);
});

test('WhatsApp uses the existing sales number and encodes the current page', async t => {
    const { w, network } = await setup(t, { url: 'https://example.test/map/IPX/Subpages/Floor/Tower-9.html?floor=12&unit=2' });
    const link = w.document.querySelector('.hh-site-whatsapp');
    const target = new URL(link.href);
    assert.equal(target.hostname, 'wa.me');
    assert.equal(target.pathname, '/918556958000');
    assert.ok(target.searchParams.get('text').includes(w.location.href));
    assert.equal(link.target, '_blank');
    assert.ok(link.rel.includes('noopener'));
    assert.equal(network(), 0);
});

test('outer pages group social controls with Enquiry and leave the header unchanged', async t => {
    const html = '<div class="tb-actions"><a id="galleryBtn">Gallery</a><a id="walkthroughBtn">Walkthrough</a><button id="menuBtn">Menu</button></div><button id="enquiryBtn">Enquiry</button>';
    const { w, original, enquiryClicks } = await setup(t, { html });
    const header = w.document.querySelector('.tb-actions');
    const dock = w.document.querySelector('#hhSiteActions');
    assert.equal(dock.parentElement, w.document.body);
    assert.equal(header.lastElementChild.id, 'menuBtn');
    assert.deepEqual([...header.children].map(el => el.id), ['galleryBtn', 'walkthroughBtn', 'menuBtn']);
    assert.equal(original.parentElement, dock);
    assert.equal(dock.firstElementChild, original);
    original.click();
    assert.equal(enquiryClicks(), 1);
    assert.deepEqual([...dock.querySelectorAll('.hh-site-label')].map(el => el.textContent), ['WhatsApp', 'Comment', 'Like']);
    assert.equal(header.className, 'tb-actions');
});

test('comment text stays a private draft, survives reopening, and is never submitted', async t => {
    const { w, network } = await setup(t);
    const comment = w.document.querySelector('[aria-label="Comment"]');
    comment.click();
    const dialog = w.document.querySelector('#hhCommentDialog');
    const textarea = dialog.querySelector('textarea');
    assert.ok(dialog.open);
    assert.equal(w.document.activeElement, textarea);
    textarea.value = '<img src=x onerror=alert(1)> I like the gardens';
    textarea.dispatchEvent(new w.Event('input'));
    dialog.querySelector('form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    assert.equal(w.sessionStorage.getItem('heroHomesCommentDraft:/map/IPX/index.html'), textarea.value);
    dialog.querySelector('.hh-comment-close').click();
    assert.equal(w.document.activeElement, comment);
    comment.click();
    assert.equal(textarea.value, '<img src=x onerror=alert(1)> I like the gardens');
    assert.equal(dialog.querySelectorAll('img').length, 0);
    assert.equal(network(), 0);
    assert.ok(dialog.textContent.includes('not submitted'));
});

test('likes persist per page and unit and can be removed', async t => {
    const { w } = await setup(t, {
        url: 'https://example.test/tour.html?unit=2&floor=9&token=ignored',
        stored: { 'heroHomesLike:/tour.html?floor=9&unit=2': '1' }
    });
    const like = w.document.querySelector('[aria-pressed]');
    assert.equal(like.getAttribute('aria-pressed'), 'true');
    like.click();
    assert.equal(like.getAttribute('aria-pressed'), 'false');
    assert.equal(w.localStorage.getItem('heroHomesLike:/tour.html?floor=9&unit=2'), '0');
    like.click();
    assert.equal(like.getAttribute('aria-pressed'), 'true');
    w.history.pushState({}, '', '/tour.html?floor=9&unit=1');
    w.dispatchEvent(new w.PopStateEvent('popstate'));
    assert.equal(like.getAttribute('aria-pressed'), 'false');
});

test('blocked storage still allows liking and comment drafts for the open page', async t => {
    const { w } = await setup(t, { blockedStorage: true });
    const like = w.document.querySelector('[aria-pressed]');
    like.click();
    assert.equal(like.getAttribute('aria-pressed'), 'true');
    const comment = w.document.querySelector('[aria-label="Comment"]');
    comment.click();
    const textarea = w.document.querySelector('#hhCommentText');
    textarea.value = 'Draft with storage disabled';
    textarea.dispatchEvent(new w.Event('input'));
    w.document.querySelector('.hh-comment-close').click();
    comment.click();
    assert.equal(textarea.value, 'Draft with storage disabled');
});

test('dock moves above overlapping tour controls on resize', async t => {
    const { w } = await setup(t, { html: '<nav class="tour-nav"></nav>' });
    const dock = w.document.querySelector('#hhSiteActions');
    dock.getBoundingClientRect = () => {
        const bottom = parseFloat(dock.style.bottom.match(/[\d.]+/)[0]);
        return { left: 170, right: 370, top: 800 - bottom - 46, bottom: 800 - bottom, width: 200, height: 46 };
    };
    w.document.querySelector('.tour-nav').getBoundingClientRect = () => ({ left: 40, right: 350, top: 730, bottom: 785, width: 310, height: 55 });
    w.dispatchEvent(new w.Event('resize'));
    assert.ok(dock.getBoundingClientRect().bottom <= 718);
});

test('every public page loads the shared script once with a valid relative path', () => {
    const pages = ['index.html', 'privacy.html', ...readdirSync(path.join(root, 'map'), { recursive: true }).filter(file => file.endsWith('.html') && !/(^|[\\/])(admin|Test)([\\/]|$)/.test(file) && !file.includes(' copy')).map(file => path.join('map', file))];
    assert.equal(pages.length, 27);
    for (const page of pages) {
        const html = readFileSync(path.join(root, page), 'utf8');
        const matches = [...html.matchAll(/<script src="([^"]*site-actions\.js)" defer><\/script>/g)];
        assert.equal(matches.length, 1, page);
        assert.ok(existsSync(path.resolve(root, path.dirname(page), matches[0][1])), page);
    }
});
