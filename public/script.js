/**
 * Uang Receh - Script Utama
 * Tema: Dark Mode Only
 * Database: Turso Tech via Vercel API
 */

let transactions = [];
let currentType = 'Pemasukan';
let myChart = null;
let isEditing = false;

// 1. INISIALISASI & KEAMANAN
document.addEventListener('DOMContentLoaded', () => {
    const savedKey = sessionStorage.getItem('vault_key');
    if (savedKey) {
        checkSession(); // Cek durasi login
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-content').classList.remove('hidden');
        fetchData();
        
        // Jalankan pengecekan sesi tiap menit
        setInterval(checkSession, 60000);
    }
});

function checkSession() {
    const loginTime = sessionStorage.getItem('login_time');
    if (loginTime) {
        const diff = Date.now() - parseInt(loginTime);
        const oneHour = 3600000; // 1 jam dalam milidetik
        if (diff > oneHour) {
            alert("Sesi berakhir (1 jam). Silakan masuk kembali.");
            logout();
        }
    }
}

function logout() {
    sessionStorage.clear();
    location.reload();
}

async function checkAuth() {
    const code = document.getElementById('access-code').value;
    if (!code) return;

    try {
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
            alert("AKSES DITOLAK: Kode Salah.");
        }
    } catch (e) {
        alert("Gangguan koneksi.");
    }
}

// 2. DATA FETCHING
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
        console.error("Gagal memuat data:", e);
    }
}

// 3. FORMAT WAKTU (SINKRON WIB)
function formatFullDate(iso) {
    // Menambahkan " UTC" memastikan JS membaca waktu database sebagai UTC sebelum diconvert ke WIB
    const d = new Date(iso + " UTC"); 
    
    const options = {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };

    const formatted = d.toLocaleString('id-ID', options);
    // Mengubah 22/04/2026, 15.30 menjadi 22-04-2026 (15:30)
    const [datePart, timePart] = formatted.split(', ');
    const cleanDate = datePart.replace(/\//g, '-');
    const cleanTime = timePart.replace(/\./g, ':');
    
    return `${cleanDate} (${cleanTime})`;
}

// 4. UPDATE TAMPILAN (UI)
function updateUI() {
    const list = document.getElementById('transaction-list');
    const filter = document.getElementById('month-filter');
    let totalInc = 0;
    let totalExp = 0;

    // Filter Bulan & Folder
    const months = [...new Set(transactions.map(t => t.month))];
    const currentMonthLabel = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    const currentFilter = filter.value || (months.includes(currentMonthLabel) ? currentMonthLabel : (months[0] || "Semua Waktu"));

    filter.innerHTML = `<option value="Semua Waktu">SEMUA WAKTU</option>`;
    months.forEach(m => {
        filter.innerHTML += `<option value="${m}" ${currentFilter === m ? 'selected' : ''}>${m.toUpperCase()}</option>`;
    });

    const displayData = currentFilter === "Semua Waktu" 
        ? transactions 
        : transactions.filter(t => t.month === currentFilter);

    list.innerHTML = "";

    displayData.forEach(t => {
        const isInc = t.type === 'Pemasukan';
        const amount = Number(t.amount);
        if (isInc) totalInc += amount; else totalExp += amount;

        list.innerHTML += `
            <div class="glass p-5 rounded-[2rem] flex justify-between items-center border-l-4 ${isInc ? 'border-emerald-500' : 'border-rose-500'} transition-all active:scale-[0.98]">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-2xl flex items-center justify-center ${isInc ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'} text-xs">
                        ${isInc ? '➕':'➖'}
                    </div>
                    <div>
                        <p class="font-bold text-[13px] text-slate-100 leading-tight mb-1">${t.note}</p>
                        <div class="flex items-center gap-2">
                            <span class="text-[8px] font-black text-indigo-400 uppercase tracking-widest">${t.person}</span>
                            <span class="text-[8px] text-slate-500 font-medium italic">${formatFullDate(t.timestamp)}</span>
                        </div>
                    </div>
                </div>
                <div class="flex flex-col items-end gap-2">
                    <p class="font-black text-[14px] ${isInc ? 'text-emerald-400' : 'text-rose-400'} tabular-nums">
                        ${isInc ? '+' : '-'}${amount.toLocaleString('id-ID')}
                    </p>
                    <div class="flex gap-1">
                        <button onclick="prepareEdit(${t.id})" class="p-1.5 text-slate-600 hover:text-indigo-400 transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button onclick="deleteData(${t.id})" class="p-1.5 text-slate-600 hover:text-rose-400 transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
            </div>`;
    });

    document.getElementById('total-income').innerText = 'Rp ' + totalInc.toLocaleString('id-ID');
    document.getElementById('total-expense').innerText = 'Rp ' + totalExp.toLocaleString('id-ID');
    
    // Update Persentase Chart
    const total = totalInc + totalExp;
    const percent = total > 0 ? Math.round((totalInc / total) * 100) : 0;
    document.getElementById('chart-percent').innerText = percent + '%';

    updateChart(totalInc, totalExp);
}

// 5. DIAGRAM LINGKARAN (CHART.JS)
function updateChart(inc, exp) {
    const ctx = document.getElementById('financeChart').getContext('2d');
    if (myChart) myChart.destroy();

    const gradientInc = ctx.createLinearGradient(0, 0, 0, 400);
    gradientInc.addColorStop(0, '#10b981'); gradientInc.addColorStop(1, '#059669');

    const gradientExp = ctx.createLinearGradient(0, 0, 0, 400);
    gradientExp.addColorStop(0, '#f43f5e'); gradientExp.addColorStop(1, '#e11d48');

    const chartData = (inc === 0 && exp === 0) ? [1, 0.01] : [inc, exp];
    const chartColors = (inc === 0 && exp === 0) ? ['#1e293b', '#1e293b'] : [gradientInc, gradientExp];

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                borderWidth: 0,
                borderRadius: 20,
                spacing: 10
            }]
        },
        options: {
            cutout: '85%',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            animation: { animateRotate: true, duration: 1500 }
        }
    });
}

