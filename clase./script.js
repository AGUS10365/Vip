const TOTAL_CAPACITY = 42;
let currentUser = null;
let state = { allNames: [], available: [], seated: [], isSpinning: false, currentAngle: 0, autoSpinState: 'idle', autoSpinTimer: null };
let usersDB = [];

function initData() {
  try {
    let savedUsers = localStorage.getItem('seatSpinner_users');
    if(savedUsers) {
      usersDB = JSON.parse(savedUsers);
    } else {
      usersDB = [
        { username: "developer", pass: "dev123", role: "developer" },
        { username: "admin", pass: "admin123", role: "admin" },
        { username: "user", pass: "user123", role: "user" }
      ];
      localStorage.setItem('seatSpinner_users', JSON.stringify(usersDB));
    }

    let savedData = localStorage.getItem('seatSpinner_data');
    if(savedData) {
      const p = JSON.parse(savedData);
      state.allNames = p.allNames || [];
      state.available = p.available || [];
      state.seated = p.seated || [];
    } else {
      state.allNames = Array.from({length: 42}, (_, i) => `Siswa ${i + 1}`);
      state.available = [...state.allNames]; shuffleArray(state.available); state.seated = [];
      saveData();
    }
  } catch (e) {
    localStorage.clear();
    location.reload();
  }
}

function saveData() { localStorage.setItem('seatSpinner_data', JSON.stringify({ allNames: state.allNames, available: state.available, seated: state.seated })); }
function saveUsersDB() { localStorage.setItem('seatSpinner_users', JSON.stringify(usersDB)); }
function shuffleArray(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } }

function doLogin() {
  try {
    const btn = document.getElementById('btn-login');
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value.trim();
    if(!u || !p) return showToast('Isi username dan password!', 'error');
    
    btn.innerText = 'Memproses...'; btn.disabled = true;
    setTimeout(() => {
      const user = usersDB.find(x => x.username === u && x.pass === p);
      if (user) { currentUser = user; setupUIForRole(); showToast(`Selamat datang, ${user.username}!`, 'success'); } 
      else { showToast('Username atau password salah!', 'error'); }
      btn.innerText = 'Masuk ke Sistem'; btn.disabled = false;
    }, 500);
  } catch (e) { alert("Error login: " + e.message); }
}

function doLogout() { 
  if(!confirm('Yakin mau logout?')) return;
  currentUser = null; 
  document.getElementById('login-view').classList.remove('hidden'); 
  document.getElementById('app-view').classList.add('hidden'); 
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  stopAutoSpin();
}

function setupUIForRole() {
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('app-view').classList.remove('hidden');
  const role = currentUser.role, nav = document.getElementById('nav-links'), logo = document.getElementById('logo-brand');
  
  if (role === 'developer') {
    document.documentElement.style.setProperty('--primary', '#8b5cf6');
    logo.innerHTML = `<span style="background:#8b5cf6">DEV</span> Class Spinner`;
    nav.innerHTML = `<div class="nav-link" id="nav-spin" onclick="switchTab('spin')">Spin</div><div class="nav-link" id="nav-plan" onclick="switchTab('plan')">Denah</div><div class="nav-link" id="nav-list" onclick="switchTab('list')">Murid</div><div class="nav-link active" id="nav-manage-users" onclick="switchTab('manage-users')">Kelola Akun</div>`;
    switchTab('manage-users');
  } else if (role === 'admin') {
    document.documentElement.style.setProperty('--primary', '#0ea5e9');
    logo.innerHTML = `<span style="background:#0ea5e9">ADM</span> Class Spinner`;
    nav.innerHTML = `<div class="nav-link active" id="nav-spin" onclick="switchTab('spin')">Spin</div><div class="nav-link" id="nav-plan" onclick="switchTab('plan')">Denah</div><div class="nav-link" id="nav-list" onclick="switchTab('list')">Murid</div>`;
    switchTab('spin');
  } else {
    document.documentElement.style.setProperty('--primary', '#10b981');
    logo.innerHTML = `<span style="background:#10b981">USR</span> Class Spinner`;
    nav.innerHTML = `<div class="nav-link active" id="nav-plan" onclick="switchTab('plan')">Denah Kelas</div>`;
    switchTab('plan');
  }
  updateUI();
}

function switchTab(tab) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  document.getElementById(`view-${tab}`).classList.add('active');
  const n = document.getElementById(`nav-${tab}`); if(n) n.classList.add('active');
  
  if (tab === 'plan') renderLayout(); 
  if (tab === 'spin') { drawWheel(); updateUI(); } 
  if (tab === 'manage-users') renderUsersTable();
  if (tab === 'list') document.getElementById('input-names').value = state.allNames.join('\n');
}

function showToast(msg, type = 'success') { 
  const t = document.getElementById('toast'); 
  t.innerText = msg; 
  t.style.background = type === 'error' ? '#ef4444' : 'var(--primary)'; 
  t.className = 'toast show'; 
  setTimeout(() => t.className = 'toast', 3000); 
}

