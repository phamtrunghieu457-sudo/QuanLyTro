// ===== Room usage board =====
function renderUsageBoard() {
    const container = document.getElementById('room-usage-grid');
    if (!container) return;

    const selectedRoom = rooms.find(room => room.id === selectedRoomId);
    if (!selectedRoom) {
        container.innerHTML = '<p class="usage-empty">Chưa chọn phòng</p>';
        return;
    }

    const room = normalizeRoom(selectedRoom);
    const rows = room.usage.map(item => {
        const month = item.month;
        const debt = invoices
            .filter(invoice => invoice.roomId === room.id && invoice.month === month && invoice.status !== 'paid')
            .reduce((sum, invoice) => sum + Number(invoice.total ?? (Number(invoice.roomFee || 0) + Number(invoice.electric || 0) + Number(invoice.water || 0))), 0);
        return `
            <tr>
                <td>${month}</td>
                <td><input type="number" min="0" value="${item.electric ?? ''}" data-room-id="${room.id}" data-month="${month}" data-field="electric"></td>
                <td><input type="number" min="0" value="${item.water ?? ''}" data-room-id="${room.id}" data-month="${month}" data-field="water"></td>
                <td><input type="number" min="0" value="${item.debt ?? debt}" data-room-id="${room.id}" data-month="${month}" data-field="debt"></td>
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
                            <th>Còn nợ</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <button class="btn btn-sm btn-primary usage-add-month" type="button" onclick="addUsageMonth('${room.id}')">+ Thêm tháng</button>
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

window.addUsageMonth = roomId => {
    const room = rooms.find(item => item.id === roomId);
    if (!room) return;
    normalizeRoom(room);
    const lastIndex = room.usage.length
        ? monthIndex(room.usage[room.usage.length - 1].month)
        : monthIndexFromDate(room.createdAt);
    const nextMonth = monthLabel(lastIndex + 1);
    room.usage.push({ month: nextMonth, electric: '', water: '', addedByUser: true });
    save();
    renderUsageBoard();
};

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
        tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Chưa có phòng nào. Nhấn "Thêm phòng" để bắt đầu.</td></tr>';
        return;
    }
    tbody.innerHTML = rooms.map((r, i) => `
        <tr class="${r.id === selectedRoomId ? 'room-selected' : ''}">
            <td>${r.id}</td>
            <td><b>${r.name}</b></td>
            <td>${fmtMoney(r.price)}</td>
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
let selectedTenantRoomId = null;

function renderTenants() {
    const roomList = document.getElementById('tenant-room-list');
    const addButton = document.getElementById('btn-add-tenant');
    if (rooms.length === 0) {
        roomList.innerHTML = '<p class="room-picker-empty">Chưa có phòng. Hãy thêm phòng trước khi nhập khách thuê.</p>';
    } else {
        if (!rooms.some(room => room.id === selectedTenantRoomId)) selectedTenantRoomId = null;
        roomList.innerHTML = rooms.map((room, i) => {
            const activeCount = tenants.filter(tenant => tenant.roomId === room.id && tenant.status !== 'departed').length;
            const tenantLabel = activeCount === 0 ? 'Chưa có khách đang thuê' : `${activeCount} khách đang thuê`;
            return `
                <button class="room-picker-item ${room.id === selectedTenantRoomId ? 'room-selected' : ''}" type="button" onclick="selectTenantRoom(${i})">
                    <span class="room-picker-number">${room.id}</span>
                    ${room.name && room.name !== room.id ? `<span class="room-picker-id">${room.name}</span>` : ''}
                    <span class="room-picker-status ${activeCount ? 'occupied' : ''}">${tenantLabel}</span>
                </button>
            `;
        }).join('');
    }

    if (addButton) {
        addButton.disabled = !selectedTenantRoomId;
        addButton.onclick = () => {
            if (selectedTenantRoomId) openTenantModal(null, -1, selectedTenantRoomId);
        };
    }

    const activeBody = document.getElementById('active-tenants-table');
    const departedBody = document.getElementById('departed-tenants-table');
    if (!selectedTenantRoomId) {
        const message = rooms.length ? 'Chọn phòng để xem danh sách khách thuê.' : 'Chưa có khách thuê nào.';
        activeBody.innerHTML = `<tr class="empty-row"><td colspan="6">${message}</td></tr>`;
        departedBody.innerHTML = `<tr class="empty-row"><td colspan="6">${message}</td></tr>`;
        return;
    }

    const room = rooms.find(item => item.id === selectedTenantRoomId);
    const roomName = room ? room.name : 'N/A';
    const activeTenants = tenants.map((tenant, index) => ({ tenant, index }))
        .filter(({ tenant }) => tenant.roomId === selectedTenantRoomId && tenant.status !== 'departed');
    const departedTenants = tenants.map((tenant, index) => ({ tenant, index }))
        .filter(({ tenant }) => tenant.roomId === selectedTenantRoomId && tenant.status === 'departed')
        .sort((a, b) => (b.tenant.departedAt || '').localeCompare(a.tenant.departedAt || '') || (b.tenant.departureOrder || 0) - (a.tenant.departureOrder || 0));

    activeBody.innerHTML = activeTenants.length ? activeTenants.map(({ tenant, index }) => `
        <tr>
            <td><b>${tenant.name}</b></td>
            <td>${tenant.phone}</td>
            <td>${tenant.cccd || '-'}</td>
            <td>${roomName}</td>
            <td>${fmtDate(tenant.startDate)}</td>
            <td>
                <button class="btn btn-sm btn-edit" onclick="editTenant(${index})">Sửa</button>
                <button class="btn btn-sm btn-delete" onclick="deleteTenant(${index})">Chuyển đi</button>
            </td>
        </tr>
    `).join('') : '<tr class="empty-row"><td colspan="6">Chưa có khách đang thuê ở phòng này.</td></tr>';

    departedBody.innerHTML = departedTenants.length ? departedTenants.map(({ tenant }) => `
        <tr>
            <td><b>${tenant.name}</b></td>
            <td>${tenant.phone}</td>
            <td>${tenant.cccd || '-'}</td>
            <td>${roomName}</td>
            <td>${fmtDate(tenant.startDate)}</td>
            <td>${fmtDate(tenant.departedAt)}</td>
        </tr>
    `).join('') : '<tr class="empty-row"><td colspan="6">Chưa có khách đã đi ở phòng này.</td></tr>';
}

window.selectTenantRoom = i => {
    const room = rooms[i];
    if (!room) return;
    selectedTenantRoomId = room.id;
    renderTenants();
};

window.editTenant = i => {
    const tenant = tenants[i];
    if (tenant && tenant.status !== 'departed') openTenantModal(tenant, i);
};
window.deleteTenant = i => {
    const tenant = tenants[i];
    if (!tenant || tenant.status === 'departed') return;
    if (confirm(`Chuyển khách ${tenant.name} sang danh sách khách đã đi?`)) {
        tenants[i] = { ...tenant, status: 'departed', departedAt: currentLocalDate(), departureOrder: Date.now() };
        const stillActive = tenants.some(item => item.roomId === tenant.roomId && item.status !== 'departed');
        if (!stillActive) {
            const room = rooms.find(item => item.id === tenant.roomId);
            if (room) room.status = 'empty';
        }
        save(); renderAll();
    }
};

// ===== Invoices =====
let selectedInvoiceRoomId = null;

function renderInvoices() {
    const roomList = document.getElementById('invoice-room-list');
    const addButton = document.getElementById('btn-add-invoice');
    const tbody = document.getElementById('invoices-table');

    if (rooms.length === 0) {
        selectedInvoiceRoomId = null;
        roomList.innerHTML = '<p class="room-picker-empty">Chưa có phòng. Hãy thêm phòng trước khi tạo hóa đơn.</p>';
    } else {
        const hasUnassigned = invoices.some(invoice => !rooms.some(room => room.id === invoice.roomId));
        if (selectedInvoiceRoomId !== '__unassigned__' && !rooms.some(room => room.id === selectedInvoiceRoomId)) selectedInvoiceRoomId = null;
        if (selectedInvoiceRoomId === '__unassigned__' && !hasUnassigned) selectedInvoiceRoomId = null;
        roomList.innerHTML = rooms.map((room, i) => {
            const count = invoices.filter(invoice => invoice.roomId === room.id).length;
            return `
                <button class="room-picker-item ${room.id === selectedInvoiceRoomId ? 'room-selected' : ''}" type="button" onclick="selectInvoiceRoom(${i})">
                    <span class="room-picker-number">${room.id}</span>
                    ${room.name && room.name !== room.id ? `<span class="room-picker-id">${room.name}</span>` : ''}
                    <span class="room-picker-status">${count} hóa đơn</span>
                </button>
            `;
        }).join('') + (hasUnassigned ? `
            <button class="room-picker-item ${selectedInvoiceRoomId === '__unassigned__' ? 'room-selected' : ''}" type="button" onclick="selectUnassignedInvoices()">
                <span class="room-picker-number">Phòng không xác định</span>
                <span class="room-picker-status">${invoices.filter(invoice => !rooms.some(room => room.id === invoice.roomId)).length} hóa đơn</span>
            </button>` : '');
    }

    if (addButton) {
        addButton.disabled = !selectedInvoiceRoomId || selectedInvoiceRoomId === '__unassigned__';
        addButton.onclick = () => {
            if (selectedInvoiceRoomId && selectedInvoiceRoomId !== '__unassigned__') openInvoiceModal(selectedInvoiceRoomId);
        };
    }

    if (!selectedInvoiceRoomId) {
        const message = rooms.length ? 'Chọn phòng để xem hóa đơn.' : 'Chưa có phòng để hiển thị hóa đơn.';
        tbody.innerHTML = `<tr class="empty-row"><td colspan="9">${message}</td></tr>`;
        return;
    }

    const visibleInvoices = invoices.map((invoice, index) => ({ invoice, index }))
        .filter(({ invoice }) => selectedInvoiceRoomId === '__unassigned__'
            ? !rooms.some(room => room.id === invoice.roomId)
            : invoice.roomId === selectedInvoiceRoomId);
    if (visibleInvoices.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="9">Phòng này chưa có hóa đơn.</td></tr>';
        return;
    }

    tbody.innerHTML = visibleInvoices.map(({ invoice: inv, index: i }) => {
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

window.selectInvoiceRoom = i => {
    const room = rooms[i];
    if (!room) return;
    selectedInvoiceRoomId = room.id;
    renderInvoices();
};

window.selectUnassignedInvoices = () => {
    selectedInvoiceRoomId = '__unassigned__';
    renderInvoices();
};

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

