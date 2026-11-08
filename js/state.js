// ===== State =====
let rooms = JSON.parse(localStorage.getItem('rooms')) || [];
let tenants = JSON.parse(localStorage.getItem('tenants')) || [];
let invoices = JSON.parse(localStorage.getItem('invoices')) || [];
let selectedRoomId = null;

// ===== Save =====
function save() {
    localStorage.setItem('rooms', JSON.stringify(rooms));
    localStorage.setItem('tenants', JSON.stringify(tenants));
    localStorage.setItem('invoices', JSON.stringify(invoices));
}

// ===== Utils =====
const fmtMoney = n => Number(n || 0).toLocaleString('vi-VN') + ' đ';
const fmtDate = d => d ? new Date(d).toLocaleDateString('vi-VN') : '';
const genId = prefix => prefix + Date.now().toString().slice(-6);

function getUsageMonthList() {
    const months = [];
    const start = new Date(2026, 6, 1);
    const end = new Date(2028, 0, 1);
    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
        months.push(`${d.getMonth() + 1}/${d.getFullYear()}`);
    }
    return months;
}

function normalizeRoom(room) {
    if (!room.usage) room.usage = [];
    const months = getUsageMonthList();
    const map = new Map((room.usage || []).map(item => [item.month, item]));
    months.forEach(month => {
        if (!map.has(month)) {
            map.set(month, { month, electric: '', water: '' });
        }
    });
    room.usage = Array.from(map.entries()).map(([month, item]) => ({
        month,
        electric: item.electric ?? '',
        water: item.water ?? ''
    }));
    return room;
}
