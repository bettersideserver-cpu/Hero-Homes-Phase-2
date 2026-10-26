/* Shared public-page actions. Comments remain tab-local drafts until a destination is configured. */
(() => {
    'use strict';
    const script = document.currentScript;
    const stylesheet = new URL('site-actions.css', script.src).href;
    const WHATSAPP_NUMBER = '918556958000'; // Existing project sales number.
    const svg = paths => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
    const icons = {
        whatsapp: svg('<path d="M20.5 11.6a8.5 8.5 0 0 1-12.7 7.4L3 20.5l1.5-4.7A8.5 8.5 0 1 1 20.5 11.6Z"/><path d="m8.1 7.2 1.5 2.5-1 1.2a9 9 0 0 0 4.5 4.1l1.1-1.2 2.5 1.2c-.3 1.6-1.2 2-2.4 1.8-4.1-.8-7.7-4.5-8-7.4 0-1.2.7-2 1.8-2.2Z"/>'),
        comment: svg('<path d="M20 11.5a8 8 0 0 1-8 8 9 9 0 0 1-3.7-.8L3 20l1.4-4.6A8 8 0 1 1 20 11.5Z"/><path d="M8 9h8M8 13h5"/>'),
        like: svg('<path d="M8 20H4V10h4m0 10h9a2 2 0 0 0 2-1.6l1.3-7A2 2 0 0 0 18.4 9H14l.7-4A2.5 2.5 0 0 0 12 2l-4 8v10Z"/>')
    };

    function pageKey() {
        const query = new URLSearchParams(location.search);
        const context = new URLSearchParams();
        for (const name of ['tower', 'floor', 'unit', 'room']) {
            if (query.has(name)) context.set(name, query.get(name));
        }
        return location.pathname + (context.size ? '?' + context.toString() : '');
    }

    function init() {
        if (document.getElementById('hhSiteActions')) return;
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = stylesheet;
        document.head.appendChild(css);
        const dock = document.createElement('div');
        dock.id = 'hhSiteActions';
        dock.setAttribute('role', 'group');
        dock.setAttribute('aria-label', 'Enquiry and project actions');
        const enquiry = document.querySelector('#enquiryBtn, #openEnquiry');
        if (enquiry) {
            // Move the original element so its existing event listeners and form flow are retained.
            enquiry.classList.add('hh-site-action', 'hh-site-enquiry');
            dock.appendChild(enquiry);
        }
        const whatsapp = document.createElement('a');
        whatsapp.className = 'hh-site-action hh-site-whatsapp';
        whatsapp.setAttribute('aria-label', 'Chat on WhatsApp (opens in a new tab)');
        whatsapp.title = 'WhatsApp';
        whatsapp.target = '_blank';
        whatsapp.rel = 'noopener noreferrer';
        whatsapp.innerHTML = icons.whatsapp;
        const updateWhatsapp = () => {
            const text = `Hi, I am interested in Hero Homes Phase 2.\n${document.title}\n${location.href}`;
            whatsapp.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
        };
        updateWhatsapp();
        whatsapp.addEventListener('click', updateWhatsapp);
        dock.appendChild(whatsapp);

        function button(label, icon) {
            const element = document.createElement('button');
            element.type = 'button';
            element.className = 'hh-site-action';
            element.title = label;
            element.setAttribute('aria-label', label);
            element.innerHTML = icon;
            dock.appendChild(element);
            return element;
        }
        const comment = button('Comment', icons.comment);
        comment.setAttribute('aria-haspopup', 'dialog');
        comment.setAttribute('aria-controls', 'hhCommentDialog');
        const like = button('Like this page', icons.like);
        for (const [element, label] of [[whatsapp, 'WhatsApp'], [comment, 'Comment'], [like, 'Like']]) {
            const text = document.createElement('span');
            text.className = 'hh-site-label';
            text.textContent = label;
            element.appendChild(text);
        }
        const status = document.createElement('span');
        status.className = 'hh-actions-sr';
        status.setAttribute('role', 'status');
        dock.appendChild(status);
        document.body.appendChild(dock);
        // Retire the old standalone WhatsApp control on pages that already have one.
        for (const old of document.querySelectorAll('#waFab, #waLabel')) old.style.setProperty('display', 'none', 'important');

        let liked = false;
        const readLike = () => {
            try { liked = localStorage.getItem('heroHomesLike:' + pageKey()) === '1'; } catch (_) { /* In-memory fallback. */ }
            like.setAttribute('aria-pressed', String(liked));
            like.setAttribute('aria-label', liked ? 'Unlike this page' : 'Like this page');
            like.title = liked ? 'Liked · click to unlike' : 'Like this page';
        };
        readLike();
        like.addEventListener('click', () => {
            liked = !liked;
            let persisted = true;
            try { localStorage.setItem('heroHomesLike:' + pageKey(), liked ? '1' : '0'); } catch (_) { persisted = false; }
            like.setAttribute('aria-pressed', String(liked));
            like.setAttribute('aria-label', liked ? 'Unlike this page' : 'Like this page');
            like.title = liked ? 'Liked · click to unlike' : 'Like this page';
            status.textContent = liked ? (persisted ? 'Liked. Saved on this device.' : 'Liked for this visit.') : 'Like removed.';
        });
        window.addEventListener('storage', readLike);
        window.addEventListener('popstate', readLike);

        const dialog = document.createElement('dialog');
        dialog.id = 'hhCommentDialog';
        dialog.setAttribute('aria-labelledby', 'hhCommentTitle');
        dialog.setAttribute('aria-describedby', 'hhCommentHelp');
        dialog.innerHTML = `<div class="hh-comment-heading"><h2 id="hhCommentTitle">Leave a comment</h2><button type="button" class="hh-comment-close" aria-label="Close comment box">×</button></div>
            <p id="hhCommentHelp">Write your thoughts about this page. Your comment stays a private draft in this tab and is not submitted.</p>
            <form><label for="hhCommentText">Your comment</label><textarea id="hhCommentText" maxlength="2000" placeholder="What would you like to share?" aria-describedby="hhCommentCount"></textarea>
            <span class="hh-comment-count" id="hhCommentCount">0 / 2000</span><button type="submit" class="hh-comment-keep">Keep draft</button></form>
            <p id="hhCommentStatus" role="status"></p>`;
        document.body.appendChild(dialog);
        const textarea = dialog.querySelector('textarea');
        const draftStatus = dialog.querySelector('#hhCommentStatus');
        const drafts = new Map();
        let draftKey;
        function keepDraft() {
            drafts.set(draftKey, textarea.value);
            let stored = true;
            try { sessionStorage.setItem(draftKey, textarea.value); } catch (_) { stored = false; }
            dialog.querySelector('#hhCommentCount').textContent = `${textarea.value.length} / 2000`;
            draftStatus.textContent = stored ? 'Draft kept in this tab. Not submitted.' : 'Draft kept while this page is open. Not submitted.';
        }
        comment.addEventListener('click', () => {
            draftKey = 'heroHomesCommentDraft:' + pageKey();
            let draft = drafts.get(draftKey) || '';
            try { draft = sessionStorage.getItem(draftKey) ?? draft; } catch (_) { /* In-memory fallback. */ }
            textarea.value = draft;
            dialog.querySelector('#hhCommentCount').textContent = `${draft.length} / 2000`;
            draftStatus.textContent = '';
            dialog.showModal();
            textarea.focus();
        });
        textarea.addEventListener('input', keepDraft);
        dialog.querySelector('form').addEventListener('submit', event => { event.preventDefault(); keepDraft(); });
        dialog.querySelector('.hh-comment-close').addEventListener('click', () => dialog.close());
        dialog.addEventListener('click', event => {
            const bounds = dialog.getBoundingClientRect();
            if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
        });
        dialog.addEventListener('close', () => comment.focus());

        // Keep the shared controls above each page's existing navigation and view controls.
        const blockers = [...document.querySelectorAll('.jumpbar, .current-status-btn, .nearby-essentials-btn, .day-slider-wrap, .tour-nav, #holdRequestBtn, #floorMapBtn, .bottom-bar, .bottom-nav')];
        function positionDock() {
            let bottom = parseFloat(getComputedStyle(dock).getPropertyValue('--hh-actions-edge')) || 24;
            dock.style.bottom = `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`;
            for (let pass = 0; pass <= blockers.length; pass++) {
                const bounds = dock.getBoundingClientRect();
                const collision = blockers.map(element => element.getBoundingClientRect()).find(rect =>
                    rect.width && rect.height && bounds.left < rect.right + 10 && bounds.right > rect.left - 10 && bounds.top < rect.bottom + 10 && bounds.bottom > rect.top - 10);
                if (!collision) break;
                bottom += bounds.bottom - collision.top + 12;
                dock.style.bottom = `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`;
            }
        }
        css.addEventListener('load', positionDock);
        window.addEventListener('resize', positionDock);
        window.addEventListener('load', positionDock);
        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(positionDock);
            blockers.forEach(element => observer.observe(element));
        }
        positionDock();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