// 6. OPERASI DATABASE (CRUD)
function prepareEdit(id) {
    const t = transactions.find(x => x.id === id);
    if (!t) return;

    isEditing = true;
    document.getElementById('edit-id').value = id;
    document.getElementById('input-amount').value = t.amount;
    document.getElementById('input-note').value = t.note;
    document.getElementById('input-person').value = t.person;
    document.getElementById('btn-save').innerText = "UPDATE DATA";
    setType(t.type);
    toggleModal();
}

async function saveData() {
    const btn = document.getElementById('btn-save');
    const amountVal = document.getElementById('input-amount').value;
    const noteVal = document.getElementById('input-note').value;
    const personVal = document.getElementById('input-person').value;
    const code = sessionStorage.getItem('vault_key');
    
    if (!amountVal || !noteVal) return alert("Mohon lengkapi data.");

    const payload = {
        type: currentType,
        amount: parseInt(amountVal),
        person: personVal,
        note: noteVal,
        month: new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })
    };

    if (isEditing) payload.id = document.getElementById('edit-id').value;

    btn.disabled = true;
    btn.innerText = "MEMPROSES...";

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
            alert("Gagal menyimpan ke server.");
        }
    } catch (e) {
        alert("Terjadi kesalahan.");
    } finally {
        btn.disabled = false;
        btn.innerText = isEditing ? "UPDATE DATA" : "SIMPAN DATA";
    }
}

async function deleteData(id) {
    if (!confirm("Hapus transaksi ini?")) return;
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

// 7. UTILITIES
function setType(t) {
    currentType = t;
    const btnIn = document.getElementById('btn-in');
    const btnOut = document.getElementById('btn-out');
    if (t === 'Pemasukan') {
        btnIn.className = "flex-1 py-3.5 rounded-xl font-black text-[10px] tracking-widest transition-all bg-indigo-600 text-white";
        btnOut.className = "flex-1 py-3.5 rounded-xl font-black text-[10px] tracking-widest transition-all text-slate-500";
    } else {
        btnOut.className = "flex-1 py-3.5 rounded-xl font-black text-[10px] tracking-widest transition-all bg-rose-600 text-white";
        btnIn.className = "flex-1 py-3.5 rounded-xl font-black text-[10px] tracking-widest transition-all text-slate-500";
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
    document.getElementById('btn-save').innerText = "SIMPAN DATA";
    toggleModal();
}

// Event Listener Filter Bulan
document.getElementById('month-filter').addEventListener('change', updateUI);
