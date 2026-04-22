let apiConfig = {};
let transactions = [];
let currentType = 'Pemasukan';
let myChart;

// Registrasi Service Worker untuk PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}

async function loadConfig() {
    try {
        const res = await fetch('/api/config');
        apiConfig = await res.json();
    } catch (e) { console.error("Gagal load config"); }
}

async function checkAuth() {
    await loadConfig();
    const input = document.getElementById('access-code').value;
    if (input === apiConfig.ACCESS_CODE) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-content').classList.remove('hidden');
        fetchData();
    } else {
        alert("Kode akses salah!");
    }
}

function setType(type) {
    currentType = type;
    const btnIn = document.getElementById('btn-in');
    const btnOut = document.getElementById('btn-out');
    if(type === 'Pemasukan') {
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

function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
}

async function fetchData() {
    try {
        const res = await fetch(apiConfig.GS_API);
        transactions = await res.json();
        updateUI();
    } catch (e) { console.error("Gagal ambil data"); }
}

function updateUI() {
    const list = document.getElementById('transaction-list');
    let inc = 0, exp = 0;
    list.innerHTML = "";

    [...transactions].reverse().forEach(t => {
        if(t.type === 'Pemasukan') inc += Number(t.amount);
        else exp += Number(t.amount);

        const date = new Date(t.timestamp).toLocaleDateString('id-ID', {day:'2-digit', month:'short'});
        const isInc = t.type === 'Pemasukan';
        
        list.innerHTML += `
            <div class="flex justify-between items-center bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-50 transaction-card">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${isInc ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">
                        ${isInc ? '➕' : '➖'}
                    </div>
                    <div>
                        <p class="font-bold text-slate-800">${t.note}</p>
                        <p class="text-xs text-slate-400 font-medium">${date} • Oleh ${t.person}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-bold text-lg ${isInc ? 'text-emerald-600' : 'text-rose-600'}">${isInc ? '+' : '-'}${Number(t.amount).toLocaleString('id-ID')}</p>
                    <button onclick="deleteData('${t.timestamp}')" class="text-[10px] font-bold text-slate-300 uppercase tracking-wider hover:text-rose-500">Hapus</button>
                </div>
            </div>
        `;
    });

    document.getElementById('total-income').innerText = formatRupiah(inc);
    document.getElementById('total-expense').innerText = formatRupiah(exp);
    document.getElementById('total-balance').innerText = formatRupiah(inc - exp);

    updateChart(inc, exp);
}

function updateChart(inc, exp) {
    const ctx = document.getElementById('financeChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Masuk', 'Keluar'],
            datasets: [{
                data: [inc, exp],
                backgroundColor: ['#10b981', '#f43f5e'],
                hoverOffset: 4,
                borderRadius: 10,
                spacing: 5
            }]
        },
        options: { cutout: '75%', plugins: { legend: { display: false } } }
    });
}

async function saveData() {
    const btn = document.getElementById('btn-save');
    const amount = document.getElementById('input-amount').value;
    const person = document.getElementById('input-person').value;
    const note = document.getElementById('input-note').value;
    const month = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' });

    if(!amount || !note) return alert("Lengkapi data!");

    btn.innerText = "Mengirim...";
    btn.disabled = true;

    const data = { type: currentType, amount: parseInt(amount), person, note, month };

    try {
        // Gunakan mode no-cors jika Apps Script tidak mengirim header CORS
        await fetch(`${apiConfig.GS_API}?action=add`, {
            method: 'POST',
            mode: 'no-cors', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        // Karena no-cors tidak bisa baca response, kita asumsikan sukses setelah delay
        setTimeout(() => {
            location.reload();
        }, 1500);
    } catch (e) {
        alert("Gagal menyimpan!");
        btn.innerText = "Simpan";
        btn.disabled = false;
    }
}

async function deleteData(ts) {
    if(!confirm("Hapus data ini?")) return;
    await fetch(`${apiConfig.GS_API}?action=delete`, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ timestamp: ts })
    });
    setTimeout(() => location.reload(), 1000);
}
