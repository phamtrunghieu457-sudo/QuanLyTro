// ===== Authentication and app startup =====
const authPanel = document.createElement('section');
authPanel.id = 'auth-panel';
authPanel.className = 'auth-panel';
authPanel.innerHTML = `
    <form id="auth-form" class="auth-card">
        <h1>Quản Lý Phòng Trọ</h1>
        <p>Đăng nhập để đồng bộ dữ liệu với database.</p>
        <label for="auth-email">Email</label>
        <input id="auth-email" type="email" autocomplete="email" required>
        <label for="auth-password">Mật khẩu</label>
        <input id="auth-password" type="password" autocomplete="current-password" minlength="6" required>
        <div class="auth-actions">
            <button class="btn btn-primary" type="submit">Đăng nhập</button>
            <button class="btn" id="auth-signup" type="button">Tạo tài khoản</button>
        </div>
        <p id="auth-message" role="status"></p>
    </form>`;
document.body.prepend(authPanel);

const appRoot = document.querySelector('.app');
appRoot.hidden = true;
const sessionBar = document.createElement('div');
sessionBar.id = 'session-bar';
sessionBar.className = 'session-bar';
sessionBar.innerHTML = '<span id="session-email"></span><span id="sync-status">Đã kết nối database</span><button id="auth-signout" class="btn btn-sm">Đăng xuất</button>';
appRoot.prepend(sessionBar);

function setAuthMessage(message) {
    document.getElementById('auth-message').textContent = message;
}

async function startApp(session) {
    currentUser = session.user;
    try {
        await loadFromDatabase();
        rooms = rooms.map(room => normalizeRoom(room));
        renderAll();
        document.getElementById('session-email').textContent = currentUser.email || 'Đã đăng nhập';
        setSyncStatus('Đã kết nối database');
        authPanel.hidden = true;
        appRoot.hidden = false;
    } catch (error) {
        console.error(error);
        currentUser = null;
        appRoot.hidden = true;
        authPanel.hidden = false;
        setAuthMessage(`Không tải được dữ liệu: ${error.message}. Kiểm tra Data API, quyền bảng và policy RLS.`);
    }
}

document.getElementById('auth-form').addEventListener('submit', async event => {
    event.preventDefault();
    setAuthMessage('Đang đăng nhập...');
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return setAuthMessage(error.message);
    await startApp(data.session);
});

document.getElementById('auth-signup').addEventListener('click', async () => {
    setAuthMessage('Đang tạo tài khoản...');
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    if (!email || password.length < 6) return setAuthMessage('Nhập email hợp lệ và mật khẩu ít nhất 6 ký tự.');
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) return setAuthMessage(error.message);
    if (data.session) await startApp(data.session);
    else setAuthMessage('Đã tạo tài khoản. Kiểm tra email để xác nhận, sau đó đăng nhập.');
});

document.getElementById('auth-signout').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    currentUser = null;
    appRoot.hidden = true;
    authPanel.hidden = false;
    setAuthMessage('Bạn đã đăng xuất.');
});

supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) setAuthMessage(error.message);
    else if (data.session) startApp(data.session);
});

supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        currentUser = null;
        appRoot.hidden = true;
        authPanel.hidden = false;
    }
});

// ===== Buttons =====
document.getElementById('btn-add-room').onclick = () => openRoomModal();
document.getElementById('btn-add-invoice').onclick = () => {
    if (selectedInvoiceRoomId) openInvoiceModal(selectedInvoiceRoomId);
};

// ===== Render All =====
function renderAll() {
    rooms = rooms.map(room => normalizeRoom(room));
    renderDashboard();
    renderRooms();
    renderTenants();
    renderInvoices();
    renderUsageBoard();
}
