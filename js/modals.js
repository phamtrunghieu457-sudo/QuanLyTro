// ===== Modal =====
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

function closeModal() { modal.classList.remove('active'); }
document.getElementById('modal-close').onclick = closeModal;
modal.onclick = e => { if (e.target === modal) closeModal(); };

// ===== Room Modal =====
function openRoomModal(room = null, index = -1) {
    modalTitle.textContent = room ? 'Sửa phòng' : 'Thêm phòng';
    const r = room || { id: '', name: '', area: '', price: '', electricity: 0, water: 0, usage: getUsageMonthList().map(month => ({ month, electric: '', water: '' })), status: 'empty' };
    modalBody.innerHTML = `
        <div class="form-group">
            <label>Mã phòng</label>
            <input id="f-room-id" value="${r.id}" placeholder="VD: P101">
        </div>
        <div class="form-group">
            <label>Tên phòng</label>
            <input id="f-room-name" value="${r.name}" placeholder="VD: Phòng 101">
        </div>
        <div class="form-group">
            <label>Diện tích (m²)</label>
            <input id="f-room-area" type="number" value="${r.area}" placeholder="VD: 25">
        </div>
        <div class="form-group">
            <label>Giá thuê (đ)</label>
            <input id="f-room-price" type="number" value="${r.price}" placeholder="VD: 3000000">
        </div>
        <div class="form-group">
            <label>Chỉ số điện hiện tại (kWh)</label>
            <input id="f-room-electricity" type="number" value="${r.electricity ?? 0}" placeholder="VD: 120">
        </div>
        <div class="form-group">
            <label>Chỉ số nước hiện tại</label>
            <input id="f-room-water" type="number" value="${r.water ?? 0}" placeholder="VD: 70">
        </div>
        <div class="form-group">
            <label>Trạng thái</label>
            <select id="f-room-status">
                <option value="empty" ${r.status === 'empty' ? 'selected' : ''}>Trống</option>
                <option value="rented" ${r.status === 'rented' ? 'selected' : ''}>Đã thuê</option>
            </select>
        </div>
        <div class="form-actions">
            <button class="btn btn-cancel" onclick="closeModal()">Hủy</button>
            <button class="btn btn-primary" id="btn-save-room">Lưu</button>
        </div>
    `;
    modal.classList.add('active');

    document.getElementById('btn-save-room').onclick = () => {
        const data = {
            id: document.getElementById('f-room-id').value.trim(),
            name: document.getElementById('f-room-name').value.trim(),
            area: +document.getElementById('f-room-area').value,
            price: +document.getElementById('f-room-price').value,
            electricity: +document.getElementById('f-room-electricity').value || 0,
            water: +document.getElementById('f-room-water').value || 0,
            status: document.getElementById('f-room-status').value
        };
        if (!data.id || !data.name) {
            alert('Vui lòng nhập mã và tên phòng!');
            return;
        }
        if (index >= 0) rooms[index] = data;
        else rooms.push(data);
        save(); renderAll(); closeModal();
    };
}

// ===== Tenant Modal =====
function openTenantModal(tenant = null, index = -1, roomId = '') {
    modalTitle.textContent = tenant ? 'Sửa khách thuê' : 'Thêm khách thuê';
    const t = tenant || { name: '', phone: '', cccd: '', roomId, startDate: new Date().toISOString().slice(0, 10) };
    const roomOptions = rooms.map(r =>
        `<option value="${r.id}" ${t.roomId === r.id ? 'selected' : ''}>${r.name}</option>`
    ).join('');

    modalBody.innerHTML = `
        <div class="form-group">
            <label>Họ tên</label>
            <input id="f-t-name" value="${t.name}" placeholder="Nguyễn Văn A">
        </div>
        <div class="form-group">
            <label>Số điện thoại</label>
            <input id="f-t-phone" value="${t.phone}" placeholder="09xxxxxxxx">
        </div>
        <div class="form-group">
            <label>CCCD</label>
            <input id="f-t-cccd" value="${t.cccd || ''}" placeholder="012345678901">
        </div>
        <div class="form-group">
            <label>Phòng</label>
            <select id="f-t-room">
                <option value="">-- Chọn phòng --</option>
                ${roomOptions}
            </select>
        </div>
        <div class="form-group">
            <label>Ngày vào</label>
            <input id="f-t-date" type="date" value="${t.startDate}">
        </div>
        <div class="form-actions">
            <button class="btn btn-cancel" onclick="closeModal()">Hủy</button>
            <button class="btn btn-primary" id="btn-save-tenant">Lưu</button>
        </div>
    `;
    modal.classList.add('active');

    document.getElementById('btn-save-tenant').onclick = () => {
        const data = {
            name: document.getElementById('f-t-name').value.trim(),
            phone: document.getElementById('f-t-phone').value.trim(),
            cccd: document.getElementById('f-t-cccd').value.trim(),
            roomId: document.getElementById('f-t-room').value,
            startDate: document.getElementById('f-t-date').value
        };
        if (!data.name || !data.phone) {
            alert('Vui lòng nhập tên và số điện thoại!');
            return;
        }
        if (index >= 0) tenants[index] = data;
        else tenants.push(data);
        // Cập nhật trạng thái phòng
        if (data.roomId) {
            const room = rooms.find(r => r.id === data.roomId);
            if (room) room.status = 'rented';
        }
        save(); renderAll(); closeModal();
    };
}

