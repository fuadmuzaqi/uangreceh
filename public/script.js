let apiConfig = {};
let transactions = [];
let currentType = 'Pemasukan';
let myChart;

// 1. Ambil Config dari Vercel Serverless Function
async function loadConfig() {
    const res = await fetch('/api/config');
    apiConfig = await res.json();
}

async function checkAuth() {
    await loadConfig();
    const input = document.getElementById('access-code').value;
    if (input === apiConfig.ACCESS_CODE) {
        document.getElementById('login-screen').classList.add('hidden');
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
        btnIn.classList.add('bg-white', 'shadow', 'text-green-600');
        btnOut.classList.remove('bg-white', 'shadow', 'text-red-600');
    } else {
        btnOut.classList.add('bg-white', 'shadow', 'text-red-600');
        btnIn.classList.remove('bg-white', 'shadow', 'text-green-600');
    }
}

function toggleModal() {
    const modal = document.getElementById('modal');
    modal.classList.toggle('hidden');
}

function formatRupiah(num) {
    return "Rp " + Number(num).toLocaleString('id-ID');
}

async function fetchData() {
    const res = await fetch(apiConfig.GS_API);
    transactions = await res.json();
    updateUI();
}

function updateUI() {
    const list = document.getElementById('transaction-list');
    const totalIncEl = document.getElementById('total-income');
    const totalExpEl = document.getElementById('total-expense');
    const totalBalEl = document.getElementById('total-balance');
    
    let inc = 0;
    let exp = 0;
    list.innerHTML = "";

    transactions.reverse().forEach(t => {
        if(t.type === 'Pemasukan') inc += t.amount;
        else exp += t.amount;

        const date = new Date(t.timestamp).toLocaleDateString('id-ID', {day:'numeric', month:'short'});
        
        list.innerHTML += `
            <div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border-l-4 ${t.type === 'Pemasukan' ? 'border-green-500' : 'border-red-500'}">
                <div>
                    <p class="font-bold text-sm">${t.note} <span class="font-normal text-gray-400 text-xs">(${t.person})</span></p>
                    <p class="text-xs text-gray-400">${date}</p>
                </div>
                <div class="text-right">
                    <p class="font-bold ${t.type === 'Pemasukan' ? 'text-green-600' : 'text-red-600'}">${t.type === 'Pemasukan' ? '+' : '-'}${formatRupiah(t.amount)}</p>
                    <button onclick="deleteData('${t.timestamp}')" class="text-[10px] text-gray-300 hover:text-red-500">Hapus</button>
                </div>
            </div>
        `;
    });

    totalIncEl.innerText = formatRupiah(inc);
    totalExpEl.innerText = formatRupiah(exp);
    totalBalEl.innerText = formatRupiah(inc - exp);

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
                backgroundColor: ['#10B981', '#EF4444'],
                borderWidth: 0,
                cutout: '70%'
            }]
        },
        options: { plugins: { legend: { position: 'bottom' } } }
    });
}

async function saveData() {
    const btn = document.getElementById('btn-save');
    const amount = document.getElementById('input-amount').value;
    const person = document.getElementById('input-person').value;
    const note = document.getElementById('input-note').value;
    const month = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' });

    if(!amount || !note) return alert("Isi semua data!");

    btn.innerText = "Proses...";
    btn.disabled = true;

    const data = { type: currentType, amount: parseInt(amount), person, note, month };

    await fetch(`${apiConfig.GS_API}?action=add`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

    location.reload();
}

async function deleteData(ts) {
    if(!confirm("Hapus transaksi ini?")) return;
    await fetch(`${apiConfig.GS_API}?action=delete`, {
        method: 'POST',
        body: JSON.stringify({ timestamp: ts })
    });
    location.reload();
}
