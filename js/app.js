// ===== Buttons =====
document.getElementById('btn-add-room').onclick = () => openRoomModal();
document.getElementById('btn-add-invoice').onclick = openInvoiceModal;

// ===== Render All =====
function renderAll() {
    rooms = rooms.map(room => normalizeRoom(room));
    renderDashboard();
    renderRooms();
    renderTenants();
    renderInvoices();
    renderUsageBoard();
}

renderAll();
