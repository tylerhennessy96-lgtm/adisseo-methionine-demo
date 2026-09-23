// Reusable two-calendar range picker. Relies on the existing
// .avail-range-picker / .ar-* classes in styles.css for styling, so the
// look matches the Availability filter on pricing.html.
//
// Usage:
//   const picker = new DateRangePicker({
//     trigger:     document.getElementById('myBtn'),      // clickable element
//     labelEl:     document.getElementById('myBtnLabel'), // where to write "20 Apr 2026 → 21 Apr 2026"
//     placeholder: 'Custom range',
//     onChange:    (start, end) => { ... },               // fired on user commit or Clear
//   });
//
//   picker.setRange(startDate, endDate);  // silent: updates display, does NOT fire onChange
//   picker.clear();                       // resets state and fires onChange(null, null)
//
// Only one picker is open at a time per page; the picker closes on
// outside click or after a start→end pick.
(function () {
  const MONTH_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function fmtTriggerLabel(d) {
    // "20 Apr 2026" — matches the format used elsewhere in history.html.
    return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  }
  function fmtFooterLabel(d) {
    // "Apr 20, 2026" — matches the footer format used by pricing.html's picker.
    return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  class DateRangePicker {
    constructor(opts) {
      this.trigger     = opts.trigger;
      this.labelEl     = opts.labelEl || opts.trigger;
      this.placeholder = opts.placeholder || 'Select range';
      this.onChange    = opts.onChange || (() => {});
      this.start       = null;
      this.end         = null;
      this.pickingEnd  = false;
      this._built      = false;

      const now = new Date();
      this.year  = now.getFullYear();
      this.month = now.getMonth();

      // Clicks on the trigger toggle the picker; stopPropagation prevents the
      // document-level outside-click handler below from firing on the same event.
      this.trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!this._built) this._buildPicker();
        this._toggle();
      });

      // Global outside-click handler closes the picker. Only active once the
      // picker has actually been built (i.e. user opened it at least once).
      document.addEventListener('click', (e) => {
        if (!this._built || !this.picker.classList.contains('open')) return;
        if (e.target.closest('.avail-range-picker') || this.trigger.contains(e.target)) return;
        this._close();
      });

      this._updateLabel();
    }

    _buildPicker() {
      const el = document.createElement('div');
      el.className = 'avail-range-picker';
      // Prevent clicks inside the picker from bubbling to the outside-click handler.
      el.addEventListener('click', (e) => e.stopPropagation());
      el.innerHTML = `
        <div class="ar-calendars">
          <div class="ar-cal">
            <div class="ar-cal-header">
              <button type="button" class="calendar-nav" data-nav="-1">
                <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="7,1 3,5 7,9"/></svg>
              </button>
              <span class="calendar-month" data-month-label="1"></span>
              <span style="width:24px;"></span>
            </div>
            <div class="ar-weekdays"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>
            <div class="ar-days" data-days="1"></div>
          </div>
          <div class="ar-cal">
            <div class="ar-cal-header">
              <span style="width:24px;"></span>
              <span class="calendar-month" data-month-label="2"></span>
              <button type="button" class="calendar-nav" data-nav="1">
                <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3,1 7,5 3,9"/></svg>
              </button>
            </div>
            <div class="ar-weekdays"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>
            <div class="ar-days" data-days="2"></div>
          </div>
        </div>
        <div class="ar-footer">
          <span class="ar-range-text"></span>
          <button type="button" class="btn btn-ghost" data-clear style="padding:5px 12px;font-size:11px;">Clear</button>
        </div>`;
      document.body.appendChild(el);
      el.querySelectorAll('[data-nav]').forEach((b) =>
        b.addEventListener('click', () => this._nav(parseInt(b.dataset.nav, 10)))
      );
      el.querySelector('[data-clear]').addEventListener('click', () => {
        this.clear();
        this._close();
      });
      this.picker = el;
      this._built = true;
    }

    _toggle() {
      if (this.picker.classList.contains('open')) this._close();
      else this._open();
    }

    _open() {
      // Seed the month view off the current start date (if any) so reopening
      // the picker lands where the user last committed.
      if (this.start) {
        this.year  = this.start.getFullYear();
        this.month = this.start.getMonth();
      }
      this.pickingEnd = false;
      this._render();
      // Position below the trigger, aligned to its left edge.
      const r = this.trigger.getBoundingClientRect();
      this.picker.style.top   = (r.bottom + 4) + 'px';
      this.picker.style.left  = r.left + 'px';
      this.picker.style.right = 'auto';
      this.picker.classList.add('open');
    }

    _close() {
      if (!this._built) return;
      this.picker.classList.remove('open');
      this.picker.querySelectorAll('.hover-range').forEach((el) => el.classList.remove('hover-range'));
    }

    _nav(dir) {
      this.month += dir;
      if (this.month > 11) { this.month = 0;  this.year++; }
      if (this.month < 0)  { this.month = 11; this.year--; }
      this._render();
    }

    _render() {
      const m2y = this.month + 1 > 11 ? this.year + 1 : this.year;
      const m2m = (this.month + 1) % 12;
      this.picker.querySelector('[data-month-label="1"]').textContent = MONTH_LONG[this.month] + ' ' + this.year;
      this.picker.querySelector('[data-month-label="2"]').textContent = MONTH_LONG[m2m] + ' ' + m2y;
      this.picker.querySelector('[data-days="1"]').innerHTML = this._buildGrid(this.year, this.month);
      this.picker.querySelector('[data-days="2"]').innerHTML = this._buildGrid(m2y, m2m);
      this._wireDayInteractions();
      this._updateFooter();
    }

    _buildGrid(yr, mo) {
      const firstDay = new Date(yr, mo, 1).getDay();
      const dim      = new Date(yr, mo + 1, 0).getDate();
      const today    = new Date(); today.setHours(0, 0, 0, 0);
      let html = '';
      for (let i = 0; i < firstDay; i++) html += '<span class="ar-day empty"></span>';
      for (let d = 1; d <= dim; d++) {
        const dt = new Date(yr, mo, d);
        let cls = 'ar-day';
        if (dt.getTime() === today.getTime()) cls += ' today';
        if (this.start && dt.getTime() === this.start.getTime()) cls += ' range-start';
        if (this.end   && dt.getTime() === this.end.getTime())   cls += ' range-end';
        if (this.start && this.end && dt > this.start && dt < this.end) cls += ' in-range';
        html += `<span class="${cls}" data-y="${yr}" data-m="${mo}" data-d="${d}">${d}</span>`;
      }
      return html;
    }

    _wireDayInteractions() {
      const hoverEnabled = this.pickingEnd && this.start && !this.end;
      this.picker.querySelectorAll('.ar-day:not(.empty)').forEach((span) => {
        span.addEventListener('click', () => {
          this._pickDay(+span.dataset.y, +span.dataset.m, +span.dataset.d);
        });
        if (hoverEnabled) span.addEventListener('mouseover', () => this._hoverDay(span));
      });
      if (!hoverEnabled) {
        this.picker.querySelectorAll('.hover-range').forEach((el) => el.classList.remove('hover-range'));
      }
    }

    _hoverDay(el) {
      if (!this.pickingEnd || !this.start || this.end) return;
      const hoverDt = new Date(+el.dataset.y, +el.dataset.m, +el.dataset.d);
      const startT  = this.start.getTime();
      this.picker.querySelectorAll('.ar-day:not(.empty)').forEach((span) => {
        span.classList.remove('hover-range');
        const cellDt = new Date(+span.dataset.y, +span.dataset.m, +span.dataset.d);
        const cellT  = cellDt.getTime();
        const lo = Math.min(startT, hoverDt.getTime());
        const hi = Math.max(startT, hoverDt.getTime());
        if (cellT > lo && cellT < hi) span.classList.add('hover-range');
      });
    }

    _pickDay(yr, mo, d) {
      const dt = new Date(yr, mo, d);
      if (!this.pickingEnd) {
        // First click — start of range
        this.start = dt;
        this.end = null;
        this.pickingEnd = true;
        this._render();
      } else {
        // Second click — end of range. If user clicks a date before the start,
        // swap so the order is always start ≤ end.
        if (dt.getTime() === this.start.getTime())       this.end = new Date(dt);
        else if (dt < this.start)                         { this.end = this.start; this.start = dt; }
        else                                              this.end = dt;
        this.pickingEnd = false;
        this._updateLabel();
        this._close();
        this.onChange(this.start, this.end);
      }
    }

    _updateFooter() {
      const el = this.picker.querySelector('.ar-range-text');
      if (this.start && this.end) {
        el.textContent = `${fmtFooterLabel(this.start)} → ${fmtFooterLabel(this.end)}`;
      } else if (this.pickingEnd && this.start) {
        el.textContent = `${fmtFooterLabel(this.start)} → Select end date`;
      } else {
        el.textContent = 'Select start date';
      }
    }

    _updateLabel() {
      if (!this.labelEl) return;
      if (this.start && this.end) {
        this.labelEl.textContent = `${fmtTriggerLabel(this.start)} → ${fmtTriggerLabel(this.end)}`;
        this.trigger.classList.remove('is-placeholder');
      } else {
        this.labelEl.textContent = this.placeholder;
        this.trigger.classList.add('is-placeholder');
      }
    }

    // Public: set range without firing onChange. Used by pages that drive the
    // range externally (e.g. shortcut buttons) and want the trigger display to
    // reflect / clear without looping back through onChange.
    setRange(start, end) {
      this.start = start || null;
      this.end   = end   || null;
      this.pickingEnd = false;
      if (this.start) {
        this.year  = this.start.getFullYear();
        this.month = this.start.getMonth();
      }
      this._updateLabel();
      if (this._built && this.picker.classList.contains('open')) this._render();
    }

    clear() {
      this.start = null;
      this.end = null;
      this.pickingEnd = false;
      this._updateLabel();
      if (this._built) this._render();
      this.onChange(null, null);
    }

    getRange() { return { start: this.start, end: this.end }; }
  }

  // Single-date variant. Reuses the same .avail-range-picker styling and the
  // single-month calendar visuals from the range picker, but commits on a
  // single click and tracks one date.
  //
  // Usage:
  //   const picker = new SingleDatePicker({
  //     trigger:     document.getElementById('myBtn'),
  //     labelEl:     document.getElementById('myBtnLabel'),
  //     placeholder: 'Select date',
  //     onChange:    (date) => { ... },
  //   });
  //
  //   picker.setDate(new Date());     // silent
  //   picker.getDate();
  //   picker.clear();                 // fires onChange(null)
  class SingleDatePicker {
    constructor(opts) {
      this.trigger     = opts.trigger;
      this.labelEl     = opts.labelEl || opts.trigger;
      this.placeholder = opts.placeholder || 'Select date';
      this.onChange    = opts.onChange || (() => {});
      this.date        = null;
      this._built      = false;

      const now = new Date();
      this.year  = now.getFullYear();
      this.month = now.getMonth();

      this.trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!this._built) this._buildPicker();
        this._toggle();
      });

      document.addEventListener('click', (e) => {
        if (!this._built || !this.picker.classList.contains('open')) return;
        if (e.target.closest('.avail-range-picker') || this.trigger.contains(e.target)) return;
        this._close();
      });

      this._updateLabel();
    }

    _buildPicker() {
      const el = document.createElement('div');
      el.className = 'avail-range-picker';
      el.addEventListener('click', (e) => e.stopPropagation());
      // Single-month variant — use a single calendar column with prev / label / next controls in the header.
      el.innerHTML = `
        <div class="ar-calendars" style="grid-template-columns:1fr;">
          <div class="ar-cal">
            <div class="ar-cal-header">
              <button type="button" class="calendar-nav" data-nav="-1">
                <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="7,1 3,5 7,9"/></svg>
              </button>
              <span class="calendar-month" data-month-label="1"></span>
              <button type="button" class="calendar-nav" data-nav="1">
                <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3,1 7,5 3,9"/></svg>
              </button>
            </div>
            <div class="ar-weekdays"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>
            <div class="ar-days" data-days="1"></div>
          </div>
        </div>
        <div class="ar-footer">
          <span class="ar-range-text"></span>
          <button type="button" class="btn btn-ghost" data-clear style="padding:5px 12px;font-size:11px;">Clear</button>
        </div>`;
      document.body.appendChild(el);
      el.querySelectorAll('[data-nav]').forEach((b) =>
        b.addEventListener('click', () => this._nav(parseInt(b.dataset.nav, 10)))
      );
      el.querySelector('[data-clear]').addEventListener('click', () => {
        this.clear();
        this._close();
      });
      this.picker = el;
      this._built = true;
    }

    _toggle() {
      if (this.picker.classList.contains('open')) this._close();
      else this._open();
    }

    _open() {
      if (this.date) {
        this.year  = this.date.getFullYear();
        this.month = this.date.getMonth();
      }
      this._render();
      const r = this.trigger.getBoundingClientRect();
      this.picker.style.top   = (r.bottom + 4) + 'px';
      this.picker.style.left  = r.left + 'px';
      this.picker.style.right = 'auto';
      this.picker.classList.add('open');
    }

    _close() {
      if (!this._built) return;
      this.picker.classList.remove('open');
    }

    _nav(dir) {
      this.month += dir;
      if (this.month > 11) { this.month = 0;  this.year++; }
      if (this.month < 0)  { this.month = 11; this.year--; }
      this._render();
    }

    _render() {
      this.picker.querySelector('[data-month-label="1"]').textContent = MONTH_LONG[this.month] + ' ' + this.year;
      this.picker.querySelector('[data-days="1"]').innerHTML = this._buildGrid(this.year, this.month);
      this._wireDayInteractions();
      this._updateFooter();
    }

    _buildGrid(yr, mo) {
      const firstDay = new Date(yr, mo, 1).getDay();
      const dim      = new Date(yr, mo + 1, 0).getDate();
      const today    = new Date(); today.setHours(0, 0, 0, 0);
      let html = '';
      for (let i = 0; i < firstDay; i++) html += '<span class="ar-day empty"></span>';
      for (let d = 1; d <= dim; d++) {
        const dt = new Date(yr, mo, d);
        let cls = 'ar-day';
        if (dt.getTime() === today.getTime()) cls += ' today';
        if (this.date && dt.getTime() === this.date.getTime()) cls += ' range-start range-end';
        html += `<span class="${cls}" data-y="${yr}" data-m="${mo}" data-d="${d}">${d}</span>`;
      }
      return html;
    }

    _wireDayInteractions() {
      this.picker.querySelectorAll('.ar-day:not(.empty)').forEach((span) => {
        span.addEventListener('click', () => {
          this._pickDay(+span.dataset.y, +span.dataset.m, +span.dataset.d);
        });
      });
    }

    _pickDay(yr, mo, d) {
      this.date = new Date(yr, mo, d);
      this._updateLabel();
      this._close();
      this.onChange(this.date);
    }

    _updateFooter() {
      const el = this.picker.querySelector('.ar-range-text');
      el.textContent = this.date ? fmtFooterLabel(this.date) : 'Select date';
    }

    _updateLabel() {
      if (!this.labelEl) return;
      if (this.date) {
        this.labelEl.textContent = fmtTriggerLabel(this.date);
        this.trigger.classList.remove('is-placeholder');
      } else {
        this.labelEl.textContent = this.placeholder;
        this.trigger.classList.add('is-placeholder');
      }
    }

    setDate(date) {
      this.date = date || null;
      if (this.date) {
        this.year  = this.date.getFullYear();
        this.month = this.date.getMonth();
      }
      this._updateLabel();
      if (this._built && this.picker.classList.contains('open')) this._render();
    }

    clear() {
      this.date = null;
      this._updateLabel();
      if (this._built) this._render();
      this.onChange(null);
    }

    getDate() { return this.date; }
  }

  window.DateRangePicker  = DateRangePicker;
  window.SingleDatePicker = SingleDatePicker;
})();
