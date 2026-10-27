import { supabase } from './supabase.js';
const $ = id => document.getElementById(id);
const kinds = ['like', 'comment'];
const offsets = {like: 0, comment: 0};
const counts = {like: 0, comment: 0};
const size = 50;
let busy = false;
function controls() {
    $('refreshFeedback').disabled = busy;
    for (const kind of kinds) {
        const checks = [...$(kind + 'Rows').querySelectorAll('input[type="checkbox"]')];
        const selected = checks.filter(input => input.checked).length;
        const all = $(kind + 'SelectAll');
        all.checked = checks.length > 0 && selected === checks.length;
        all.indeterminate = selected > 0 && selected < checks.length;
        all.disabled = busy || !checks.length;
        $(kind + 'DeleteSelected').disabled = busy || !selected;
        $(kind + 'Previous').disabled = busy || offsets[kind] === 0;
        $(kind + 'Next').disabled = busy || offsets[kind] + size >= counts[kind];
        for (const element of $(kind + 'Rows').querySelectorAll('button,input')) element.disabled = busy;
    }
}
async function fetchRows(kind) {
    const result = await supabase.from('page_feedback').select('*', {count: 'exact'}).eq('kind', kind)
        .order('created_at', {ascending: false}).order('id').range(offsets[kind], offsets[kind] + size - 1);
    if (result.error) throw result.error;
    counts[kind] = result.count || 0;
    // Deleting the last row on a page returns to the preceding populated page.
    const lastOffset = Math.max(0, Math.floor((counts[kind] - 1) / size) * size);
    if (offsets[kind] > lastOffset) { offsets[kind] = lastOffset; return fetchRows(kind); }
    return result.data || [];
}
function render(kind, entries) {
    const body = $(kind + 'Rows');
    body.replaceChildren();
    for (const entry of entries) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        const check = document.createElement('input');
        check.type = 'checkbox'; check.dataset.id = entry.id;
        check.setAttribute('aria-label', `Select ${kind} from ${entry.visitor_name || 'Guest'}`);
        check.onchange = controls; cell.append(check); row.append(cell);
        const values = [entry.visitor_name || 'Guest', entry.page_name || entry.page_key,
            entry.tower || '—', entry.floor ?? '—', entry.unit ? 'Unit ' + entry.unit : '—'];
        if (kind === 'comment') values.push(entry.comment);
        values.push(new Date(entry.created_at).toLocaleString());
        for (const value of values) {
            const td = document.createElement('td'); td.textContent = value;
            td.style.whiteSpace = 'pre-wrap'; td.style.overflowWrap = 'anywhere'; row.append(td);
        }
        const detail = document.createElement('small'); detail.textContent = entry.page_key;
        detail.style.display = 'block'; row.children[2].append(detail);
        const action = document.createElement('td'), button = document.createElement('button');
        button.type = 'button'; button.className = 'small-btn danger'; button.textContent = 'Delete';
        button.setAttribute('aria-label', `Delete ${kind} from ${entry.visitor_name || 'Guest'}`);
        button.onclick = () => deleteFeedback(kind, [entry.id]); action.append(button); row.append(action);
        body.append(row);
    }
    if (!entries.length) {
        const row = document.createElement('tr'), cell = document.createElement('td');
        cell.colSpan = kind === 'comment' ? 9 : 8; cell.textContent = `No ${kind}s yet.`;
        row.append(cell); body.append(row);
    }
    const count = counts[kind];
    $(kind + 'Page').textContent = count ? `${offsets[kind] + 1}–${Math.min(offsets[kind] + size, count)} of ${count}` : '0 results';
    $(kind === 'like' ? 'feedbackLikes' : 'feedbackComments').textContent = count;
}
async function refreshRows() {
    const results = await Promise.all(kinds.map(fetchRows));
    kinds.forEach((kind, index) => render(kind, results[index]));
}
function showError(error) {
    $('feedbackMessage').textContent = 'Unable to load feedback. Run the latest Like and Comment database setup in Supabase, then refresh. ' + (error.message || '');
    $('feedbackSetup').hidden = false;
}
export async function loadFeedback(reset = true) {
    if (busy) return;
    if (reset) kinds.forEach(kind => offsets[kind] = 0);
    busy = true; controls();
    $('feedbackMessage').textContent = 'Loading feedback…'; $('feedbackSetup').hidden = true;
    try {
        await refreshRows();
        $('feedbackMessage').textContent = 'Likes and comments are listed separately. Totals include all pages.';
    } catch (error) {
        kinds.forEach(kind => { counts[kind] = 0; $(kind + 'Rows').replaceChildren(); $(kind + 'Page').textContent = ''; });
        $('feedbackLikes').textContent = $('feedbackComments').textContent = '—'; showError(error);
    } finally { busy = false; controls(); }
}
async function deleteFeedback(kind, ids) {
    if (busy || !ids.length) return;
    if (!confirm(`Delete ${ids.length} ${kind}${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
    busy = true; controls(); $('feedbackMessage').textContent = 'Deleting…';
    try {
        const {error} = await supabase.from('page_feedback').delete().eq('kind', kind).in('id', ids);
        if (error) throw error;
    } catch (error) {
        $('feedbackMessage').textContent = 'Could not delete. Your selection is kept. Run the latest database setup if deletion is not enabled. ' + (error.message || '');
        $('feedbackSetup').hidden = false; busy = false; controls(); return;
    }
    try {
        await refreshRows(); $('feedbackMessage').textContent = `Selected ${kind}${ids.length === 1 ? '' : 's'} deleted.`;
    } catch (error) {
        kinds.forEach(kind => { counts[kind] = 0; $(kind + 'Rows').replaceChildren(); $(kind + 'Page').textContent = ''; });
        $('feedbackLikes').textContent = $('feedbackComments').textContent = '—';
        $('feedbackMessage').textContent = 'Deletion succeeded, but the lists could not refresh. Click Refresh. ' + (error.message || '');
    } finally { busy = false; controls(); }
}
export function initFeedback() {
    $('refreshFeedback').onclick = () => loadFeedback();
    for (const kind of kinds) {
        $(kind + 'SelectAll').onchange = () => {
            $(kind + 'Rows').querySelectorAll('input[type="checkbox"]').forEach(input => input.checked = $(kind + 'SelectAll').checked);
            controls();
        };
        $(kind + 'DeleteSelected').onclick = () => deleteFeedback(kind,
            [...$(kind + 'Rows').querySelectorAll('input:checked')].map(input => input.dataset.id));
        $(kind + 'Previous').onclick = () => { if (!busy) { offsets[kind] = Math.max(0, offsets[kind] - size); loadFeedback(false); } };
        $(kind + 'Next').onclick = () => { if (!busy) { offsets[kind] += size; loadFeedback(false); } };
    }
}
