/* ============================================================
   APP LỊCH - OOP & COMPONENT-BASED (v3)
   Phạm vi: 10/2016 → 03/2027
   Tính năng: Thống kê CẢ NĂM, Checkbox ĐÃ LÀM, Nền ảnh cá nhân
   ============================================================ */

// ============ 1. STORAGE MANAGER (Singleton) ============
class StorageManager {
    static instance = null;
    static KEY = 'app_lich_data_v2';

    static getInstance() {
        if (!StorageManager.instance) {
            StorageManager.instance = new StorageManager();
        }
        return StorageManager.instance;
    }

    load() {
        try {
            const raw = localStorage.getItem(StorageManager.KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.error('Lỗi load dữ liệu:', e);
            return {};
        }
    }

    save(data) {
        try {
            localStorage.setItem(StorageManager.KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Lỗi lưu dữ liệu:', e);
            return false;
        }
    }
}

// ============ 2. DATE UTILS ============
class DateUtils {
    static MONTH_NAMES = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];

    static WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    static WEEKDAY_FULL = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

    static formatKey(year, month, day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    static parseKey(dateKey) {
        const [y, m, d] = dateKey.split('-').map(Number);
        return { year: y, month: m - 1, day: d };
    }

    static formatDisplay(dateKey) {
        const { year, month, day } = DateUtils.parseKey(dateKey);
        const dow = new Date(year, month, day).getDay();
        return `${DateUtils.WEEKDAY_FULL[dow]}, ngày ${day} ${DateUtils.MONTH_NAMES[month]} năm ${year}`;
    }

    static formatDisplayShort(dateKey) {
        const { year, month, day } = DateUtils.parseKey(dateKey);
        const dow = new Date(year, month, day).getDay();
        return `${DateUtils.WEEKDAYS[dow]} ${day}/${String(month + 1).padStart(2, '0')}/${year}`;
    }

    static getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    static getFirstDayOfMonth(year, month) {
        return new Date(year, month, 1).getDay();
    }

    static formatMoney(num) {
        if (!num) return '0đ';
        return new Intl.NumberFormat('vi-VN').format(num) + 'đ';
    }
}

// ============ 3. DAY MODEL ============
class DayModel {
    constructor(dateKey, { money = 0, note = '', done = false } = {}) {
        this.dateKey = dateKey;
        this.money = Number(money) || 0;
        this.note = note || '';
        this.done = Boolean(done);
    }

    hasData() {
        return this.money > 0 || this.note.trim().length > 0;
    }

    toJSON() {
        return { money: this.money, note: this.note, done: this.done };
    }
}

// ============ 4. CALENDAR CORE ============
class CalendarCore {
    static MIN_YEAR = 2016;
    static MIN_MONTH = 9;  // Tháng 10 (0-indexed)
    static MAX_YEAR = 2027;
    static MAX_MONTH = 2;  // Tháng 3 (0-indexed)

    constructor() {
        const now = new Date();
        this.currentYear = now.getFullYear();
        this.currentMonth = now.getMonth();
        this._clamp();
        this.data = StorageManager.getInstance().load();
    }

    _clamp() {
        const minDate = new Date(CalendarCore.MIN_YEAR, CalendarCore.MIN_MONTH, 1);
        const maxDate = new Date(CalendarCore.MAX_YEAR, CalendarCore.MAX_MONTH + 1, 0);
        const cur = new Date(this.currentYear, this.currentMonth, 1);
        if (cur < minDate) {
            this.currentYear = CalendarCore.MIN_YEAR;
            this.currentMonth = CalendarCore.MIN_MONTH;
        } else if (cur > maxDate) {
            this.currentYear = CalendarCore.MAX_YEAR;
            this.currentMonth = CalendarCore.MAX_MONTH;
        }
    }

    canGoPrev() {
        return !(this.currentYear === CalendarCore.MIN_YEAR && this.currentMonth === CalendarCore.MIN_MONTH);
    }

    canGoNext() {
        return !(this.currentYear === CalendarCore.MAX_YEAR && this.currentMonth === CalendarCore.MAX_MONTH);
    }

    goPrev() {
        if (!this.canGoPrev()) return;
        this.currentMonth--;
        if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
    }

    goNext() {
        if (!this.canGoNext()) return;
        this.currentMonth++;
        if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
    }

    getMonthTitle() {
        return `${DateUtils.MONTH_NAMES[this.currentMonth]} / ${this.currentYear}`;
    }

    /** Lấy danh sách tất cả ngày trong NĂM hiện tại (trong phạm vi cho phép) */
    getAllDaysInYear(year) {
        const allDays = [];
        const startMonth = (year === CalendarCore.MIN_YEAR) ? CalendarCore.MIN_MONTH : 0;
        const endMonth = (year === CalendarCore.MAX_YEAR) ? CalendarCore.MAX_MONTH : 11;

        for (let m = startMonth; m <= endMonth; m++) {
            const daysInMonth = DateUtils.getDaysInMonth(year, m);
            for (let d = 1; d <= daysInMonth; d++) {
                const dateKey = DateUtils.formatKey(year, m, d);
                const raw = this.data[dateKey] || {};
                const day = new DayModel(dateKey, raw);
                allDays.push({ dateKey, model: day });
            }
        }
        return allDays;
    }

    getDays() {
        const daysInMonth = DateUtils.getDaysInMonth(this.currentYear, this.currentMonth);
        const firstDay = DateUtils.getFirstDayOfMonth(this.currentYear, this.currentMonth);
        const result = [];

        for (let i = 0; i < firstDay; i++) result.push({ empty: true });

        for (let d = 1; d <= daysInMonth; d++) {
            const dateKey = DateUtils.formatKey(this.currentYear, this.currentMonth, d);
            const raw = this.data[dateKey] || {};
            const day = new DayModel(dateKey, raw);
            const dateObj = new Date(this.currentYear, this.currentMonth, d);
            const dow = dateObj.getDay();
            result.push({
                empty: false, day: d, dateKey,
                dayOfWeek: dow,
                isWeekend: dow === 0 || dow === 6,
                isToday: this._isToday(dateObj),
                model: day
            });
        }
        return result;
    }

    _isToday(dateObj) {
        const now = new Date();
        return dateObj.getFullYear() === now.getFullYear()
            && dateObj.getMonth() === now.getMonth()
            && dateObj.getDate() === now.getDate();
    }

    saveDay(dateKey, money, note) {
        const existing = this.data[dateKey] || {};
        const day = new DayModel(dateKey, { money, note, done: existing.done || false });
        if (day.hasData()) {
            this.data[dateKey] = day.toJSON();
        } else {
            delete this.data[dateKey];
        }
        StorageManager.getInstance().save(this.data);
    }

    clearDay(dateKey) {
        delete this.data[dateKey];
        StorageManager.getInstance().save(this.data);
    }

    toggleDone(dateKey) {
        const raw = this.data[dateKey] || {};
        const day = new DayModel(dateKey, { ...raw, done: !raw.done });
        if (day.hasData() || day.done) {
            this.data[dateKey] = day.toJSON();
        } else {
            delete this.data[dateKey];
        }
        StorageManager.getInstance().save(this.data);
    }

    /** Thống kê tháng hiện tại */
    getMonthStats() {
        const days = this.getDays().filter(d => !d.empty);
        let total = 0, count = 0, noteCount = 0, doneCount = 0;
        for (const d of days) {
            if (d.model.money > 0) { total += d.model.money; count++; }
            if (d.model.note.trim()) noteCount++;
            if (d.model.done) doneCount++;
        }
        return { total, count, noteCount, doneCount, avg: count > 0 ? total / count : 0 };
    }

    /** Thống kê CẢ NĂM hiện tại */
    getYearStats() {
        const allDays = this.getAllDaysInYear(this.currentYear);
        let total = 0, count = 0, noteCount = 0, doneCount = 0;
        for (const d of allDays) {
            if (d.model.money > 0) { total += d.model.money; count++; }
            if (d.model.note.trim()) noteCount++;
            if (d.model.done) doneCount++;
        }
        return { total, count, noteCount, doneCount, avg: count > 0 ? total / count : 0 };
    }

    getMoneyEntries() {
        return this.getDays()
            .filter(d => !d.empty && d.model.money > 0)
            .map(d => ({ dateKey: d.dateKey, money: d.model.money, done: d.model.done }));
    }

    getNoteEntries() {
        return this.getDays()
            .filter(d => !d.empty && d.model.note.trim().length > 0)
            .map(d => ({ dateKey: d.dateKey, note: d.model.note, done: d.model.done }));
    }
}

// ============ 5. COMPONENTS ============

class HeaderComponent {
    render() {
        return `
            <header class="app-header">
                <h1 class="app-title">
                    <i class="fas fa-calendar-alt"></i>
                    APP Lịch - Quản lý Tài chính & Ghi chú
                </h1>
                <p class="app-subtitle">
                    Phạm vi: Tháng 10/2016 → Tháng 3/2027 | Dữ liệu được lưu tự động trên trình duyệt
                </p>
            </header>
        `;
    }
}

class ControlsComponent {
    constructor(calendar, onChange) {
        this.calendar = calendar;
        this.onChange = onChange;
    }

    render() {
        return `
            <div class="controls">
                <div class="nav-group">
                    <button class="btn btn-secondary" id="btn-prev" ${!this.calendar.canGoPrev() ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i> Tháng trước
                    </button>
                    <div class="current-month">${this.calendar.getMonthTitle()}</div>
                    <button class="btn btn-secondary" id="btn-next" ${!this.calendar.canGoNext() ? 'disabled' : ''}>
                        Tháng sau <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="nav-group">
                    <button class="btn btn-primary" id="btn-today">
                        <i class="fas fa-calendar-day"></i> Hôm nay
                    </button>
                </div>
            </div>
        `;
    }

    bind() {
        document.getElementById('btn-prev').addEventListener('click', () => { this.calendar.goPrev(); this.onChange(); });
        document.getElementById('btn-next').addEventListener('click', () => { this.calendar.goNext(); this.onChange(); });
        document.getElementById('btn-today').addEventListener('click', () => {
            const now = new Date();
            this.calendar.currentYear = now.getFullYear();
            this.calendar.currentMonth = now.getMonth();
            this.calendar._clamp();
            this.onChange();
        });
    }
}

class SummaryComponent {
    constructor(calendar, onMoneyClick, onNoteClick) {
        this.calendar = calendar;
        this.onMoneyClick = onMoneyClick;
        this.onNoteClick = onNoteClick;
    }

    render() {
        // ✅ Dùng getYearStats() để thống kê CẢ NĂM
        const stats = this.calendar.getYearStats();
        return `
            <div class="summary">
                <div class="summary-card total" id="summary-money">
                    <div class="summary-label"><i class="fas fa-coins"></i> Tổng tiền trong năm ${this.calendar.currentYear}</div>
                    <div class="summary-value">${DateUtils.formatMoney(stats.total)}</div>
                    <div class="summary-hint">👆 Click để xem chi tiết tháng</div>
                </div>
                <div class="summary-card income">
                    <div class="summary-label"><i class="fas fa-hand-holding-usd"></i> Số ngày có dữ liệu (năm ${this.calendar.currentYear})</div>
                    <div class="summary-value">${stats.count} ngày</div>
                </div>
                <div class="summary-card note" id="summary-note">
                    <div class="summary-label"><i class="fas fa-sticky-note"></i> Số ghi chú (năm ${this.calendar.currentYear})</div>
                    <div class="summary-value">${stats.noteCount} ghi chú</div>
                    <div class="summary-hint">👆 Click để xem chi tiết tháng</div>
                </div>
                <div class="summary-card avg">
                    <div class="summary-label"><i class="fas fa-chart-line"></i> Trung bình / ngày (năm ${this.calendar.currentYear})</div>
                    <div class="summary-value">${DateUtils.formatMoney(Math.round(stats.avg))}</div>
                </div>
            </div>
        `;
    }

    bind() {
        document.getElementById('summary-money').addEventListener('click', () => this.onMoneyClick());
        document.getElementById('summary-note').addEventListener('click', () => this.onNoteClick());
    }
}

class CalendarGridComponent {
    constructor(calendar, onDayClick) {
        this.calendar = calendar;
        this.onDayClick = onDayClick;
    }

    render() {
        const days = this.calendar.getDays();

        let weekdayHTML = '<div class="weekday-header">';
        DateUtils.WEEKDAYS.forEach((name, i) => {
            const isWeekend = i === 0 || i === 6;
            weekdayHTML += `<div class="weekday-cell ${isWeekend ? 'weekend' : ''}">${name}</div>`;
        });
        weekdayHTML += '</div>';

        let gridHTML = '<div class="calendar-grid">';
        for (const d of days) {
            if (d.empty) {
                gridHTML += '<div class="day-cell empty"></div>';
            } else {
                const classes = ['day-cell'];
                if (d.isToday) classes.push('today');
                if (d.isWeekend) classes.push('weekend');
                if (d.model.money > 0) classes.push('has-money');
                if (d.model.note.trim()) classes.push('has-note');

                gridHTML += `
                    <div class="${classes.join(' ')}" data-date="${d.dateKey}">
                        <div class="day-number">${d.day}</div>
                        ${d.model.money > 0 ? `<div class="day-money">${DateUtils.formatMoney(d.model.money)}</div>` : ''}
                        ${d.model.note.trim() ? `<div class="day-note-preview">${this._escapeHtml(d.model.note)}</div>` : ''}
                    </div>
                `;
            }
        }
        gridHTML += '</div>';

        return `<div class="calendar-container">${weekdayHTML}${gridHTML}</div>`;
    }

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    bind() {
        document.querySelectorAll('.day-cell:not(.empty)').forEach(cell => {
            cell.addEventListener('click', () => this.onDayClick(cell.dataset.date));
        });
    }
}

class DayModalComponent {
    constructor(calendar, onSave) {
        this.calendar = calendar;
        this.onSave = onSave;
        this.currentDateKey = null;
        this._bindDOM();
    }

    _bindDOM() {
        this.overlay = document.getElementById('modal-overlay');
        this.title = document.getElementById('modal-title');
        this.dateLabel = document.getElementById('modal-date');
        this.bodyEl = document.getElementById('modal-body-content');
        this.footerEl = document.getElementById('modal-footer-content');
        this.btnClose = document.getElementById('modal-close');

        this.btnClose.addEventListener('click', () => this.hide());
        this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) this.hide(); });
    }

    show(dateKey) {
        this.currentDateKey = dateKey;
        const raw = this.calendar.data[dateKey] || {};
        const model = new DayModel(dateKey, raw);

        this.title.textContent = 'Chi tiết ngày';
        this.dateLabel.textContent = DateUtils.formatDisplay(dateKey);

        this.bodyEl.innerHTML = `
            <div class="form-group">
                <label><i class="fas fa-money-bill-wave"></i> Số tiền (VNĐ)</label>
                <input type="number" id="input-money" placeholder="Nhập số tiền..." min="0" step="1000" value="${model.money || ''}">
            </div>
            <div class="form-group">
                <label><i class="fas fa-sticky-note"></i> Ghi chú / Lưu ý</label>
                <textarea id="input-note" placeholder="Nhập ghi chú cho ngày này..." rows="4">${this._escapeHtml(model.note)}</textarea>
            </div>
        `;

        this.footerEl.innerHTML = `
            <button class="btn btn-danger" id="btn-clear-day"><i class="fas fa-trash"></i> Xóa dữ liệu</button>
            <button class="btn btn-primary" id="btn-save-day"><i class="fas fa-save"></i> Lưu</button>
        `;

        this.overlay.classList.remove('hidden');
        this.modalEl = document.getElementById('modal-inner');
        this.modalEl.classList.remove('modal-large');

        document.getElementById('btn-save-day').addEventListener('click', () => this._handleSave());
        document.getElementById('btn-clear-day').addEventListener('click', () => this._handleClear());
        setTimeout(() => document.getElementById('input-money').focus(), 100);
    }

    hide() {
        this.overlay.classList.add('hidden');
        this.currentDateKey = null;
    }

    _handleSave() {
        const money = parseFloat(document.getElementById('input-money').value) || 0;
        const note = document.getElementById('input-note').value.trim();
        this.calendar.saveDay(this.currentDateKey, money, note);
        this.hide();
        this.onSave();
    }

    _handleClear() {
        if (confirm('Bạn có chắc muốn xóa toàn bộ dữ liệu của ngày này?')) {
            this.calendar.clearDay(this.currentDateKey);
            this.hide();
            this.onSave();
        }
    }

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

