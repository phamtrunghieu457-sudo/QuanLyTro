// ===== Navigation =====
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const page = btn.dataset.page;
        document.getElementById('page-' + page).classList.add('active');
        document.getElementById('page-title').textContent = btn.textContent.trim();
    });
});

// ===== Hiển thị ngày =====
document.getElementById('current-date').textContent =
    new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