function getNextSeat() { const i = state.seated.length; if(i>=42) return null; return { desk: Math.floor(i/2)+1, seat: i%2===0?'A':'B' }; }
function manualSpin() { if(currentUser.role==='user' || state.isSpinning || state.available.length===0) return; triggerSpin(); }

function triggerSpin() {
  state.isSpinning = true; document.getElementById('btn-spin').innerText = 'SPINNING...'; document.getElementById('btn-spin').disabled = true;
  const winIdx = Math.floor(Math.random() * state.available.length), winName = state.available[winIdx];
  const canvas = document.getElementById('wheel-canvas'), seg = 360 / state.available.length, target = (360 - (winIdx * seg) - (seg / 2));
  const spins = 5 + Math.floor(Math.random() * 3), newTotal = state.currentAngle + (360 * spins) + (target - (state.currentAngle % 360));
  state.currentAngle = newTotal; canvas.style.transform = `rotate(${newTotal}deg)`;
  
  setTimeout(() => {
    state.available.splice(winIdx, 1);
    const seat = getNextSeat(); if(seat) state.seated.push({ desk: seat.desk, seat: seat.seat, name: winName });
    saveData(); updateUI(); drawWheel(); 
    document.getElementById('popup-name').innerText = winName; document.getElementById('popup-seat').innerText = `Meja ${seat.desk} - Kursi ${seat.seat}`; document.getElementById('popup-spin').classList.add('show');
    state.isSpinning = false; document.getElementById('btn-spin').innerText = 'SPIN NOW'; document.getElementById('btn-spin').disabled = false;

    if(state.autoSpinState === 'running' && state.seated.length < 42) {
      state.autoSpinTimer = setTimeout(() => { if(state.autoSpinState === 'running') triggerSpin(); }, 2000);
    } else if(state.seated.length >= 42) {
      if(state.autoSpinState === 'running') stopAutoSpin();
    }
  }, 4000);
}

function toggleAutoSpin() {
  if(currentUser.role==='user') return;
  const btn = document.getElementById('btn-auto');
  if(state.autoSpinState === 'idle' || state.autoSpinState === 'stopped') {
    if(state.available.length===0) return showToast('Kursi penuh!', 'error');
    state.autoSpinState = 'running'; btn.innerText = 'PAUSE'; btn.className = 'btn btn-danger';
    triggerSpin();
  } else if(state.autoSpinState === 'running') {
    state.autoSpinState = 'paused'; btn.innerText = 'RESUME'; btn.className = 'btn btn-primary';
    clearTimeout(state.autoSpinTimer);
  } else if(state.autoSpinState === 'paused') {
    state.autoSpinState = 'running'; btn.innerText = 'PAUSE'; btn.className = 'btn btn-danger';
    triggerSpin();
  }
}

function stopAutoSpin() {
  state.autoSpinState = 'idle'; clearTimeout(state.autoSpinTimer);
  const btn = document.getElementById('btn-auto');
  if(btn) { btn.innerText = 'AUTO SPIN'; btn.className = 'btn btn-outline'; }
}

function undoSpin() {
  if(currentUser.role==='user' || state.seated.length===0 || state.isSpinning) return;
  const lastSeat = state.seated.pop();
  if(lastSeat) state.available.push(lastSeat.name);
  saveData(); updateUI(); drawWheel(); renderLayout();
  showToast(`Undo: ${lastSeat.name} dikembalikan.`);
}

function resetAll() { 
  if(currentUser.role==='user' || !confirm('Reset semua hasil spin?')) return; 
  stopAutoSpin();
  state.available = [...state.allNames]; shuffleArray(state.available); state.seated = []; state.currentAngle = 0;
  const canvas = document.getElementById('wheel-canvas');
  if(canvas) { canvas.style.transition = 'none'; canvas.style.transform = `rotate(0deg)`; setTimeout(() => canvas.style.transition = 'transform 4s cubic-bezier(.17,.67,.12,.99)', 50); }
  saveData(); updateUI(); drawWheel(); renderLayout(); 
  showToast('Sistem berhasil di-reset!');
}

function drawWheel() {
  const canvas = document.getElementById('wheel-canvas'); if(!canvas) return; const ctx = canvas.getContext('2d'), r = canvas.width/2;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(state.available.length===0) { ctx.beginPath(); ctx.arc(r,r,r,0,2*Math.PI); ctx.fillStyle='rgba(255,255,255,0.05)'; ctx.fill(); return; }
  const seg = (2*Math.PI)/state.available.length;
  for(let i=0; i<state.available.length; i++) {
    const colors = ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.08)']; ctx.beginPath(); ctx.moveTo(r,r); ctx.arc(r,r,r,i*seg,(i+1)*seg); ctx.fillStyle=colors[i%2]; ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1; ctx.stroke();
    ctx.save(); ctx.translate(r,r); ctx.rotate(i*seg+(seg/2)); ctx.textAlign='right'; ctx.fillStyle='#94a3b8'; ctx.font='bold 12px Inter'; let txt = state.available[i]; if(txt.length>15) txt=txt.substring(0,13)+'...'; ctx.fillText(txt, r-20, 5); ctx.restore();
  }
}