class DetailModalComponent {
    constructor(calendar, onToggleDone, onRefresh) {
        this.calendar = calendar;
        this.onToggleDone = onToggleDone;
        this.onRefresh = onRefresh;
        this._bindDOM();
    }

    _bindDOM() {
        this.overlay = document.getElementById('modal-overlay');
        this.title = document.getElementById('modal-title');
        this.dateLabel = document.getElementById('modal-date');
        this.bodyEl = document.getElementById('modal-body-content');
        this.footerEl = document.getElementById('modal-footer-content');
        this.btnClose = document.getElementById('modal-close');

        this.btnClose.addEventListener('click', () => this.hide());
        this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) this.hide(); });
    }

    hide() {
        this.overlay.classList.add('hidden');
    }

    showMoneyDetail() {
        const entries = this.calendar.getMoneyEntries();
        const stats = this.calendar.getMonthStats();

        this.title.textContent = '💰 Chi tiết tiền trong tháng';
        this.dateLabel.textContent = this.calendar.getMonthTitle();

        if (entries.length === 0) {
            this.bodyEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-coins"></i>
                    <p>Chưa có khoản tiền nào trong tháng này</p>
                </div>
            `;
        } else {
            let rows = '';
            entries.forEach((entry) => {
                const rowClass = entry.done ? 'row-done' : '';
                rows += `
                    <tr class="${rowClass}">
                        <td class="date-cell">${DateUtils.formatDisplayShort(entry.dateKey)}</td>
                        <td class="money-cell">${DateUtils.formatMoney(entry.money)}</td>
                        <td class="done-cell">
                            <label class="done-checkbox-wrapper">
                                <input type="checkbox" class="done-cb" data-date="${entry.dateKey}" ${entry.done ? 'checked' : ''}>
                                <span class="done-checkbox-label">
                                    <i class="fas fa-check"></i> ĐÃ LÀM
                                </span>
                            </label>
                        </td>
                    </tr>
                `;
            });

            this.bodyEl.innerHTML = `
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th style="width:40%">Ngày</th>
                            <th style="width:30%">Số tiền</th>
                            <th style="width:30%">Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="detail-total-row">
                    <span class="total-label"><i class="fas fa-calculator"></i> Tổng cộng tháng này</span>
                    <span class="total-value">${DateUtils.formatMoney(stats.total)}</span>
                </div>
            `;
        }

        this.footerEl.innerHTML = `<button class="btn btn-secondary" id="btn-close-detail"><i class="fas fa-times"></i> Đóng</button>`;
        document.getElementById('btn-close-detail').addEventListener('click', () => this.hide());

        this.overlay.classList.remove('hidden');
        this.modalEl = document.getElementById('modal-inner');
        this.modalEl.classList.add('modal-large');

        this.bodyEl.querySelectorAll('.done-cb').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const dateKey = e.target.dataset.date;
                this.calendar.toggleDone(dateKey);
                this.onToggleDone();
                this.showMoneyDetail();
            });
        });
    }

    showNoteDetail() {
        const entries = this.calendar.getNoteEntries();

        this.title.textContent = ' Chi tiết ghi chú trong tháng';
        this.dateLabel.textContent = this.calendar.getMonthTitle();

        if (entries.length === 0) {
            this.bodyEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-sticky-note"></i>
                    <p>Chưa có ghi chú nào trong tháng này</p>
                </div>
            `;
        } else {
            let rows = '';
            entries.forEach((entry) => {
                const rowClass = entry.done ? 'row-done' : '';
                rows += `
                    <tr class="${rowClass}">
                        <td class="date-cell">${DateUtils.formatDisplayShort(entry.dateKey)}</td>
                        <td><span class="note-text note-full">${this._escapeHtml(entry.note)}</span></td>
                        <td class="done-cell">
                            <label class="done-checkbox-wrapper">
                                <input type="checkbox" class="done-cb" data-date="${entry.dateKey}" ${entry.done ? 'checked' : ''}>
                                <span class="done-checkbox-label">
                                    <i class="fas fa-check"></i> ĐÃ LÀM
                                </span>
                            </label>
                        </td>
                    </tr>
                `;
            });

            this.bodyEl.innerHTML = `
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th style="width:25%">Ngày</th>
                            <th style="width:50%">Ghi chú</th>
                            <th style="width:25%">Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
        }

        this.footerEl.innerHTML = `<button class="btn btn-secondary" id="btn-close-detail"><i class="fas fa-times"></i> Đóng</button>`;
        document.getElementById('btn-close-detail').addEventListener('click', () => this.hide());

        this.overlay.classList.remove('hidden');
        this.modalEl = document.getElementById('modal-inner');
        this.modalEl.classList.add('modal-large');

        this.bodyEl.querySelectorAll('.done-cb').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const dateKey = e.target.dataset.date;
                this.calendar.toggleDone(dateKey);
                this.onToggleDone();
                this.showNoteDetail();
            });
        });
    }

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// ============ 6. APP (Main Controller) ============
class App {
    constructor(rootElement) {
        this.root = rootElement;
        this.calendar = new CalendarCore();

        this.headerCmp = new HeaderComponent();
        this.controlsCmp = new ControlsComponent(this.calendar, () => this.render());
        this.summaryCmp = new SummaryComponent(
            this.calendar,
            () => this._showMoneyDetail(),
            () => this._showNoteDetail()
        );
        this.gridCmp = new CalendarGridComponent(this.calendar, (dateKey) => this._openDayModal(dateKey));
        this.dayModalCmp = new DayModalComponent(this.calendar, () => this.render());
        this.detailModalCmp = new DetailModalComponent(
            this.calendar,
            () => this.render(),
            () => this.render()
        );
    }

    render() {
        this.root.innerHTML = `
            ${this.headerCmp.render()}
            ${this.controlsCmp.render()}
            ${this.summaryCmp.render()}
            ${this.gridCmp.render()}
        `;
        this.controlsCmp.bind();
        this.summaryCmp.bind();
        this.gridCmp.bind();
    }

    _openDayModal(dateKey) {
        this.dayModalCmp.show(dateKey);
    }

    _showMoneyDetail() {
        this.detailModalCmp.showMoneyDetail();
    }

    _showNoteDetail() {
        this.detailModalCmp.showNoteDetail();
    }

    start() {
        this.render();
        console.log('%c✅ APP Lịch v3 đã khởi động!', 'color: #10b981; font-size: 16px; font-weight: bold;');
    }
}

// ============ 7. KHỞI CHẠY ============
document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('app-root');
    const app = new App(root);
    app.start();
});