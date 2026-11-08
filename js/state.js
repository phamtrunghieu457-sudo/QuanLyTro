// ===== Shared state =====
const readLocal = key => {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
};

let rooms = readLocal('rooms');
let tenants = readLocal('tenants');
let invoices = readLocal('invoices');
let selectedRoomId = null;
let currentUser = null;
let persistedIds = { rooms: new Set(), tenants: new Set(), invoices: new Set() };
let saveQueue = Promise.resolve();

function save() {
    localStorage.setItem('rooms', JSON.stringify(rooms));
    localStorage.setItem('tenants', JSON.stringify(tenants));
    localStorage.setItem('invoices', JSON.stringify(invoices));
    if (!currentUser) return saveQueue;

    saveQueue = saveQueue.then(() => syncTable('rooms', rooms))
        .then(() => syncTable('tenants', tenants))
        .then(() => syncTable('invoices', invoices))
        .catch(error => {
            console.error('Không thể đồng bộ Supabase:', error);
            setSyncStatus(`Lỗi đồng bộ: ${error.message}`);
        });
    return saveQueue;
}

async function syncTable(table, items) {
    const rows = items.map(item => ({ id: String(item.id), data: item }));
    if (rows.length) {
        const { error } = await supabaseClient.from(table).upsert(rows, { onConflict: 'id' });
        if (error) throw error;
    }

    const currentIds = new Set(rows.map(row => row.id));
    const removedIds = [...persistedIds[table]].filter(id => !currentIds.has(id));
    if (removedIds.length) {
        const { error } = await supabaseClient.from(table).delete()
            .eq('user_id', currentUser.id).in('id', removedIds);
        if (error) throw error;
    }
    persistedIds[table] = currentIds;
}

async function loadFromDatabase() {
    const tables = ['rooms', 'tenants', 'invoices'];
    const loaded = {};
    for (const table of tables) {
        const { data, error } = await supabaseClient.from(table).select('id,data');
        if (error) throw error;
        loaded[table] = (data || []).map(row => ({ ...row.data, id: row.data?.id || String(row.id) }));
        persistedIds[table] = new Set((data || []).map(row => String(row.id)));
    }

    const hasRemoteData = tables.some(table => loaded[table].length > 0);
    const local = {
        rooms: readLocal('rooms'),
        tenants: readLocal('tenants'),
        invoices: readLocal('invoices')
    };
    const hasLocalData = tables.some(table => local[table].length > 0);

    if (!hasRemoteData && hasLocalData && confirm('Database chưa có dữ liệu. Bạn muốn chuyển dữ liệu đang lưu trên trình duyệt lên Supabase không?')) {
        rooms = local.rooms;
        tenants = local.tenants.map(tenant => ({ ...tenant, id: tenant.id || genId('KT') }));
        invoices = local.invoices;
        await save();
    } else {
        rooms = loaded.rooms;
        tenants = loaded.tenants;
        invoices = loaded.invoices;
        localStorage.setItem('rooms', JSON.stringify(rooms));
        localStorage.setItem('tenants', JSON.stringify(tenants));
        localStorage.setItem('invoices', JSON.stringify(invoices));
    }
}

function setSyncStatus(message) {
    const el = document.getElementById('sync-status');
    if (el) el.textContent = message;
}

// ===== Utils =====
const fmtMoney = n => Number(n || 0).toLocaleString('vi-VN') + ' đ';
const fmtDate = d => d ? new Date(d).toLocaleDateString('vi-VN') : '';
const genId = prefix => prefix + Date.now().toString().slice(-6) + Math.random().toString(36).slice(2, 5);

function currentLocalDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function monthIndex(month) {
    const match = /^(\d{1,2})\/(\d{4})$/.exec(month || '');
    return match ? Number(match[2]) * 12 + Number(match[1]) - 1 : null;
}

function monthLabel(index) {
    return `${index % 12 + 1}/${Math.floor(index / 12)}`;
}

function monthIndexFromDate(date) {
    const parsed = date ? new Date(`${date}T00:00:00`) : new Date();
    if (Number.isNaN(parsed.getTime())) return new Date().getFullYear() * 12 + new Date().getMonth();
    return parsed.getFullYear() * 12 + parsed.getMonth();
}

function getUsageMonthList(room) {
    const existing = Array.isArray(room.usage) ? room.usage : [];
    const validMonths = existing.map(item => monthIndex(item.month)).filter(index => index !== null);
    if (!room.createdAt) {
        const earliest = validMonths.length ? Math.min(...validMonths) : monthIndexFromDate(currentLocalDate());
        const year = Math.floor(earliest / 12);
        const month = earliest % 12 + 1;
        room.createdAt = `${year}-${String(month).padStart(2, '0')}-01`;
    }

    const start = monthIndexFromDate(room.createdAt);
    const byMonth = new Map(existing
        .filter(item => monthIndex(item.month) !== null && monthIndex(item.month) >= start)
        .map(item => [item.month, item]));
    const meaningful = [...byMonth.entries()]
        .filter(([, item]) => (item.electric !== '' && item.electric != null) || (item.water !== '' && item.water != null) || (item.debt !== '' && item.debt != null))
        .map(([month]) => monthIndex(month));
    const manuallyAdded = [...byMonth.entries()]
        .filter(([, item]) => item.addedByUser)
        .map(([month]) => monthIndex(month));
    const end = Math.max(start, ...meaningful, ...manuallyAdded);
    const months = [];
    for (let index = start; index <= end; index++) {
        months.push(byMonth.get(monthLabel(index)) || { month: monthLabel(index), electric: '', water: '' });
    }
    return months;
}

function normalizeRoom(room) {
    room.usage = getUsageMonthList(room).map(item => ({
        month: item.month,
        electric: item.electric ?? '',
        water: item.water ?? '',
        debt: item.debt,
        addedByUser: item.addedByUser || undefined
    }));
    return room;
}
