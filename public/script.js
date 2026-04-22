let transactions = [];
let currentType = 'Pemasukan';
let myChart = null;
let isEditing = false;

document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('vault_key')) {
        checkSession();
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-content').classList.remove('hidden');
        fetchData();
        setInterval(checkSession, 60000);
    }
});

function checkSession() {
    const loginTime = sessionStorage.getItem('login_time');
    if (loginTime && (Date.now() - loginTime > 3600000)) logout();
}

function logout() { sessionStorage.clear(); location.reload(); }

async function checkAuth() {
    const code = document.getElementById('access-code').value;
    const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    if (res.ok) {
        sessionStorage.setItem('vault_key', code);
        sessionStorage.setItem('login_time', Date.now());
        location.reload();
    } else { alert("AKSES DITOLAK"); }
}

async function fetchData() {
    const code = sessionStorage.getItem('vault_key');
    const res = await fetch('/api/transactions', { headers: { 'x-access-code': code } });
    if (res.status === 401) return logout();
    transactions = await res.json();
    updateUI();
}

// FIX: Selalu format ke WIB (Asia/Jakarta)
function formatFullDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).replace(/\//g, '-').replace(',', ' •');
}

function updateUI() {
    const list = document.getElementById('transaction-list');
    const filter = document.getElementById('month-filter');
    let inc = 0, exp = 0;

    const months = [...new Set(transactions.map(t => t.month))];
    const currentMonthLabel = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    const currentFilter = filter.value || (months.includes(currentMonthLabel) ? currentMonthLabel : (months[0] || "Semua Waktu"));

    filter.innerHTML = `<option value="Semua Waktu">SEMUA WAKTU</option>`;
    months.forEach(m => filter.innerHTML += `<option value="${m}" ${currentFilter === m ? 'selected' : ''}>${m.toUpperCase()}</option>`);

    const displayData = currentFilter === "Semua Waktu" ? transactions : transactions.filter(t => t.month === currentFilter);
    list.innerHTML = "";

    displayData.forEach(t => {
        const isInc = t.type === 'Pemasukan';
        const amount = Number(t.amount);
        if (isInc) inc += amount; else exp += amount;

        list.innerHTML += `
            <div class="glass p-5 rounded-[2rem] flex justify-between items-center transition-all active:scale-95 border-l-4 ${isInc ? 'border-emerald-500' : 'border-rose-500'}">
                <div class="flex items-center gap-4">
                    <div class="flex flex-col">
                        <p class="font-bold text-[13px] text-slate-100 leading-tight mb-1">${t.note}</p>
                        <div class="flex items-center gap-2">
                            <span class="text-[8px] font-black text-indigo-400 uppercase tracking-widest">${t.person}</span>
                            <span class="text-[8px] text-slate-500 font-medium">${formatFullDate(t.timestamp)}</span>
                        </div>
                    </div>
                </div>
                <div class="flex flex-col items-end gap-2">
                    <p class="font-black text-[14px] ${isInc ? 'text-emerald-400' : 'text-rose-400'} tabular-nums">
                        ${isInc ? '+' : '-'}${amount.toLocaleString('id-ID')}
                    </p>
                    <div class="flex gap-1">
                        <button onclick="prepareEdit(${t.id})" class="p-1.5 text-slate-600 hover:text-indigo-400"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                        <button onclick="deleteData(${t.id})" class="p-1.5 text-slate-600 hover:text-rose-400"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                    </div>
                </div>
            </div>`;
    });

    document.getElementById('total-income').innerText = 'Rp ' + inc.toLocaleString('id-ID');
    document.getElementById('total-expense').innerText = 'Rp ' + exp.toLocaleString('id-ID');
    
    const total = inc + exp;
    const percent = total > 0 ? Math.round((inc / total) * 100) : 0;
    document.getElementById('chart-percent').innerText = percent + '%';

    updateChart(inc, exp);
}

function updateChart(inc, exp) {
    const ctx = document.getElementById('financeChart').getContext('2d');
    if (myChart) myChart.destroy();
    const gradientInc = ctx.createLinearGradient(0, 0, 0, 400);
    gradientInc.addColorStop(0, '#10b981'); gradientInc.addColorStop(1, '#059669');
    const gradientExp = ctx.createLinearGradient(0, 0, 0, 400);
    gradientExp.addColorStop(0, '#f43f5e'); gradientExp.addColorStop(1, '#e11d48');
    const chartData = (inc === 0 && exp === 0) ? [1, 0.01] : [inc, exp];
    const colors = (inc === 0 && exp === 0) ? ['#1e293b', '#1e293b'] : [gradientInc, gradientExp];
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: chartData, backgroundColor: colors, borderWidth: 0, borderRadius: 20, spacing: 10 }] },
        options: { cutout: '85%', plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { animateRotate: true, duration: 1500 } }
    });
}

// ... Sisanya tetap sama (saveData, deleteData, prepareEdit) ...
async function saveData() {
    const btn = document.getElementById('btn-save');
    const amountVal = document.getElementById('input-amount').value;
    const noteVal = document.getElementById('input-note').value;
    const personVal = document.getElementById('input-person').value;
    const code = sessionStorage.getItem('vault_key');
    if (!amountVal || !noteVal) return;
    const payload = { type: currentType, amount: parseInt(amountVal), person: personVal, note: noteVal, month: new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' }) };
    if (isEditing) payload.id = document.getElementById('edit-id').value;
    btn.disabled = true;
    try {
        const res = await fetch('/api/transactions', { method: isEditing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'x-access-code': code }, body: JSON.stringify(payload) });
        if (res.ok) { closeModal(); fetchData(); }
    } catch (e) { alert("GAGAL"); } finally { btn.disabled = false; }
}

async function deleteData(id) {
    if (!confirm("HAPUS?")) return;
    const code = sessionStorage.getItem('vault_key');
    await fetch('/api/transactions', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-access-code': code }, body: JSON.stringify({ id }) });
    fetchData();
}

function prepareEdit(id) {
    const t = transactions.find(x => x.id === id);
    isEditing = true;
    document.getElementById('edit-id').value = id;
    document.getElementById('input-amount').value = t.amount;
    document.getElementById('input-note').value = t.note;
    document.getElementById('input-person').value = t.person;
    document.getElementById('btn-save').innerText = "UPDATE DATA";
    setType(t.type);
    toggleModal();
}

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

function toggleModal() { document.getElementById('modal').classList.toggle('hidden'); }
function closeModal() {
    isEditing = false;
    document.getElementById('edit-id').value = "";
    document.getElementById('input-amount').value = "";
    document.getElementById('input-note').value = "";
    document.getElementById('btn-save').innerText = "SIMPAN DATA";
    toggleModal();
}

document.getElementById('month-filter').addEventListener('change', updateUI);
