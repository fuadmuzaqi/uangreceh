/**
 * Uang Receh - Script Utama
 * Fitur: Auth, Auto-Logout, CRUD Turso, Per-Month Chart
 */

let transactions = [];
let currentType = 'Pemasukan';
let myChart = null;
let isEditing = false;

document.addEventListener('DOMContentLoaded', () => {
    const savedKey = sessionStorage.getItem('vault_key');
    if (savedKey) {
        checkSession(); // Cek timeout 1 jam
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-content').classList.remove('hidden');
        fetchData();
        
        // Cek berkala setiap menit
        setInterval(checkSession, 60000);
    }
});

// --- SISTEM LOGIN & SESI ---

async function checkAuth() {
    const code = document.getElementById('access-code').value;
    if (!code) return;

    const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
    });

    if (res.ok) {
        sessionStorage.setItem('vault_key', code);
        sessionStorage.setItem('login_time', Date.now());
        location.reload();
    } else {
        alert("Kode akses salah!");
    }
}

function checkSession() {
    const loginTime = sessionStorage.getItem('login_time');
    if (loginTime) {
        const diff = Date.now() - parseInt(loginTime);
        const oneHour = 3600000; // 1 jam dalam ms
        if (diff > oneHour) {
            alert("Sesi berakhir (1 jam). Silakan login kembali.");
            logout();
        }
    }
}

function logout() {
    sessionStorage.clear();
    location.reload();
}

// --- DATA FETCHING ---

async function fetchData() {
    const code = sessionStorage.getItem('vault_key');
    try {
        const res = await fetch('/api/transactions', { 
            headers: { 'x-access-code': code } 
        });
        if (res.status === 401) return logout();
        
        transactions = await res.json();
        updateUI();
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

// --- UI RENDERING ---

function formatFullDate(isoString) {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    // Format: 31-12-2013 (21:45)
    return `${day}-${month}-${year} (${hours}:${mins})`;
}

function updateUI() {
    const list = document.getElementById('transaction-list');
    const filter = document.getElementById('month-filter');
    let totalInc = 0;
    let totalExp = 0;

    // Ambil daftar bulan unik untuk filter
    const months = [...new Set(transactions.map(t => t.month))];
    const currentMonthLabel = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    
    // Tentukan filter default (bulan sekarang atau bulan terakhir tersedia)
    const currentFilter = filter.value || (months.includes(currentMonthLabel) ? currentMonthLabel : (months[0] || "Semua Waktu"));

    // Render Dropdown Filter
    filter.innerHTML = `<option value="Semua Waktu">Semua Waktu</option>`;
    months.forEach(m => {
        filter.innerHTML += `<option value="${m}" ${currentFilter === m ? 'selected' : ''}>${m}</option>`;
    });

    // Filter Data
    const displayData = currentFilter === "Semua Waktu" 
        ? transactions 
        : transactions.filter(t => t.month === currentFilter);

    list.innerHTML = "";

    displayData.forEach(t => {
        const isInc = t.type === 'Pemasukan';
        const amount = Number(t.amount);
        if (isInc) totalInc += amount; else totalExp += amount;

        list.innerHTML += `
            <div class="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-50 flex justify-between items-center animate-fade-in">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl flex items-center justify-center ${isInc ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} text-xs">
                        ${isInc ? '➕':'➖'}
                    </div>
                    <div>
                        <p class="font-bold text-[13px] text-slate-800 leading-tight">${t.note}</p>
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">${t.person}</p>
                        <p class="text-[7.5px] text-slate-300 font-medium italic mt-0.5 leading-none">${formatFullDate(t.timestamp)}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <p class="font-bold text-sm ${isInc ? 'text-emerald-600' : 'text-rose-600'}">
                        ${amount.toLocaleString('id-ID')}
                    </p>
                    <div class="flex gap-0.5 border-l pl-2 border-slate-100">
                        <button onclick="prepareEdit(${t.id})" class="p-1 text-slate-200 hover:text-indigo-500 transition-colors">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button onclick="deleteData(${t.id})" class="p-1 text-slate-200 hover:text-rose-500 transition-colors">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
            </div>`;
    });

    document.getElementById('total-income').innerText = 'Rp ' + totalInc.toLocaleString('id-ID');
    document.getElementById('total-expense').innerText = 'Rp ' + totalExp.toLocaleString('id-ID');
    document.getElementById('total-balance').innerText = 'Rp ' + (totalInc - totalExp).toLocaleString('id-ID');
    
    updateChart(totalInc, totalExp);
}

function updateChart(inc, exp) {
    const ctx = document.getElementById('financeChart');
    if (myChart) myChart.destroy();
    
    // Placeholder jika data kosong
    const chartData = (inc === 0 && exp === 0) ? [1, 0] : [inc, exp];
    const chartColors = (inc === 0 && exp === 0) ? ['#f1f5f9', '#f1f5f9'] : ['#10b981', '#f43f5e'];

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                borderWidth: 0,
                borderRadius: 10,
                spacing: 5
            }]
        },
        options: {
            cutout: '80%',
            plugins: { legend: { display: false } },
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// --- CRUD OPERATIONS ---

function prepareEdit(id) {
    const t = transactions.find(x => x.id === id);
    if (!t) return;

    isEditing = true;
    document.getElementById('edit-id').value = id;
    document.getElementById('input-amount').value = t.amount;
    document.getElementById('input-note').value = t.note;
    document.getElementById('input-person').value = t.person;
    document.getElementById('btn-save').innerText = "Update";
    setType(t.type);
    toggleModal();
}

async function saveData() {
    const btn = document.getElementById('btn-save');
    const amountVal = document.getElementById('input-amount').value;
    const noteVal = document.getElementById('input-note').value;
    const personVal = document.getElementById('input-person').value;
    const code = sessionStorage.getItem('vault_key');
    
    if (!amountVal || !noteVal) return alert("Lengkapi data!");

    const payload = {
        type: currentType,
        amount: parseInt(amountVal),
        person: personVal,
        note: noteVal,
        month: new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })
    };

    if (isEditing) payload.id = document.getElementById('edit-id').value;

    btn.disabled = true;
    btn.innerText = "Memproses...";

    try {
        const res = await fetch('/api/transactions', {
            method: isEditing ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', 'x-access-code': code },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeModal();
            fetchData();
        } else {
            alert("Terjadi kesalahan server.");
        }
    } catch (e) {
        alert("Gagal menyimpan.");
    } finally {
        btn.disabled = false;
        btn.innerText = isEditing ? "Update" : "Simpan";
    }
}

