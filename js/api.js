/* ═══════════════════════════════════════════
   Auctusphere API Client
   Handles all communication with the backend.
   ═══════════════════════════════════════════ */

const API = {
    baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8000/api/v1'
        : `${window.location.origin}/api/v1`,
    token: null,

    setToken(token) {
        this.token = token;
        localStorage.setItem('ath_token', token);
    },

    getToken() {
        if (!this.token) {
            this.token = localStorage.getItem('ath_token');
        }
        return this.token;
    },

    clearToken() {
        this.token = null;
        localStorage.removeItem('ath_token');
    },

    headers() {
        const h = { 'Content-Type': 'application/json' };
        const token = this.getToken();
        if (token) h['Authorization'] = `Bearer ${token}`;
        return h;
    },

    async request(method, path, body = null) {
        const opts = {
            method,
            headers: this.headers(),
        };
        if (body) opts.body = JSON.stringify(body);

        try {
            const res = await fetch(`${this.baseUrl}${path}`, opts);
            if (res.status === 401) {
                this.clearToken();
                App.showLogin();
                throw new Error('Session expired. Please sign in again.');
            }
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Request failed');
            return data;
        } catch (err) {
            console.error(`API ${method} ${path}:`, err);
            throw err;
        }
    },

    // Auth
    async login(email, password) {
        // FastAPI OAuth2 expects form data for token endpoint
        const res = await fetch(`${this.baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login failed');
        this.setToken(data.access_token);
        return data;
    },

    async onboard(info) {
        const res = await fetch(`${this.baseUrl}/tenants/onboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(info),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Signup failed');
        this.setToken(data.access_token);
        return data;
    },

    async getMe() { return this.request('GET', '/auth/me'); },
    async getMyRestaurant() { return this.request('GET', '/tenants/me'); },

    // Data
    async addPurchase(data) { return this.request('POST', '/data/purchases', data); },
    async getPurchases(start, end) {
        let q = '/data/purchases?';
        if (start) q += `start_date=${start}&`;
        if (end) q += `end_date=${end}&`;
        return this.request('GET', q);
    },

    async addSales(data) { return this.request('POST', '/data/sales', data); },
    async getSales(start, end) {
        let q = '/data/sales?';
        if (start) q += `start_date=${start}&`;
        if (end) q += `end_date=${end}&`;
        return this.request('GET', q);
    },

    async addWaste(data) { return this.request('POST', '/data/waste', data); },
    async getWaste(start, end) {
        let q = '/data/waste?';
        if (start) q += `start_date=${start}&`;
        if (end) q += `end_date=${end}&`;
        return this.request('GET', q);
    },

    async addInventory(data) { return this.request('POST', '/data/inventory', data); },
    async getInventory(date) {
        let q = '/data/inventory?';
        if (date) q += `count_date=${date}&`;
        return this.request('GET', q);
    },

    async addMenuItem(data) { return this.request('POST', '/menu/items', data); },
    async getMenuItems() { return this.request('GET', '/menu/items'); },
    async deleteMenuItem(id) { return this.request('DELETE', `/menu/items/${id}`); },
    async delete(path) { return this.request('DELETE', path); },

    // Invoices
    async getInvoices(params = {}) {
        const q = new URLSearchParams(params).toString();
        return this.request('GET', `/data/invoices${q ? '?' + q : ''}`);
    },
    async getInvoiceFile(id) { return `${this.baseUrl}/data/invoices/${id}/file`; },
    async deleteInvoice(id) { return this.request('DELETE', `/data/invoices/${id}`); },
    async getPriceHistory(itemName) { return this.request('GET', `/data/invoices/price-history/${encodeURIComponent(itemName)}`); },

    // Price Alerts
    async getPriceAlerts() { return this.request('GET', '/data/price-alerts'); },
    async updatePriceAlert(id, status) { return this.request('PATCH', `/data/price-alerts/${id}`, { status }); },

    async scanInvoice(formData) {
        const res = await fetch(`${this.baseUrl}/data/scan-invoice`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.getToken()}` },
            body: formData
        });
        if (res.status === 401) { this.clearToken(); App.showLogin(); throw new Error('Session expired'); }
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Scan failed');
        return data;
    },

        // Reports
    async getDashboard() { return this.request('GET', '/reports/dashboard'); },
    async getWeeklyReport(weekEnd) { return this.request('GET', `/reports/weekly?week_end=${weekEnd}`); },
};
