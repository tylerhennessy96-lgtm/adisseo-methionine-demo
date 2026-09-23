// ── Shared pill-style multi-select filter bar ────────────────
// Ported from the SmartGate demo's filter pills: rounded pill triggers with
// a portaled position:fixed popover (search, select-all/clear, checkmarks).
//
// Usage:
//   const pillFilters = createPillFilters({
//     container: document.getElementById('filterBar'),
//     filters: [{ id: 'country', label: 'Countries', items: [...] }, ...],
//     storageKey: 'fizz_filters',     // optional persistence
//     onChange: () => renderTable(),
//   });
//   pillFilters.values('country')  → array of selected values ([] = all)

function createPillFilters(cfg) {
  const FILTERS = cfg.filters;
  const byId = {};
  FILTERS.forEach(f => { byId[f.id] = f; });
  const state = {};
  FILTERS.forEach(f => { state[f.id] = []; });

  const _esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  // ── Persistence ──
  function save() {
    if (!cfg.storageKey) return;
    localStorage.setItem(cfg.storageKey, JSON.stringify(state));
  }
  function restore() {
    if (!cfg.storageKey) return;
    try {
      const saved = localStorage.getItem(cfg.storageKey);
      if (!saved) return;
      const st = JSON.parse(saved);
      FILTERS.forEach(f => {
        if (Array.isArray(st[f.id])) state[f.id] = st[f.id].filter(v => f.items.includes(v));
      });
    } catch (e) { /* ignore corrupt state */ }
  }

  // ── Triggers ──
  function renderBar() {
    cfg.container.innerHTML = FILTERS.map(f => `
      <button class="filter-pill ms-pill" data-filter="${f.id}" type="button" aria-haspopup="listbox" aria-expanded="false">
        <span class="ms-trigger-text">All ${_esc(f.label)}</span>
        <span class="ms-trigger-count" hidden></span>
      </button>
    `).join('') + '<button class="filter-clear" type="button" hidden>Clear filters</button>';

    cfg.container.querySelectorAll('.ms-pill').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        openPopover(btn.dataset.filter);
      });
    });
    cfg.container.querySelector('.filter-clear').addEventListener('click', () => {
      FILTERS.forEach(f => { state[f.id] = []; });
      emitChange();
    });
  }

  function updateTrigger(id) {
    const trigger = cfg.container.querySelector('[data-filter="' + id + '"]');
    if (!trigger) return;
    const sel = state[id] || [];
    const textEl  = trigger.querySelector('.ms-trigger-text');
    const countEl = trigger.querySelector('.ms-trigger-count');
    if (sel.length === 0) {
      textEl.textContent = 'All ' + byId[id].label;
      countEl.hidden = true;
      countEl.textContent = '';
    } else if (sel.length === 1) {
      textEl.textContent = sel[0];
      countEl.hidden = true;
      countEl.textContent = '';
    } else {
      textEl.textContent = sel[0];
      countEl.hidden = false;
      countEl.textContent = '+' + (sel.length - 1);
    }
    trigger.classList.toggle('active', sel.length > 0);
  }

  function syncUi() {
    FILTERS.forEach(f => updateTrigger(f.id));
    const any = FILTERS.some(f => state[f.id].length > 0);
    const clearBtn = cfg.container.querySelector('.filter-clear');
    if (clearBtn) clearBtn.hidden = !any;
  }

  function emitChange() {
    syncUi();
    save();
    if (typeof cfg.onChange === 'function') cfg.onChange();
  }

  // ── Popover ──
  let popover = null;
  let activeFilter = null;
  let searchTerm = '';

  function buildPopover() {
    if (popover) return;
    popover = document.createElement('div');
    popover.className = 'ms-popover';
    popover.hidden = true;
    popover.innerHTML =
      '<div class="ms-search-wrap">' +
        '<svg class="ms-search-icon" width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
          '<circle cx="6" cy="6" r="4"/>' +
          '<line x1="9" y1="9" x2="12.5" y2="12.5" stroke-linecap="round"/>' +
        '</svg>' +
        '<input type="text" class="ms-search" placeholder="Search…">' +
      '</div>' +
      '<div class="ms-quick-actions">' +
        '<button class="ms-link" data-act="all" type="button">Select all</button>' +
        '<button class="ms-link" data-act="clear" type="button">Clear</button>' +
      '</div>' +
      '<div class="ms-options" role="listbox" aria-multiselectable="true"></div>';
    document.body.appendChild(popover);

    popover.querySelector('.ms-search').addEventListener('input', e => {
      searchTerm = e.target.value.toLowerCase();
      renderOptions();
    });
    popover.querySelector('[data-act="all"]').addEventListener('click', () => {
      if (!activeFilter) return;
      const cur = new Set(state[activeFilter]);
      visibleItems().forEach(v => cur.add(v));
      state[activeFilter] = [...cur];
      renderOptions();
      emitChange();
    });
    popover.querySelector('[data-act="clear"]').addEventListener('click', () => {
      if (!activeFilter) return;
      state[activeFilter] = [];
      renderOptions();
      emitChange();
    });
    popover.querySelector('.ms-options').addEventListener('click', e => {
      const opt = e.target.closest('.ms-option');
      if (!opt || !activeFilter) return;
      const arr = state[activeFilter];
      const idx = arr.indexOf(opt.dataset.value);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(opt.dataset.value);
      renderOptions();
      emitChange();
    });
  }

  function visibleItems() {
    if (!activeFilter) return [];
    const all = byId[activeFilter].items;
    if (!searchTerm) return all;
    return all.filter(v => v.toLowerCase().includes(searchTerm));
  }

  function renderOptions() {
    const container = popover.querySelector('.ms-options');
    const visible = visibleItems();
    if (!visible.length) {
      container.innerHTML = '<div class="ms-empty">No matches</div>';
      return;
    }
    const selected = new Set(state[activeFilter]);
    const sel   = visible.filter(v =>  selected.has(v));
    const unsel = visible.filter(v => !selected.has(v));
    const row = (v, checked) =>
      '<button class="ms-option" data-value="' + _esc(v) + '" role="option" aria-checked="' + checked + '" type="button" title="' + _esc(v) + '">' +
        '<span class="ms-check"></span><span class="ms-label">' + _esc(v) + '</span>' +
      '</button>';
    let html = sel.map(v => row(v, true)).join('');
    if (sel.length && unsel.length) html += '<div class="ms-divider"></div>';
    html += unsel.map(v => row(v, false)).join('');
    container.innerHTML = html;
  }

  function positionPopover(id) {
    const trigger = cfg.container.querySelector('[data-filter="' + id + '"]');
    const tr = trigger.getBoundingClientRect();
    const minW = Math.max(tr.width, 280);
    popover.style.minWidth = minW + 'px';
    const pw = Math.max(popover.offsetWidth, minW);
    let left = tr.left;
    const margin = 8;
    if (left + pw + margin > window.innerWidth) left = window.innerWidth - pw - margin;
    if (left < margin) left = margin;
    popover.style.top  = (tr.bottom + 4) + 'px';
    popover.style.left = left + 'px';
  }

  function openPopover(id) {
    buildPopover();
    if (activeFilter === id) { closePopover(); return; }
    if (activeFilter) closePopover();
    activeFilter = id;
    searchTerm = '';
    const search = popover.querySelector('.ms-search');
    search.value = '';
    search.placeholder = 'Search ' + byId[id].label.toLowerCase() + '…';
    renderOptions();
    popover.hidden = false;
    positionPopover(id);
    cfg.container.querySelector('[data-filter="' + id + '"]').setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => search.focus());
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onOutside, true);
    window.addEventListener('resize', closePopover);
  }
  function closePopover() {
    if (!activeFilter) return;
    const id = activeFilter;
    activeFilter = null;
    popover.hidden = true;
    const trigger = cfg.container.querySelector('[data-filter="' + id + '"]');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('mousedown', onOutside, true);
    window.removeEventListener('resize', closePopover);
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); closePopover(); }
  }
  function onOutside(e) {
    if (popover.contains(e.target)) return;
    if (e.target.closest('.ms-pill')) return;
    closePopover();
  }

  // ── Init ──
  renderBar();
  restore();
  syncUi();

  return {
    values(id) { return state[id] || []; },
    clearAll() { FILTERS.forEach(f => { state[f.id] = []; }); emitChange(); },
    sync: syncUi,
  };
}
