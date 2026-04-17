/* Auctusphere Frontend App — Project ATH v2.0 */

const App = {
    currentPage: 'dashboard',
    charts: {},

    // ── TOAST NOTIFICATIONS ──
    toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        const icons = { success: '✓', error: '✕', info: 'ℹ' };
        toast.innerHTML = '<span>' + (icons[type] || '') + '</span> ' + message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    // ── MOBILE SIDEBAR ──
    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('open');
        document.querySelector('.sidebar-overlay').classList.toggle('active');
    },

    // ── INIT ──
    async init() {
        this.setupTabs();
        this.setupNav();
        this.setupForms();
        this.setupScannerDropzone();
        if (typeof lucide !== 'undefined') lucide.createIcons();
        if (API.getToken()) {
            try {
                await this.loadApp();
            } catch (e) {
                this.showLogin();
            }
        } else {
            this.showLogin();
        }
    },

    // ── AUTH ──
    showLogin() {
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('main-app').classList.remove('active');
    },

    showApp() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('main-app').classList.add('active');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    async loadApp() {
        const restaurant = await API.getMyRestaurant();
        this.state = this.state || {};
        this.state.user = restaurant;
        document.getElementById('restaurant-name').textContent = restaurant.name;
        const tier = restaurant.subscription_tier || 'founding';
        document.getElementById('subscription-tier').textContent =
            tier.charAt(0).toUpperCase() + tier.slice(1) + ' Member';
        document.getElementById('subscription-tier').className = 'tier-badge ' + tier;
        // Show email in sidebar footer
        let emailEl = document.getElementById('sidebar-user-email');
        if (!emailEl) {
            emailEl = document.createElement('div');
            emailEl.id = 'sidebar-user-email';
            emailEl.className = 'sidebar-user-email';
            document.getElementById('subscription-tier').after(emailEl);
        }
        emailEl.textContent = restaurant.email || '';
        this.showApp();
        this.navigate('dashboard');
    },

    setupTabs() {
        document.querySelectorAll('#login-tab-bar .tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#login-tab-bar .tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const target = tab.dataset.tab;
                document.getElementById('login-form').classList.toggle('active', target === 'login');
                document.getElementById('signup-form').classList.toggle('active', target === 'signup');
            });
        });
    },

    setupForms() {
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const errEl = document.getElementById('login-error');
            errEl.textContent = '';
            try {
                await API.login(
                    document.getElementById('login-email').value,
                    document.getElementById('login-password').value
                );
                this.toast('Welcome back!', 'success');
                await this.loadApp();
            } catch (err) {
                errEl.textContent = err.message;
                this.toast('Login failed: ' + err.message, 'error');
            }
        });

        document.getElementById('signup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const errEl = document.getElementById('signup-error');
            const successEl = document.getElementById('signup-success');
            errEl.textContent = '';
            successEl.textContent = '';
            try {
                const data = await API.onboard({
                    restaurant_name: document.getElementById('signup-restaurant').value,
                    owner_name: document.getElementById('signup-name').value,
                    owner_email: document.getElementById('signup-email').value,
                    owner_password: document.getElementById('signup-password').value,
                    city: document.getElementById('signup-city').value || undefined,
                    state: document.getElementById('signup-state').value || undefined,
                    target_food_cost_pct: parseFloat(document.getElementById('signup-target').value) || 30,
                });
                this.toast(data.message, 'success');
                successEl.textContent = data.message;
                setTimeout(() => this.loadApp(), 1000);
            } catch (err) {
                errEl.textContent = err.message;
                this.toast('Signup failed: ' + err.message, 'error');
            }
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            API.clearToken();
            this.toast('Signed out', 'info');
            this.showLogin();
        });
    },

    // ── NAVIGATION ──
    setupNav() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                this.navigate(item.dataset.page);
                // Close sidebar on mobile
                if (window.innerWidth <= 768) this.toggleSidebar();
            });
        });
    },

    navigate(page) {
        this.currentPage = page;
        document.querySelectorAll('.nav-item').forEach(n =>
            n.classList.toggle('active', n.dataset.page === page));
        document.querySelectorAll('.page').forEach(p =>
            p.classList.toggle('active', p.id === 'page-' + page));

        switch (page) {
            case 'dashboard': this.loadDashboard(); break;
            case 'purchases': this.loadPurchases(); break;
            case 'sales': this.loadSalesData(); break;
            case 'waste': this.loadWasteData(); break;
            case 'inventory': this.loadInventoryData(); break;
            case 'menu': this.loadMenuItems(); break;
            case 'reports': this.loadReport(); break;
            case 'invoices': this.loadInvoices(); break;
            case 'alerts': this.loadPriceAlerts(); break;
        }
    },

    // ── FORMS ──
    toggleForm(id) {
        const el = document.getElementById(id);
        const willOpen = el.classList.contains('hidden');
        el.classList.toggle('hidden');
        if (willOpen) this.prefillFormDate(id);
    },

    prefillFormDate(id) {
        const map = {
            'purchase-form': 'p-date',
            'sales-form': 's-date',
            'waste-form': 'w-date',
            'inv-form': 'i-date',
        };
        const input = document.getElementById(map[id]);
        if (input && !input.value) input.value = this.todayStr();
    },

    todayStr() {
        return new Date().toISOString().split('T')[0];
    },

    // ── DASHBOARD ──
    async loadDashboard() {
        document.getElementById('dash-date').textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        // Show shimmer while loading
        document.querySelectorAll('.kpi-card').forEach(c => c.classList.add('loading'));
        try {
            const d = await API.getDashboard();
            // Remove shimmer
            document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('loading'));
            const hasData = d.monthly_revenue > 0 || d.monthly_purchases > 0;
            // Show/hide getting-started card
            let gsCard = document.getElementById('getting-started-card');
            if (!hasData) {
                if (!gsCard) {
                    gsCard = document.createElement('div');
                    gsCard.id = 'getting-started-card';
                    gsCard.className = 'getting-started-card';
                    gsCard.innerHTML = `
                        <div class="gs-header">
                            <div class="gs-icon"><i data-lucide="rocket" style="width:22px;height:22px;"></i></div>
                            <div>
                                <div class="gs-title">Welcome to Auctusphere!</div>
                                <div class="gs-sub">Let&rsquo;s get your restaurant set up. Start with these three steps:</div>
                            </div>
                        </div>
                        <div class="gs-steps">
                            <div class="gs-step" onclick="App.navigate('purchases');setTimeout(()=>App.toggleForm('purchase-form'),100)">
                                <i data-lucide="shopping-cart" style="width:20px;height:20px;"></i>
                                <div><div class="gs-step-title">Add your first purchase</div><div class="gs-step-sub">Log what you buy from vendors</div></div>
                                <i data-lucide="chevron-right" style="width:16px;height:16px;margin-left:auto;opacity:0.4;"></i>
                            </div>
                            <div class="gs-step" onclick="App.navigate('sales');setTimeout(()=>App.toggleForm('sales-form'),100)">
                                <i data-lucide="dollar-sign" style="width:20px;height:20px;"></i>
                                <div><div class="gs-step-title">Log daily sales</div><div class="gs-step-sub">Track your revenue to calculate food cost %</div></div>
                                <i data-lucide="chevron-right" style="width:16px;height:16px;margin-left:auto;opacity:0.4;"></i>
                            </div>
                            <div class="gs-step" onclick="App.navigate('reports')">
                                <i data-lucide="file-text" style="width:20px;height:20px;"></i>
                                <div><div class="gs-step-title">Run your first report</div><div class="gs-step-sub">See where your money is going</div></div>
                                <i data-lucide="chevron-right" style="width:16px;height:16px;margin-left:auto;opacity:0.4;"></i>
                            </div>
                        </div>
                    `;
                    const kpiGrid = document.querySelector('.kpi-grid');
                    kpiGrid.parentNode.insertBefore(gsCard, kpiGrid);
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            } else if (gsCard) {
                gsCard.remove();
            }
            document.getElementById('kpi-food-cost').textContent = d.current_food_cost_pct.toFixed(1) + '%';
            document.getElementById('kpi-food-cost').style.color =
                d.current_food_cost_pct > d.target_food_cost_pct ? '#ef4444' : '#10b981';
            document.getElementById('kpi-food-target').textContent = 'Target: ' + d.target_food_cost_pct + '%';
            document.getElementById('kpi-revenue').textContent = '$' + d.monthly_revenue.toLocaleString();
            document.getElementById('kpi-purchases').textContent = '$' + d.monthly_purchases.toLocaleString();
            document.getElementById('kpi-savings').textContent = '$' + d.estimated_monthly_savings.toLocaleString();

            const ul = document.getElementById('action-items');
            if (d.recent_action_items && d.recent_action_items.length) {
                ul.innerHTML = d.recent_action_items.map(a => '<li>' + a + '</li>').join('');
            } else {
                ul.innerHTML = '<li class="empty">No action items yet — start logging data to see insights.</li>';
            }

            const wDiv = document.getElementById('waste-items');
            if (d.top_waste_items && d.top_waste_items.length) {
                wDiv.innerHTML = d.top_waste_items.map(w =>
                    '<div class="waste-item"><span class="waste-item-name">' + w.item +
                    '</span><span class="waste-item-cost">$' + w.cost.toFixed(2) + '</span></div>'
                ).join('');
            } else {
                wDiv.innerHTML = '<p class="empty">No waste entries yet.</p>';
            }

            this.renderFoodCostChart(d.food_cost_trend, d.target_food_cost_pct);
            this.renderPurchaseChart(d.purchase_breakdown);

            // Price alert banner
            try {
                const alerts = await API.getPriceAlerts();
                const pending = alerts.filter(a => a.status === 'pending');
                let banner = document.getElementById('dash-alert-banner');
                if (pending.length > 0) {
                    if (!banner) {
                        banner = document.createElement('div');
                        banner.id = 'dash-alert-banner';
                        banner.className = 'alert-banner';
                        const kpiGrid = document.querySelector('.kpi-grid');
                        kpiGrid.parentNode.insertBefore(banner, kpiGrid);
                    }
                    banner.innerHTML = `<span>⚠️ You have <strong>${pending.length}</strong> price alert${pending.length > 1 ? 's' : ''} from your last invoice scan.</span><a onclick="App.navigate('alerts')" style="cursor:pointer;font-weight:600;text-decoration:underline;margin-left:8px">Review them →</a><button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;margin-left:auto;font-size:18px;line-height:1;opacity:0.6;" title="Dismiss">×</button>`;
                } else if (banner) {
                    banner.remove();
                }
            } catch (_) { /* non-critical */ }
        } catch (err) {
            document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('loading'));
            console.error('Dashboard load error:', err);
        }
    },

    renderFoodCostChart(trend, target) {
        const ctx = document.getElementById('chart-food-cost');
        if (this.charts.foodCost) this.charts.foodCost.destroy();
        if (!trend || !trend.length) return;
        this.charts.foodCost = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trend.map(t => t.week_ending),
                datasets: [
                    {
                        label: 'Food Cost %',
                        data: trend.map(t => t.food_cost_pct),
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99,102,241,0.08)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointBackgroundColor: '#6366f1',
                        pointBorderWidth: 2,
                        pointBorderColor: '#fff',
                        borderWidth: 2.5,
                    },
                    {
                        label: 'Target',
                        data: trend.map(() => target),
                        borderColor: '#10b981',
                        borderDash: [6, 4],
                        pointRadius: 0,
                        fill: false,
                        borderWidth: 2,
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } } },
                scales: {
                    y: { beginAtZero: true, max: 50, grid: { color: 'rgba(0,0,0,0.04)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    },

    renderPurchaseChart(breakdown) {
        const ctx = document.getElementById('chart-purchases');
        if (this.charts.purchases) this.charts.purchases.destroy();
        if (!breakdown || !breakdown.length) return;
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#6b7280'];
        this.charts.purchases = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: breakdown.map(b => b.category.replace('FoodCategory.', '').replace('_', ' ')),
                datasets: [{
                    data: breakdown.map(b => b.total),
                    backgroundColor: colors.slice(0, breakdown.length),
                    borderWidth: 0,
                    hoverOffset: 6,
                }]
            },
            options: {
                responsive: true,
                cutout: '65%',
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, usePointStyle: true } } }
            }
        });
    },

    // ── DATA TABLES ──
    buildTable(headers, rows, emptyState) {
        if (rows.length === 0 && emptyState) {
            return `<div class="empty-state">
                <div class="empty-state-icon"><i data-lucide="${emptyState.icon}" style="width:40px;height:40px;"></i></div>
                <div class="empty-state-title">${emptyState.title}</div>
                <div class="empty-state-sub">${emptyState.sub}</div>
                <button class="btn primary small" onclick="${emptyState.action}">${emptyState.cta}</button>
            </div>`;
        }
        let html = '<table class="data-table"><thead><tr>';
        headers.forEach(h => html += '<th>' + h + '</th>');
        html += '</tr></thead><tbody>';
        if (rows.length === 0) {
            html += '<tr><td colspan="' + headers.length + '" style="text-align:center;color:#94a3b8;padding:32px;">No entries yet. Add your first record above.</td></tr>';
        }
        rows.forEach(r => {
            html += '<tr>';
            r.forEach(c => html += '<td>' + c + '</td>');
            html += '</tr>';
        });
        html += '</tbody></table>';
        return html;
    },

    deleteBtn(endpoint, id, reloadFn) {
        return `<button onclick="App.deleteEntry('${endpoint}',${id},'${reloadFn}')" style="background:none;border:none;cursor:pointer;color:#ef4444;padding:4px 6px;border-radius:6px;font-size:13px;font-weight:600;" title="Delete">✕</button>`;
    },

    editBtn(fn, dataJson) {
        const escaped = dataJson.replace(/'/g, '&#39;');
        return `<button onclick="App.${fn}(${escaped})" style="background:none;border:none;cursor:pointer;color:#6366f1;padding:4px 6px;border-radius:6px;font-size:13px;font-weight:600;" title="Edit">✎</button>`;
    },

    async deleteEntry(endpoint, id, reloadFn) {
        if (!confirm('Delete this entry? This cannot be undone.')) return;
        try {
            await API.delete(`/data/${endpoint}/${id}`);
            this.toast('Deleted', 'success');
            this[reloadFn]();
        } catch (err) { this.toast('Error: ' + err.message, 'error'); }
    },

    async put(endpoint, id, data) {
        return API.request('PUT', `/data/${endpoint}/${id}`, data);
    },

    // Edit handlers — pre-fill form and switch to update mode
    editPurchase(p) {
        const form = document.getElementById('purchase-form');
        form.classList.remove('hidden');
        document.getElementById('p-date').value = p.date;
        document.getElementById('p-vendor').value = p.vendor || '';
        document.getElementById('p-category').value = p.category ? p.category.replace('FoodCategory.','').toLowerCase() : 'protein';
        document.getElementById('p-amount').value = p.amount;
        document.getElementById('p-desc').value = p.description || '';
        form.dataset.editId = p.id;
        form.querySelector('h3').textContent = 'Edit Purchase';
        form.querySelector('[type=submit]').textContent = 'Update Purchase';
        form.scrollIntoView({ behavior: 'smooth' });
    },

    editSale(s) {
        const form = document.getElementById('sales-form');
        form.classList.remove('hidden');
        document.getElementById('s-date').value = s.date;
        document.getElementById('s-revenue').value = s.total_revenue;
        document.getElementById('s-covers').value = s.cover_count || '';
        document.getElementById('s-notes').value = s.notes || '';
        form.dataset.editId = s.id;
        form.querySelector('h3').textContent = 'Edit Sales Record';
        form.querySelector('[type=submit]').textContent = 'Update Sales';
        form.scrollIntoView({ behavior: 'smooth' });
    },

    editWaste(w) {
        const form = document.getElementById('waste-form');
        form.classList.remove('hidden');
        document.getElementById('w-date').value = w.date;
        document.getElementById('w-item').value = w.item_name;
        document.getElementById('w-category').value = w.category ? w.category.replace('FoodCategory.','').toLowerCase() : 'protein';
        document.getElementById('w-qty').value = w.quantity;
        document.getElementById('w-unit').value = w.unit || '';
        document.getElementById('w-cost').value = w.estimated_cost || '';
        document.getElementById('w-reason').value = w.reason ? w.reason.replace('WasteReason.','').toLowerCase() : 'other';
        document.getElementById('w-notes').value = w.notes || '';
        form.dataset.editId = w.id;
        form.querySelector('h3').textContent = 'Edit Waste Entry';
        form.querySelector('[type=submit]').textContent = 'Update Waste';
        form.scrollIntoView({ behavior: 'smooth' });
    },

    editInventory(i) {
        const form = document.getElementById('inv-form');
        form.classList.remove('hidden');
        document.getElementById('i-date').value = i.date;
        document.getElementById('i-item').value = i.item_name;
        document.getElementById('i-category').value = i.category ? i.category.replace('FoodCategory.','').toLowerCase() : 'protein';
        document.getElementById('i-qty').value = i.quantity;
        document.getElementById('i-unit').value = i.unit || '';
        document.getElementById('i-cost').value = i.unit_cost || '';
        form.dataset.editId = i.id;
        form.querySelector('h3').textContent = 'Edit Inventory';
        form.querySelector('[type=submit]').textContent = 'Update Count';
        form.scrollIntoView({ behavior: 'smooth' });
    },

    editMenuItem(m) {
        const form = document.getElementById('menu-form');
        form.classList.remove('hidden');
        document.getElementById('m-name').value = m.name;
        document.getElementById('m-cat').value = m.category || '';
        document.getElementById('m-price').value = m.selling_price;
        document.getElementById('m-cost').value = m.recipe_cost || '';
        form.dataset.editId = m.id;
        form.querySelector('h3').textContent = 'Edit Menu Item';
        form.querySelector('[type=submit]').textContent = 'Update Item';
        form.scrollIntoView({ behavior: 'smooth' });
    },

    async loadPurchases() {
        try {
            const data = await API.getPurchases();
            const rows = data.map(p => [
                p.date,
                p.vendor || '—',
                '<span class="category-badge">' + (p.category || '').replace('FoodCategory.','').replace('_', ' ') + '</span>',
                '<span class="amount">$' + p.amount.toFixed(2) + '</span>',
                p.description || '—',
                this.editBtn('editPurchase', JSON.stringify(p)) + this.deleteBtn('purchases', p.id, 'loadPurchases'),
            ]);
            const html = this.buildTable(['Date', 'Vendor', 'Category', 'Amount', 'Description', ''], rows, {
                icon: 'shopping-cart',
                title: 'No purchases yet',
                sub: 'Add your first purchase to start tracking food costs.',
                cta: 'Add Purchase',
                action: "App.toggleForm('purchase-form')",
            });
            document.getElementById('purchases-table').innerHTML = html;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch (err) { console.error(err); }
    },

    async loadSalesData() {
        try {
            const data = await API.getSales();
            const rows = data.map(s => [
                s.date,
                '<span class="amount">$' + s.total_revenue.toFixed(2) + '</span>',
                s.cover_count || '—',
                s.notes || '—',
                this.editBtn('editSale', JSON.stringify(s)) + this.deleteBtn('sales', s.id, 'loadSalesData'),
            ]);
            const html = this.buildTable(['Date', 'Revenue', 'Covers', 'Notes', ''], rows, {
                icon: 'trending-up',
                title: 'No sales recorded yet',
                sub: 'Log your daily revenue to calculate food cost percentage.',
                cta: 'Log Sales',
                action: "App.toggleForm('sales-form')",
            });
            document.getElementById('sales-table').innerHTML = html;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch (err) { console.error(err); }
    },

    async loadWasteData() {
        try {
            const data = await API.getWaste();
            const rows = data.map(w => [
                w.date,
                w.item_name,
                '<span class="category-badge">' + (w.category || '—').replace('FoodCategory.','').replace('_', ' ') + '</span>',
                w.quantity + ' ' + (w.unit || ''),
                '<span class="amount" style="color:#ef4444">$' + (w.estimated_cost || 0).toFixed(2) + '</span>',
                (w.reason || '').replace('WasteReason.','').replace('_', ' '),
                this.editBtn('editWaste', JSON.stringify(w)) + this.deleteBtn('waste', w.id, 'loadWasteData'),
            ]);
            const html = this.buildTable(['Date', 'Item', 'Category', 'Quantity', 'Cost', 'Reason', ''], rows, {
                icon: 'trash-2',
                title: 'No waste entries yet',
                sub: 'Start tracking waste to identify your biggest loss areas.',
                cta: 'Log Waste',
                action: "App.toggleForm('waste-form')",
            });
            document.getElementById('waste-table').innerHTML = html;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch (err) { console.error(err); }
    },

    async loadInventoryData() {
        try {
            const data = await API.getInventory();
            const rows = data.map(i => [
                i.date,
                i.item_name,
                '<span class="category-badge">' + (i.category || '—').replace('FoodCategory.','').replace('_', ' ') + '</span>',
                i.quantity + ' ' + (i.unit || ''),
                i.unit_cost ? '$' + i.unit_cost.toFixed(2) : '—',
                i.total_value ? '<span class="amount">$' + i.total_value.toFixed(2) + '</span>' : '—',
                this.editBtn('editInventory', JSON.stringify(i)) + this.deleteBtn('inventory', i.id, 'loadInventoryData'),
            ]);
            const html = this.buildTable(['Date', 'Item', 'Category', 'Quantity', 'Unit Cost', 'Total Value', ''], rows, {
                icon: 'package',
                title: 'No inventory counts yet',
                sub: 'Record inventory counts to track stock levels and value.',
                cta: 'Add Count',
                action: "App.toggleForm('inv-form')",
            });
            document.getElementById('inventory-table').innerHTML = html;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch (err) { console.error(err); }
    },

    async loadMenuItems() {
        try {
            const data = await API.getMenuItems();
            const rows = data.map(m => [
                m.name,
                m.category || '—',
                '<span class="amount">$' + m.selling_price.toFixed(2) + '</span>',
                m.recipe_cost ? '$' + m.recipe_cost.toFixed(2) : '—',
                m.recipe_cost ? ((m.recipe_cost / m.selling_price * 100).toFixed(1) + '%') : '—',
                this.editBtn('editMenuItem', JSON.stringify(m)) + this.deleteBtn('menu/items', m.id, 'loadMenuItems'),
            ]);
            const html = this.buildTable(['Name', 'Category', 'Price', 'Cost', 'Food Cost %', ''], rows, {
                icon: 'utensils',
                title: 'No menu items yet',
                sub: 'Add your menu items to calculate per-dish food cost percentages.',
                cta: 'Add Menu Item',
                action: "App.toggleForm('menu-form')",
            });
            document.getElementById('menu-table').innerHTML = html;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch (err) { console.error(err); }
    },

    // ── INVOICE ARCHIVE ──
    async loadInvoices() {
        const year = document.getElementById('inv-filter-year')?.value || '';
        const month = document.getElementById('inv-filter-month')?.value || '';
        const params = {};
        if (year) params.year = year;
        if (month) params.month = month;
        try {
            // Populate year filter dynamically
            const yearEl = document.getElementById('inv-filter-year');
            if (yearEl && yearEl.options.length === 1) {
                const currentYear = new Date().getFullYear();
                for (let y = currentYear; y >= currentYear - 3; y--) {
                    const opt = document.createElement('option');
                    opt.value = y; opt.textContent = y;
                    yearEl.appendChild(opt);
                }
            }
            const data = await API.getInvoices(params);
            const wrap = document.getElementById('invoices-table');
            if (!data.length) {
                wrap.innerHTML = `<div class="empty-state"><i data-lucide="archive" style="width:40px;height:40px;color:var(--text-muted)"></i><h3>No invoices yet</h3><p>Scan your first invoice to start building your archive.</p><button class="btn primary" onclick="App.navigate('scanner')">Scan Invoice</button></div>`;
                lucide.createIcons(); return;
            }
            const rows = data.map(inv => [
                inv.invoice_date || '—',
                inv.vendor || '—',
                inv.total_amount ? '<span class="amount">$' + inv.total_amount.toFixed(2) + '</span>' : '—',
                inv.original_filename || inv.filename,
                `<button class="btn small outline" onclick="App.viewInvoice(${inv.id},'${(inv.vendor||'Invoice').replace(/'/g,'')}')" style="margin-right:6px">View</button><button class="btn small outline" style="color:var(--danger);border-color:var(--danger)" onclick="App.deleteInvoice(${inv.id})">Delete</button>`
            ]);
            wrap.innerHTML = this.buildTable(['Date','Vendor','Total','File',''], rows);
            lucide.createIcons();
        } catch(err) { console.error(err); }
    },

    async viewInvoice(id, vendor) {
        const modal = document.getElementById('invoice-modal');
        const content = document.getElementById('invoice-modal-content');
        document.getElementById('invoice-modal-title').textContent = vendor + ' — Invoice';
        content.innerHTML = '<div style="text-align:center;padding:40px"><div class="spinner-lg"></div></div>';
        modal.classList.remove('hidden');
        try {
            const url = await API.getInvoiceFile(id);
            const token = API.getToken();
            content.innerHTML = `<img src="${url}?token=${token}" style="width:100%;border-radius:8px" onerror="this.parentElement.innerHTML='<p style=color:var(--text-muted)>Could not load invoice image.</p>'">`;
        } catch(err) { content.innerHTML = '<p style="color:var(--danger)">Error loading invoice.</p>'; }
    },

    closeInvoiceModal() {
        document.getElementById('invoice-modal').classList.add('hidden');
    },

    async deleteInvoice(id) {
        if (!confirm('Remove this invoice from the archive?')) return;
        try {
            await API.deleteInvoice(id);
            this.toast('Invoice removed', 'success');
            this.loadInvoices();
        } catch(err) { this.toast('Error: ' + err.message, 'error'); }
    },

    // ── PRICE ALERTS ──
    async loadPriceAlerts() {
        const wrap = document.getElementById('alerts-list');
        try {
            const data = await API.getPriceAlerts();
            // Update badge
            const badge = document.getElementById('alerts-badge');
            if (data.length > 0) {
                badge.textContent = data.length;
                badge.style.display = '';
            } else {
                badge.style.display = 'none';
            }
            if (!data.length) {
                wrap.innerHTML = `<div class="empty-state"><i data-lucide="bell" style="width:40px;height:40px;color:var(--text-muted)"></i><h3>No price alerts</h3><p>Price changes will appear here when detected from scanned invoices.</p></div>`;
                lucide.createIcons(); return;
            }
            wrap.innerHTML = data.map(alert => `
                <div class="alert-card ${alert.change_pct > 0 ? 'alert-up' : 'alert-down'}" id="alert-${alert.id}">
                    <div class="alert-icon">
                        <i data-lucide="${alert.change_pct > 0 ? 'trending-up' : 'trending-down'}" style="width:20px;height:20px"></i>
                    </div>
                    <div class="alert-body">
                        <div class="alert-title">${alert.item_name} ${alert.change_pct > 0 ? 'increased' : 'decreased'} ${Math.abs(alert.change_pct).toFixed(1)}%</div>
                        <div class="alert-meta">
                            ${alert.vendor ? alert.vendor + ' · ' : ''}
                            $${(alert.old_price||0).toFixed(3)} → $${(alert.new_price||0).toFixed(3)}
                            ${alert.unit ? ' per ' + alert.unit : ''}
                        </div>
                    </div>
                    <div class="alert-actions">
                        <button class="btn small primary" onclick="App.resolveAlert(${alert.id},'approved')">Approve</button>
                        <button class="btn small outline" onclick="App.resolveAlert(${alert.id},'dismissed')">Dismiss</button>
                    </div>
                </div>
            `).join('');
            lucide.createIcons();
        } catch(err) { wrap.innerHTML = '<p class="empty">Could not load alerts.</p>'; }
    },

    async resolveAlert(id, status) {
        try {
            const res = await API.updatePriceAlert(id, status);
            if (status === 'approved' && res.suggested_menu_updates && res.suggested_menu_updates.length > 0) {
                this.showMenuUpdateModal(res.suggested_menu_updates);
            } else {
                this.toast(status === 'approved' ? 'Alert approved — no matching menu items found.' : 'Alert dismissed.', 'success');
            }
            this.loadPriceAlerts();
        } catch(err) { this.toast('Error: ' + err.message, 'error'); }
    },

    showMenuUpdateModal(updates) {
        const modal = document.getElementById('menu-update-modal');
        const list = document.getElementById('menu-update-list');
        list.innerHTML = updates.map(u => `
            <div class="menu-update-row" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee">
                <div>
                    <strong>${u.menu_item_name}</strong><br>
                    <span style="color:#666;font-size:13px">$${(u.current_recipe_cost||0).toFixed(2)} &rarr; <strong style="color:#2d6a4f">$${(u.suggested_recipe_cost||0).toFixed(2)}</strong></span>
                </div>
                <button class="btn small primary" onclick="App.applyMenuCostUpdate(${u.menu_item_id}, ${u.suggested_recipe_cost}, this)">Update Price</button>
            </div>
        `).join('');
        modal.classList.remove('hidden');
    },

    closeMenuUpdateModal() {
        document.getElementById('menu-update-modal').classList.add('hidden');
    },

    async applyMenuCostUpdate(itemId, newCost, btn) {
        try {
            btn.disabled = true;
            btn.textContent = 'Saving…';
            await API.updateMenuItemCost(itemId, newCost);
            btn.textContent = '✓ Updated';
            btn.classList.remove('primary');
            btn.classList.add('outline');
            this.toast('Menu item cost updated!', 'success');
        } catch(err) {
            btn.disabled = false;
            btn.textContent = 'Update Price';
            this.toast('Error: ' + err.message, 'error');
        }
    },

    // ── SUBMIT HANDLERS ──
    async submitPurchase(e) {
        e.preventDefault();
        const form = document.getElementById('purchase-form');
        const editId = form.dataset.editId;
        const payload = {
            date: document.getElementById('p-date').value,
            vendor: document.getElementById('p-vendor').value || undefined,
            category: document.getElementById('p-category').value,
            amount: parseFloat(document.getElementById('p-amount').value),
            description: document.getElementById('p-desc').value || undefined,
        };
        try {
            if (editId) {
                await API.request('PUT', `/data/purchases/${editId}`, payload);
                delete form.dataset.editId;
                form.querySelector('h3').textContent = 'New Purchase';
                form.querySelector('[type=submit]').textContent = 'Save Purchase';
                this.toast('Purchase updated!', 'success');
            } else {
                await API.addPurchase(payload);
                this.toast('Purchase saved!', 'success');
            }
            this.toggleForm('purchase-form');
            e.target.reset();
            this.loadPurchases();
        } catch (err) { this.toast('Error: ' + err.message, 'error'); }
    },

    async submitSales(e) {
        e.preventDefault();
        const form = document.getElementById('sales-form');
        const editId = form.dataset.editId;
        const payload = {
            date: document.getElementById('s-date').value,
            total_revenue: parseFloat(document.getElementById('s-revenue').value),
            cover_count: parseInt(document.getElementById('s-covers').value) || undefined,
            notes: document.getElementById('s-notes').value || undefined,
        };
        try {
            if (editId) {
                await API.request('PUT', `/data/sales/${editId}`, payload);
                delete form.dataset.editId;
                form.querySelector('h3').textContent = 'Daily Sales Record';
                form.querySelector('[type=submit]').textContent = 'Save Sales';
                this.toast('Sales updated!', 'success');
            } else {
                await API.addSales(payload);
                this.toast('Sales recorded!', 'success');
            }
            this.toggleForm('sales-form');
            e.target.reset();
            this.loadSalesData();
        } catch (err) { this.toast('Error: ' + err.message, 'error'); }
    },

    async submitWaste(e) {
        e.preventDefault();
        const form = document.getElementById('waste-form');
        const editId = form.dataset.editId;
        const payload = {
            date: document.getElementById('w-date').value,
            item_name: document.getElementById('w-item').value,
            category: document.getElementById('w-category').value || undefined,
            quantity: parseFloat(document.getElementById('w-qty').value),
            unit: document.getElementById('w-unit').value || undefined,
            estimated_cost: parseFloat(document.getElementById('w-cost').value) || undefined,
            reason: document.getElementById('w-reason').value,
            notes: document.getElementById('w-notes').value || undefined,
        };
        try {
            if (editId) {
                await API.request('PUT', `/data/waste/${editId}`, payload);
                delete form.dataset.editId;
                form.querySelector('h3').textContent = 'Log Waste Entry';
                form.querySelector('[type=submit]').textContent = 'Log Waste';
                this.toast('Waste updated!', 'success');
            } else {
                await API.addWaste(payload);
                this.toast('Waste logged!', 'success');
            }
            this.toggleForm('waste-form');
            e.target.reset();
            this.loadWasteData();
        } catch (err) { this.toast('Error: ' + err.message, 'error'); }
    },

    async submitInventory(e) {
        e.preventDefault();
        const form = document.getElementById('inv-form');
        const editId = form.dataset.editId;
        const payload = {
            date: document.getElementById('i-date').value,
            item_name: document.getElementById('i-item').value,
            category: document.getElementById('i-category').value || undefined,
            quantity: parseFloat(document.getElementById('i-qty').value),
            unit: document.getElementById('i-unit').value || undefined,
            unit_cost: parseFloat(document.getElementById('i-cost').value) || undefined,
        };
        try {
            if (editId) {
                await API.request('PUT', `/data/inventory/${editId}`, payload);
                delete form.dataset.editId;
                form.querySelector('h3').textContent = 'Inventory Count Entry';
                form.querySelector('[type=submit]').textContent = 'Save Count';
                this.toast('Inventory updated!', 'success');
            } else {
                await API.addInventory(payload);
                this.toast('Inventory saved!', 'success');
            }
            this.toggleForm('inv-form');
            e.target.reset();
            this.loadInventoryData();
        } catch (err) { this.toast('Error: ' + err.message, 'error'); }
    },

    async submitMenuItem(e) {
        e.preventDefault();
        const form = e.target;
        const editId = form.dataset.editId;
        try {
            const payload = {
                name: document.getElementById('m-name').value,
                category: document.getElementById('m-cat').value || undefined,
                selling_price: parseFloat(document.getElementById('m-price').value),
                recipe_cost: parseFloat(document.getElementById('m-cost').value) || undefined,
            };
            if (editId) {
                await API.request('PUT', `/menu/items/${editId}`, payload);
                delete form.dataset.editId;
                this.toast('Menu item updated!', 'success');
            } else {
                await API.addMenuItem(payload);
                this.toast('Menu item added!', 'success');
            }
            this.toggleForm('menu-form');
            form.reset();
            form.querySelector('h3').textContent = 'Add Menu Item';
            form.querySelector('[type=submit]').textContent = 'Add Item';
            this.loadMenuItems();
        } catch (err) { this.toast('Error: ' + err.message, 'error'); }
    },


    // ── FAB ──
    toggleFab() {
        document.getElementById('fab-menu').classList.toggle('hidden');
    },

    quickEntry(type) {
        document.getElementById('fab-menu').classList.add('hidden');
        if (type === 'scanner') {
            this.navigate('scanner');
        } else if (type === 'purchase') {
            this.navigate('purchases');
            setTimeout(() => this.toggleForm('purchase-form'), 100);
        } else if (type === 'waste') {
            this.navigate('waste');
            setTimeout(() => this.toggleForm('waste-form'), 100);
        }
    },

    // ── INVOICE SCANNER ──
    setupScannerDropzone() {
        const dropzone = document.getElementById('scanner-drop');
        const input = document.getElementById('scanner-input');
        if (!dropzone || !input) return;

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });
        });

        ['dragleave', 'dragend', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const files = e.dataTransfer?.files;
            if (!files || !files.length) return;
            input.files = files;
            this.handleScannerUpload(input);
        });
    },

    async handleScannerUpload(input) {
        const file = input.files[0];
        if (!file) return;

        document.getElementById('scanner-drop').classList.add('hidden');
        document.getElementById('scanner-loading').classList.remove('hidden');
        document.getElementById('scanner-results').classList.add('hidden');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const result = await API.scanInvoice(formData);
            this.renderScannerResults(result);
            // Show price alerts if any were detected
            if (result.price_alerts && result.price_alerts.length > 0) {
                this.toast(`⚠️ ${result.price_alerts.length} price change${result.price_alerts.length > 1 ? 's' : ''} detected — check Price Alerts`, 'info');
                const badge = document.getElementById('alerts-badge');
                badge.textContent = result.price_alerts.length;
                badge.style.display = '';
            } else {
                this.toast('Invoice scanned! Review and approve.', 'success');
            }
        } catch (err) {
            this.toast('Scan failed: ' + err.message, 'error');
            document.getElementById('scanner-drop').classList.remove('hidden');
        } finally {
            document.getElementById('scanner-loading').classList.add('hidden');
            input.value = '';
        }
    },

    renderScannerResults(data) {
        const el = document.getElementById('scanner-results');
        el.classList.remove('hidden');

        const categories = ['protein','produce','dairy','dry_goods','beverages','frozen','bakery','other'];
        const catOptions = categories.map(c => `<option value="${c}">${c.replace('_',' ')}</option>`).join('');

        let itemsHtml = (data.items || []).map((item, i) => `
            <div class="scanner-item" id="scan-item-${i}">
                <div>
                    <label style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;display:block">Description</label>
                    <input type="text" id="scan-desc-${i}" value="${item.description || ''}" placeholder="Item description">
                </div>
                <div>
                    <label style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;display:block">Category</label>
                    <select id="scan-cat-${i}">${catOptions}</select>
                </div>
                <div>
                    <label style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;display:block">Amount ($)</label>
                    <input type="number" id="scan-amt-${i}" value="${(item.amount || 0).toFixed(2)}" step="0.01" min="0">
                </div>
                <div style="display:flex;align-items:flex-end">
                    <button onclick="document.getElementById('scan-item-${i}').remove()" style="background:none;border:none;cursor:pointer;color:var(--danger);padding:8px;font-size:18px" title="Remove">×</button>
                </div>
            </div>
        `).join('');

        // Pre-select categories
        el.innerHTML = `
            <div class="scanner-results-card">
                <h3>📄 Invoice from ${data.vendor || 'Unknown Vendor'}</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
                    <div class="field">
                        <label>Vendor</label>
                        <input type="text" id="scan-vendor" value="${data.vendor || ''}" placeholder="Vendor name">
                    </div>
                    <div class="field">
                        <label>Date</label>
                        <input type="date" id="scan-date" value="${data.date || this.todayStr()}">
                    </div>
                </div>
                <div style="margin-bottom:16px">
                    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-muted);margin-bottom:12px">Line Items</div>
                    <div id="scan-items-list">${itemsHtml}</div>
                </div>
                <div class="scanner-summary">
                    <div>
                        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Detected Total</div>
                        <div class="scanner-total">$${(data.total || 0).toFixed(2)}</div>
                    </div>
                    <div style="display:flex;gap:10px">
                        <button class="btn outline" onclick="App.resetScanner()">Scan Another</button>
                        <button class="btn primary" id="scan-approve-btn" onclick="App.approveScannedInvoice()">✓ Approve & Save All</button>
                    </div>
                </div>
            </div>
        `;

        // Set category selects
        (data.items || []).forEach((item, i) => {
            const sel = document.getElementById(`scan-cat-${i}`);
            if (sel && item.category) sel.value = item.category;
        });
    },

    async approveScannedInvoice() {
        const vendor = document.getElementById('scan-vendor')?.value || '';
        const date = document.getElementById('scan-date')?.value || this.todayStr();
        const itemEls = document.querySelectorAll('[id^="scan-item-"]');
        const btn = document.getElementById('scan-approve-btn');
        let saved = 0;
        let errors = 0;

        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Saving...';
        }

        try {
            for (let i = 0; i < itemEls.length; i++) {
                const id = itemEls[i].id.replace('scan-item-', '');
                const desc = document.getElementById(`scan-desc-${id}`)?.value || '';
                const cat = document.getElementById(`scan-cat-${id}`)?.value || 'other';
                const amt = parseFloat(document.getElementById(`scan-amt-${id}`)?.value || 0);

                if (amt <= 0) continue;

                try {
                    await API.addPurchase({ date, vendor, category: cat, amount: amt, description: desc });
                    saved++;
                } catch (err) {
                    errors++;
                }
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = '✓ Approve & Save All';
            }
        }

        if (saved > 0) {
            this.toast(`Saved ${saved} invoice item${saved > 1 ? 's' : ''}${errors ? `, ${errors} failed` : ''}.`, errors ? 'info' : 'success');
            this.resetScanner();
            this.navigate('purchases');
            this.loadPurchases();
        } else {
            this.toast(errors ? 'Nothing saved. Please review the invoice lines and try again.' : 'No items saved. Check amounts are greater than $0.', 'error');
        }
    },

    resetScanner() {
        document.getElementById('scanner-drop').classList.remove('hidden');
        document.getElementById('scanner-results').classList.add('hidden');
        document.getElementById('scanner-loading').classList.add('hidden');
    },

    // ── REPORTS ──
    async loadReport() {
        const dateInput = document.getElementById('report-date');
        if (!dateInput.value) dateInput.value = this.todayStr();
        try {
            const r = await API.getWeeklyReport(dateInput.value);
            const varianceClass = r.variance_pct > 3 ? 'bad' : r.variance_pct > 0 ? 'warn' : 'good';
            const costClass = r.food_cost_pct > r.target_food_cost_pct ? 'bad' : 'good';

            let html = '<div class="report-header">';
            html += '<h3>Weekly Profit Leak Report</h3>';
            html += '<div class="period">' + r.period_start + ' to ' + r.period_end + '</div>';
            html += '</div><div class="report-body">';
            html += '<div class="report-kpis">';
            html += '<div class="report-kpi"><div class="label">Revenue</div><div class="value">$' + r.total_revenue.toLocaleString() + '</div></div>';
            html += '<div class="report-kpi"><div class="label">Purchases</div><div class="value">$' + r.total_purchases.toLocaleString() + '</div></div>';
            html += '<div class="report-kpi"><div class="label">Food Cost</div><div class="value ' + costClass + '">' + r.food_cost_pct + '%</div></div>';
            html += '<div class="report-kpi"><div class="label">Variance</div><div class="value ' + varianceClass + '">' + (r.variance_pct > 0 ? '+' : '') + r.variance_pct + '%</div></div>';
            html += '</div>';
            html += '<div class="section-card"><h3>Waste Summary: $' + r.total_waste_cost.toFixed(2) + '</h3>';
            if (r.top_waste_items && r.top_waste_items.length) {
                r.top_waste_items.forEach(w => {
                    html += '<div class="waste-item"><span class="waste-item-name">' + w.item + '</span><span class="waste-item-cost">$' + w.cost.toFixed(2) + '</span></div>';
                });
            }
            html += '</div>';
            html += '<div class="section-card"><h3>Action Items</h3><ul class="action-list">';
            if (r.action_items && r.action_items.length) {
                r.action_items.forEach(a => html += '<li>' + a + '</li>');
            } else {
                html += '<li class="empty">No action items for this period.</li>';
            }
            html += '</ul></div>';
            html += '<div class="section-card"><h3>Trend: ' + (r.trend || 'N/A') + '</h3></div>';
            html += '</div>';

            document.getElementById('report-content').innerHTML = html;
            this.toast('Report generated!', 'success');
        } catch (err) {
            document.getElementById('report-content').innerHTML = '<p class="empty">Error loading report: ' + err.message + '</p>';
            this.toast('Report error: ' + err.message, 'error');
        }
    },
};

document.addEventListener('DOMContentLoaded', () => App.init());
