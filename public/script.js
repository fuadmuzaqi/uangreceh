/**
 * Uang Receh - Script Utama
 * Pengelola Keuangan Keluarga Fuad & Laili
 */

let transactions = [];
let currentType = 'Pemasukan';
let myChart = null;

// 1. Inisialisasi & PWA Registration
document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => console.log("SW failed"));
    }
    
    // Cek jika user sudah login sebelumnya di sesi ini
    const savedCode = sessionStorage.getItem('vault_key');
    if (savedCode) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-content').classList.remove('hidden');
        fetchData();
    }
});

// 2. Sistem Autentikasi (Server-side check)
async function checkAuth() {
    const inputCode = document.getElementById('access-code').value;
    if (!inputCode) return alert("Masukkan kode dulu, Bos!");

    try {
        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: inputCode })
        });

        const data = await res.json();

        if (data.success) {
            sessionStorage.setItem('vault_key', inputCode);
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-content').classList.remove('hidden');
            fetchData();
        } else {
            alert("Kode salah! Coba ingat-ingat lagi.");
        }
    } catch (e) {
        alert("Gagal terhubung ke server.");
    }
}

// 3. Ambil Data dari Turso
async function fetchData() {
    const code = sessionStorage.getItem('vault_key');
    try {
        const res = await fetch('/api/transactions', {
            headers: { 'x-access-code': code }
        });

        if (res.status === 401) {
            alert("Sesi habis, silakan login ulang.");
            sessionStorage.clear();
            location.reload();
            return;
        }

        transactions = await res.json();
        updateUI();
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

// 4. Update Tampilan (UI)
function updateUI() {
    const list = document.getElementById('transaction-list');
    const filter = document.getElementById('month-filter');
    let totalInc = 0;
    let totalExp = 0;

    // Reset List & Filter
    list.innerHTML = "";
    const months = [...new Set(transactions.map(t => t.month))];
    
    // Update Dropdown Filter Bulan (Folder)
    const currentFilter = filter.value || "Semua Waktu";
    filter.innerHTML = `<option value="Semua Waktu">Semua Waktu</option>`;
    months.forEach(m => {
        filter.innerHTML += `<option value="${m}" ${currentFilter === m ? 'selected' : ''}>${m}</option>`;
    });

    // Filter Data Berdasarkan Bulan
    const displayData = currentFilter === "Semua Waktu" 
        ? transactions 
        : transactions.filter(t => t.month === currentFilter);

    // Hitung Total & Render Item
    displayData.forEach(t => {
        const amount = Number(t.amount);
        const isInc = t.type === 'Pemasukan';
        
        if (isInc) totalInc += amount;
        else totalExp += amount;

        const date = new Date(t.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

        list.innerHTML += `
            <div class="flex justify-between items-center bg-white p-5 rounded-3xl shadow-sm border border-slate-50 transition-all active:scale-[0.98]">
                <div class="flex items-center gap-4">
                    <div class="w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${isInc ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">
                        ${isInc ? '➕' : '➖'}
                    </div>
                    <div>
                        <p class="font-bold text-slate-800 leading-tight">${t.note}</p>
                        <p class="text-[11px] text-slate-400 font-medium uppercase mt-0.5">${date} • ${t.person}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-bold text-base ${isInc ? 'text-emerald-600' : 'text-rose-600'}">
                        ${isInc ? '+' : '-'}${amount.toLocaleString('id-ID')}
                    </p>
                    <button onclick="deleteData(${t.id})" class="text-[10px] font-bold text-slate-300 hover:text-rose-500 uppercase tracking-tighter">Hapus</button>
                </div>
            </div>
        `;
    });

    // Update Header & Chart
    document.getElementById('total-income').innerText = formatRupiah(totalInc);
    document.getElementById('total-expense').innerText = formatRupiah(totalExp);
    document.getElementById('total-balance').innerText = formatRupiah(totalInc - totalExp);
    
    updateChart(totalInc, totalExp);
}

// 5. Simpan Data Baru
async function saveData() {
    const btn = document.getElementById('btn-save');
    const amount = document.getElementById('input-amount').value;
    const person = document.getElementById('input-person').value;
    const note = document.getElementById('input-note').value;
    const code = sessionStorage.getItem('vault_key');
    
    // Penentuan bulan otomatis (folder)
    const month = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' });

    if (!amount || !note) return alert("Data harus lengkap, ya!");

    btn.innerText = "Menyimpan...";
    btn.disabled = true;

    try {
        const res = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-access-code': code 
            },
            body: JSON.stringify({ type: currentType, amount: parseInt(amount), person, note, month })
        });

        if (res.ok) {
            toggleModal();
            fetchData();
            // Reset fields
            document.getElementById('input-amount').value = '';
            document.getElementById('input-note').value = '';
        } else {
            alert("Gagal menyimpan ke database.");
        }
    } catch (e) {
        alert("Terjadi kesalahan jaringan.");
    } finally {
        btn.innerText = "Simpan";
        btn.disabled = false;
    }
}

// 6. Hapus Data
async function deleteData(id) {
    if (!confirm("Hapus catatan ini?")) return;
    const code = sessionStorage.getItem('vault_key');
    
    try {
        await fetch('/api/transactions', {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'x-access-code': code 
            },
            body: JSON.stringify({ id })
        });
        fetchData();
    } catch (e) {
        alert("Gagal menghapus.");
    }
}

// 7. Helper Functions
function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR', 
        maximumFractionDigits: 0 
    }).format(num);
}

function setType(type) {
    currentType = type;
    const btnIn = document.getElementById('btn-in');
    const btnOut = document.getElementById('btn-out');
    if (type === 'Pemasukan') {
        btnIn.className = "flex-1 py-3 rounded-xl font-bold transition-all bg-white shadow-sm text-emerald-600";
        btnOut.className = "flex-1 py-3 rounded-xl font-bold transition-all text-slate-500";
    } else {
        btnOut.className = "flex-1 py-3 rounded-xl font-bold transition-all bg-white shadow-sm text-rose-600";
        btnIn.className = "flex-1 py-3 rounded-xl font-bold transition-all text-slate-500";
    }
}

function toggleModal() {
    const modal = document.getElementById('modal');
    modal.classList.toggle('hidden');
}

function updateChart(inc, exp) {
    const ctx = document.getElementById('financeChart').getContext('2d');
    if (myChart) myChart.destroy();
    
    // Jika tidak ada data, tampilkan placeholder
    const dataValues = (inc === 0 && exp === 0) ? [1, 0] : [inc, exp];
    const colors = (inc === 0 && exp === 0) ? ['#f1f5f9', '#f1f5f9'] : ['#10b981', '#f43f5e'];

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Masuk', 'Keluar'],
            datasets: [{
                data: dataValues,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 0,
                borderRadius: 15,
                spacing: 8
            }]
        },
        options: {
            cutout: '82%',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: inc !== 0 || exp !== 0,
                    callbacks: {
                        label: (item) => ` ${item.label}: ${formatRupiah(item.raw)}`
                    }
                }
            }
        }
    });
}

// Event Listener untuk filter bulan
document.getElementById('month-filter').addEventListener('change', updateUI);
