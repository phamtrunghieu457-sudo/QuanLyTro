// ===== Room usage board =====
function renderUsageBoard() {
    const container = document.getElementById('room-usage-grid');
    if (!container) return;

    const selectedRoom = rooms.find(room => room.id === selectedRoomId);
    if (!selectedRoom) {
        container.innerHTML = '<p class="usage-empty">Chưa chọn phòng</p>';
        return;
    }

    const months = getUsageMonthList();
    const room = normalizeRoom(selectedRoom);
    const rows = months.map(month => {
        const item = room.usage.find(x => x.month === month) || { month, electric: '', water: '' };
        return `
            <tr>
                <td>${month}</td>
                <td><input type="number" min="0" value="${item.electric ?? ''}" data-room-id="${room.id}" data-month="${month}" data-field="electric"></td>
                <td><input type="number" min="0" value="${item.water ?? ''}" data-room-id="${room.id}" data-month="${month}" data-field="water"></td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div class="usage-room">
            <div class="usage-room-header">${room.name || room.id}</div>
            <div class="usage-room-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Tháng</th>
                            <th>Số điện</th>
                            <th>Nước</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;

    container.querySelectorAll('input[data-room-id]').forEach(input => {
        input.addEventListener('input', e => {
            const room = rooms.find(r => r.id === e.target.dataset.roomId);
            if (!room) return;
            normalizeRoom(room);
            const item = room.usage.find(x => x.month === e.target.dataset.month);
            if (!item) return;
            item[e.target.dataset.field] = e.target.value;
            save();
        });
    });
}

// ===== Dashboard =====
function renderDashboard() {
    const total = rooms.length;
    const rented = rooms.filter(r => r.status === 'rented').length;
    const empty = total - rented;

    // doanh thu tháng hiện tại
    const now = new Date();
    const month = `${now.getMonth() + 1}/${now.getFullYear()}`;
    const revenue = invoices
        .filter(i => i.month === month && i.status === 'paid')
        .reduce((s, i) => s + i.total, 0);

    document.getElementById('stat-total-rooms').textContent = total;
    document.getElementById('stat-rented-rooms').textContent = rented;
    document.getElementById('stat-empty-rooms').textContent = empty;
    document.getElementById('stat-revenue').textContent = fmtMoney(revenue);

    const emptyRooms = rooms.filter(r => r.status === 'empty').slice(0, 5);
    const tbody = document.getElementById('dashboard-rooms');
    if (emptyRooms.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="4">Không có phòng trống</td></tr>';
    } else {
        tbody.innerHTML = emptyRooms.map(r => `
            <tr>
                <td><b>${r.name}</b></td>
                <td>${r.area} m²</td>
                <td>${fmtMoney(r.price)}</td>
                <td><span class="badge badge-empty">Trống</span></td>
            </tr>
        `).join('');
    }
}

// ===== Rooms =====
function renderRooms() {
    const tbody = document.getElementById('rooms-table');
    if (rooms.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="8">Chưa có phòng nào. Nhấn "Thêm phòng" để bắt đầu.</td></tr>';
        return;
    }
    tbody.innerHTML = rooms.map((r, i) => `
        <tr class="${r.id === selectedRoomId ? 'room-selected' : ''}">
            <td>${r.id}</td>
            <td><b>${r.name}</b></td>
            <td>${r.area}</td>
            <td>${fmtMoney(r.price)}</td>
            <td>${r.electricity ?? 0}</td>
            <td>${r.water ?? 0}</td>
            <td>
                <span class="badge ${r.status === 'rented' ? 'badge-rented' : 'badge-empty'}">
                    ${r.status === 'rented' ? 'Đã thuê' : 'Trống'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-select-room" onclick="selectRoom(${i})">${r.id === selectedRoomId ? 'Đang chọn' : 'Chọn'}</button>
                <button class="btn btn-sm btn-edit" onclick="editRoom(${i})">Sửa</button>
                <button class="btn btn-sm btn-delete" onclick="deleteRoom(${i})">Xóa</button>
            </td>
        </tr>
    `).join('');
}

window.selectRoom = i => {
    const room = rooms[i];
    if (!room) return;
    selectedRoomId = room.id;
    renderRooms();
    renderUsageBoard();
};

window.editRoom = i => openRoomModal(rooms[i], i);
window.deleteRoom = i => {
    if (confirm('Bạn có chắc muốn xóa phòng này?')) {
        if (rooms[i]?.id === selectedRoomId) selectedRoomId = null;
        rooms.splice(i, 1);
        save(); renderAll();
    }
};

// ===== Tenants =====
function renderTenants() {
    const roomList = document.getElementById('tenant-room-list');
    if (rooms.length === 0) {
        roomList.innerHTML = '<p class="room-picker-empty">Chưa có phòng. Hãy thêm phòng trước khi nhập khách thuê.</p>';
    } else {
        roomList.innerHTML = rooms.map((room, i) => {
            const roomTenants = tenants.filter(tenant => tenant.roomId === room.id);
            const tenantLabel = roomTenants.length === 0
                ? 'Chưa có khách thuê'
                : `${roomTenants.length} khách thuê`;
            return `
                <button class="room-picker-item" type="button" onclick="selectTenantRoom(${i})">
                    <span class="room-picker-number">${room.id}</span>
                    ${room.name && room.name !== room.id ? `<span class="room-picker-id">${room.name}</span>` : ''}
                    <span class="room-picker-status ${roomTenants.length ? 'occupied' : ''}">${tenantLabel}</span>
                </button>
            `;
        }).join('');
    }

    const tbody = document.getElementById('tenants-table');
    if (tenants.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Chưa có khách thuê nào.</td></tr>';
        return;
    }
    tbody.innerHTML = tenants.map((t, i) => {
        const room = rooms.find(r => r.id === t.roomId);
        return `
        <tr>
            <td><b>${t.name}</b></td>
            <td>${t.phone}</td>
            <td>${t.cccd || '-'}</td>
            <td>${room ? room.name : 'N/A'}</td>
            <td>${fmtDate(t.startDate)}</td>
            <td>
                <button class="btn btn-sm btn-edit" onclick="editTenant(${i})">Sửa</button>
                <button class="btn btn-sm btn-delete" onclick="deleteTenant(${i})">Xóa</button>
            </td>
        </tr>
        `;
    }).join('');
}

window.selectTenantRoom = i => {
    const room = rooms[i];
    if (room) openTenantModal(null, -1, room.id);
};

window.editTenant = i => openTenantModal(tenants[i], i);
window.deleteTenant = i => {
    if (confirm('Xóa khách thuê này?')) {
        tenants.splice(i, 1);
        save(); renderAll();
    }
};

// ===== Invoices =====
function renderInvoices() {
    const tbody = document.getElementById('invoices-table');
    if (invoices.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="9">Chưa có hóa đơn nào.</td></tr>';
        return;
    }
    tbody.innerHTML = invoices.map((inv, i) => {
        const room = rooms.find(r => r.id === inv.roomId);
        return `
        <tr>
            <td>${inv.id}</td>
            <td>${room ? room.name : 'N/A'}</td>
            <td>${inv.month}</td>
            <td>${fmtMoney(inv.roomFee)}</td>
            <td>${fmtMoney(inv.electric)}</td>
            <td>${fmtMoney(inv.water)}</td>
            <td><b>${fmtMoney(inv.total)}</b></td>
            <td>
                <span class="badge ${inv.status === 'paid' ? 'badge-paid' : 'badge-unpaid'}">
                    ${inv.status === 'paid' ? 'Đã TT' : 'Chưa TT'}
                </span>
            </td>
            <td>
                ${inv.status !== 'paid' ? `<button class="btn btn-sm btn-success" onclick="payInvoice(${i})">Thu tiền</button>` : ''}
                <button class="btn btn-sm btn-delete" onclick="deleteInvoice(${i})">Xóa</button>
            </td>
        </tr>
        `;
    }).join('');
}

window.payInvoice = i => {
    invoices[i].status = 'paid';
    save(); renderAll();
};

window.deleteInvoice = i => {
    if (confirm('Xóa hóa đơn này?')) {
        invoices.splice(i, 1);
        save(); renderAll();
    }
};
