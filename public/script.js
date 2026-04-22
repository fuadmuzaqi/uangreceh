let transactions = [];
let currentType = 'Pemasukan';
let myChart = null;
let isEditing = false;

document.addEventListener('DOMContentLoaded', () => {
    const saved = sessionStorage.getItem('vault_key');
    if (saved) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-content').classList.remove('hidden');
        fetchData();
    }
});

async function checkAuth() {
    const code = document.getElementById('access-code').value;
    const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (data.success) {
        sessionStorage.setItem('vault_key', code);
        location.reload();
    } else {
        alert("Kode salah!");
    }
}

async function fetchData() {
    const code = sessionStorage.getItem('vault_key');
    const res = await fetch('/api/transactions', { headers: { 'x-access-code': code } });
    if (res.status === 401) return location.reload();
    transactions = await res.json();
    updateUI();
}

function updateUI() {
    const list = document.getElementById('transaction-list');
    const filter = document.getElementById('month-filter');
    let totalInc = 0, totalExp = 0;

    const months = [...new Set(transactions.map(t => t.month))];
    const currentMonth = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    const currentFilter = filter.value || (months.includes(currentMonth) ? currentMonth : months[0] || "Semua Waktu");

    filter.innerHTML = `<option value="Semua Waktu">Semua Waktu</option>`;
    months.forEach(m => filter.innerHTML += `<option value="${m}" ${currentFilter === m ? 'selected' : ''}>${m}</option>`);

    const displayData = currentFilter === "Semua Waktu" ? transactions : transactions.filter(t => t.month === currentFilter);
    list.innerHTML = "";

    displayData.forEach(t => {
        const isInc = t.type === 'Pemasukan';
        if (isInc) totalInc += Number(t.amount); else totalExp += Number(t.amount);

        list.innerHTML += `
            <div class="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-50">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center ${isInc ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">
                        ${isInc ? '➕' : '➖'}
                    </div>
                    <div>
                        <p class="font-bold text-slate-800 text-sm leading-tight">${t.note}</p>
                        <p class="text-[10px] text-slate-400 font-bold uppercase mt-0.5">${t.person}</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <p class="font-bold text-sm ${isInc ? 'text-emerald-600' : 'text-rose-600'}">${Number(t.amount).toLocaleString('id-ID')}</p>
                    <div class="flex gap-1 border-l pl-2 border-slate-100">
                        <button onclick="prepareEdit(${t.id})" class="p-1 text-slate-300 hover:text-indigo-600">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button onclick="deleteData(${t.id})" class="p-1 text-slate-300 hover:text-rose-600">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Masuk', 'Keluar'],
            datasets: [{
                data: [inc || 1, exp || 0],
                backgroundColor: [inc === 0 && exp === 0 ? '#f1f5f9' : '#10b981', '#f43f5e'],
                borderWidth: 0, borderRadius: 10, spacing: 5
            }]
        },
        options: { cutout: '80%', plugins: { legend: { display: false } } }
    });
}

function prepareEdit(id) {
    const t = transactions.find(item => item.id === id);
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
    const payload = {
        type: currentType,
        amount: document.getElementById('input-amount').value,
        person: document.getElementById('input-person').value,
        note: document.getElementById('input-note').value,
        month: new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })
    };
    if (isEditing) payload.id = document.getElementById('edit-id').value;

    btn.disabled = true;
    const res = await fetch('/api/transactions', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-code': sessionStorage.getItem('vault_key') },
        body: JSON.stringify(payload)
    });

    if (res.ok) closeModal() || fetchData();
}

async function deleteData(id) {
    if (!confirm("Hapus data?")) return;
    await fetch('/api/transactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-access-code': sessionStorage.getItem('vault_key') },
        body: JSON.stringify({ id })
    });
    fetchData();
}

function setType(t) {
    currentType = t;
    const btnIn = document.getElementById('btn-in'), btnOut = document.getElementById('btn-out');
    btnIn.className = `flex-1 py-3 rounded-xl font-bold transition-all ${t === 'Pemasukan' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`;
    btnOut.className = `flex-1 py-3 rounded-xl font-bold transition-all ${t === 'Pengeluaran' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500'}`;
}

function toggleModal() { document.getElementById('modal').classList.toggle('hidden'); }
function closeModal() {
    isEditing = false;
    document.getElementById('edit-id').value = "";
    document.getElementById('input-amount').value = "";
    document.getElementById('input-note').value = "";
    document.getElementById('btn-save').innerText = "Simpan";
    toggleModal();
}

document.getElementById('month-filter').addEventListener('change', updateUI);