// ===== Invoice Modal =====
function openInvoiceModal() {
    modalTitle.textContent = 'Tạo hóa đơn';
    const now = new Date();
    const defaultMonth = `${now.getMonth() + 1}/${now.getFullYear()}`;
    const roomOptions = rooms.map(r =>
        `<option value="${r.id}">${r.name} - ${fmtMoney(r.price)}</option>`
    ).join('');

    modalBody.innerHTML = `
        <div class="form-group">
            <label>Mã hóa đơn</label>
            <input id="f-i-id" value="${genId('HD')}">
        </div>
        <div class="form-group">
            <label>Phòng</label>
            <select id="f-i-room">
                <option value="">-- Chọn phòng --</option>
                ${roomOptions}
            </select>
        </div>
        <div class="form-group">
            <label>Tháng (MM/YYYY)</label>
            <input id="f-i-month" value="${defaultMonth}" placeholder="10/2024">
        </div>
        <div class="form-group">
            <label>Chỉ số điện hiện tại (kWh)</label>
            <input id="f-i-electric-index" type="number" value="0">
        </div>
        <div class="form-group">
            <label>Chỉ số nước hiện tại</label>
            <input id="f-i-water-index" type="number" value="0">
        </div>
        <div class="form-group">
            <label>Tiền phòng (đ)</label>
            <input id="f-i-roomfee" type="number" value="0">
        </div>
        <div class="form-group">
            <label>Tiền điện (đ)</label>
            <input id="f-i-electric" type="number" value="0">
        </div>
        <div class="form-group">
            <label>Tiền nước (đ)</label>
            <input id="f-i-water" type="number" value="0">
        </div>
        <div class="form-group">
            <label>Trạng thái</label>
            <select id="f-i-status">
                <option value="unpaid">Chưa thanh toán</option>
                <option value="paid">Đã thanh toán</option>
            </select>
        </div>
        <div class="form-actions">
            <button class="btn btn-cancel" onclick="closeModal()">Hủy</button>
            <button class="btn btn-primary" id="btn-save-invoice">Lưu</button>
        </div>
    `;

    // Auto fill dữ liệu khi chọn phòng
    document.getElementById('f-i-room').onchange = e => {
        const r = rooms.find(x => x.id === e.target.value);
        if (r) {
            document.getElementById('f-i-roomfee').value = r.price;
            document.getElementById('f-i-electric-index').value = r.electricity ?? 0;
            document.getElementById('f-i-water-index').value = r.water ?? 0;
        }
    };

    modal.classList.add('active');

    document.getElementById('btn-save-invoice').onclick = () => {
        const roomFee = +document.getElementById('f-i-roomfee').value || 0;
        const electric = +document.getElementById('f-i-electric').value || 0;
        const water = +document.getElementById('f-i-water').value || 0;
        const electricIndex = +document.getElementById('f-i-electric-index').value || 0;
        const waterIndex = +document.getElementById('f-i-water-index').value || 0;
        const data = {
            id: document.getElementById('f-i-id').value.trim(),
            roomId: document.getElementById('f-i-room').value,
            month: document.getElementById('f-i-month').value.trim(),
            roomFee, electric, water,
            electricIndex,
            waterIndex,
            total: roomFee + electric + water,
            status: document.getElementById('f-i-status').value
        };
        if (!data.roomId || !data.month) {
            alert('Vui lòng chọn phòng và nhập tháng!');
            return;
        }
        const room = rooms.find(r => r.id === data.roomId);
        if (room) {
            room.electricity = electricIndex;
            room.water = waterIndex;
        }
        invoices.push(data);
        save(); renderAll(); closeModal();
    };
}