function renderLayout() {
  const grid = document.getElementById('desk-grid'); if(!grid) return; grid.innerHTML = '';
  for(let i=1; i<=21; i++) {
    const A = state.seated.find(s=>s.desk===i&&s.seat==='A'), B = state.seated.find(s=>s.desk===i&&s.seat==='B'), filled = A||B;
    grid.innerHTML += `<div class="desk-card ${filled?'filled':''}"><div class="desk-header"><span>MEJA ${i}</span> ${filled?'<span style="color:#10b981;">TERISI</span>':''}</div><div class="seat-row"><div class="seat-label">A</div><div class="seat-name ${A?'filled-text':''}">${A?A.name:'—'}</div></div><div class="seat-row"><div class="seat-label">B</div><div class="seat-name ${B?'filled-text':''}">${B?B.name:'—'}</div></div></div>`;
  }
}

function updateUI() { 
  const len = state.seated.length; 
  document.getElementById('progress-text').innerText = `${len} / 42 Kursi Terisi`; 
  document.getElementById('progress-bar').style.width = `${(len/42)*100}%`; 
  if(currentUser && currentUser.role !== 'user') {
    document.getElementById('btn-spin').disabled = (state.available.length === 0 || state.isSpinning || state.autoSpinState === 'running');
    document.getElementById('btn-undo').disabled = (state.seated.length === 0 || state.isSpinning);
  }
}

function copyRekap() {
  let text = "📋 *REKAP TEMPAT DUDUK KELAS*\n\n"; let empty = true;
  for(let i=1; i<=21; i++) { 
    const A = state.seated.find(s=>s.desk===i&&s.seat==='A'), B = state.seated.find(s=>s.desk===i&&s.seat==='B'); 
    if(A||B) { empty=false; text += `🪑 Meja ${i} : ${A?A.name:'-'} & ${B?B.name:'-'}\n`; } 
  }
  if(empty) return showToast('Belum ada data murid yang di-spin!', 'error');
  text += "\n✨ Dibuat oleh Class Spinner";
  navigator.clipboard.writeText(text).then(() => showToast('✅ Rekap berhasil di-copy!'));
}

function saveNames() { 
  if(currentUser.role==='user') return; 
  const lines = document.getElementById('input-names').value.split('\n').map(s=>s.trim()).filter(s=>s!==''); 
  if(!lines.length || lines.length>42) return showToast('Maksimal 42 nama!', 'error'); 
  state.allNames = lines; 
  if(!state.seated.length) { state.available = [...lines]; shuffleArray(state.available); } 
  saveData(); showToast('Daftar nama disimpan!'); switchTab('spin'); 
}

function closePopup(id) { document.getElementById(id).classList.remove('show'); if(id==='popup-spin' && document.getElementById('view-plan').classList.contains('active')) renderLayout(); }

function renderUsersTable() {
  const tbody = document.getElementById('user-table-body'); tbody.innerHTML = '';
  usersDB.forEach(u => {
    const isDev = u.role === 'developer';
    tbody.innerHTML += `<tr><td style="font-weight:600;color:#fff;">${u.username}</td><td><span class="role-badge ${u.role==='developer'?'role-dev':(u.role==='admin'?'role-admin':'role-user')}">${u.role.toUpperCase()}</span></td><td>${isDev?'<span class="text-muted" style="font-size:12px;">Tidak bisa dihapus</span>':`<button class="btn btn-danger" style="padding:6px 12px;font-size:12px;" onclick="deleteUser('${u.username}')">Hapus</button>`}</td></tr>`;
  });
}

function openUserModal() { document.getElementById('new-user-name').value=''; document.getElementById('new-user-pass').value=''; document.getElementById('popup-user').classList.add('show'); }

function saveNewUser() {
  const u = document.getElementById('new-user-name').value.trim(), p = document.getElementById('new-user-pass').value.trim(), r = document.getElementById('new-user-role').value;
  if(!u || !p) return showToast('Isi semua data!', 'error');
  if(usersDB.find(x => x.username === u)) return showToast('Username sudah dipakai!', 'error');
  usersDB.push({ username: u, pass: p, role: r });
  saveUsersDB(); closePopup('popup-user'); renderUsersTable(); showToast(`Akun ${u} berhasil dibuat!`);
}

function deleteUser(username) { 
  if(!confirm('Hapus akun ini?')) return; 
  usersDB = usersDB.filter(x => x.username !== username);
  saveUsersDB(); renderUsersTable(); showToast('Akun dihapus!'); 
}

window.onload = () => { initData(); document.getElementById('login-view').classList.remove('hidden'); };