async function deleteData(id) {
    if (!confirm("Hapus data ini selamanya?")) return;
    const code = sessionStorage.getItem('vault_key');
    
    try {
        await fetch('/api/transactions', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'x-access-code': code },
            body: JSON.stringify({ id })
        });
        fetchData();
    } catch (e) {
        alert("Gagal menghapus.");
    }
}

// --- UTILITIES & MODAL ---

function setType(t) {
    currentType = t;
    const btnIn = document.getElementById('btn-in');
    const btnOut = document.getElementById('btn-out');
    if (t === 'Pemasukan') {
        btnIn.className = "flex-1 py-3 rounded-xl font-bold transition-all bg-white shadow-sm text-emerald-600";
        btnOut.className = "flex-1 py-3 rounded-xl font-bold transition-all text-slate-500";
    } else {
        btnOut.className = "flex-1 py-3 rounded-xl font-bold transition-all bg-white shadow-sm text-rose-600";
        btnIn.className = "flex-1 py-3 rounded-xl font-bold transition-all text-slate-500";
    }
}

function toggleModal() {
    document.getElementById('modal').classList.toggle('hidden');
}

function closeModal() {
    isEditing = false;
    document.getElementById('edit-id').value = "";
    document.getElementById('input-amount').value = "";
    document.getElementById('input-note').value = "";
    document.getElementById('btn-save').innerText = "Simpan";
    toggleModal();
}

document.getElementById('month-filter').addEventListener('change', updateUI);
