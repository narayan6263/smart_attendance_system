// const $ = id => document.getElementById(id);
// let current = { slots: [], teachers: [], subjects: [], records: [] };
// const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
// function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
// function fmtDate(v){return new Date(`${v}T12:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});}
// function localDate(v){const d=new Date(v);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
// function fmtTime(v){return new Date(v).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true});}
// function clock(){const d=new Date();$('currentDate').textContent=d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});$('currentTime').textContent=d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true});} clock();setInterval(clock,1000);
// async function api(url, options={}){const r=await fetch(url,{cache:'no-store',...options});let data={};try{data=await r.json();}catch{}if(!r.ok)throw Error(data.message||`Request failed (${r.status})`);return data;}
// function toast(message, bad=false){const t=document.createElement('div');t.className='toast toast-custom show mb-2';t.innerHTML=`<div class="toast-body"><span class="toast-check" style="background:${bad?'#e65e70':'#29d39e'}">${bad?'!':'✓'}</span><span>${esc(message)}</span></div>`;$('toastContainer').appendChild(t);setTimeout(()=>t.remove(),4000);}
// function statusPill(status){return `<span class="status-pill status-${esc(status)}">${esc(status.toUpperCase())}</span>`;}
// function sessionCard(slot){const a=slot.attendance||{present:0,pending:0,approved:0};return `<div class="session-card"><div class="d-flex justify-content-between align-items-start gap-2"><div><div class="session-title">${esc(slot.subject)}</div><div class="session-meta">${esc(slot.className||'MCA')} · ${esc(slot.teacher||'Teacher')} · ${esc(slot.startTime)}–${esc(slot.endTime)}</div></div>${statusPill(slot.status)}</div><div class="session-count">${a.present||0} <small style="font:500 11px 'DM Sans';color:#7284a1">/ ${slot.expectedCount||'—'} present</small></div><div class="session-meta">${a.pending||0} pending approval · ${a.approved||0} approved</div></div>`;}
// function renderSlots(){const rows=current.slots;if(!rows.length){$('slotRows').innerHTML='<tr><td colspan="5" class="empty-row">No lecture slots for this date. Upload a timetable or create a manual slot below.</td></tr>';$('currentSession').innerHTML='<div class="waiting"><div>⌁</div><b>No lecture scheduled</b><span>Create or import a slot, then allow scanning on the lecture date.</span></div>';return;}
// const open=rows.find(s=>s.status==='open');$('currentSession').innerHTML=open?sessionCard(open):'<div class="waiting"><div>⌁</div><b>No lecture open</b><span>Upcoming lectures remain locked until the teacher clicks Allow scanning.</span></div>';
// $('slotRows').innerHTML=rows.map(s=>{const a=s.attendance||{present:0,pending:0,approved:0};const isToday=s.date===today();let action=s.status==='open'?`<button class="btn btn-outline-danger" data-action="close" data-id="${s._id}">Close scanning</button>`:`<button class="btn btn-primary" data-action="allow" data-id="${s._id}" ${(!isToday||s.status==='ended')?'disabled':''}>Allow scanning</button>`;return `<tr><td><b>${esc(s.subject)}</b><div class="time-sub">${esc(s.className||'MCA')} · ${esc(s.teacher||'Teacher')}</div></td><td>${esc(s.startTime)}–${esc(s.endTime)}<div class="time-sub">${isToday?'Today':fmtDate(s.date)}</div></td><td><b>${a.present||0}</b> / ${s.expectedCount||'—'}<div class="time-sub">${a.pending||0} pending · ${a.approved||0} approved</div></td><td>${statusPill(s.status)}</td><td><div class="row-buttons">${action}<button class="btn btn-outline-success" data-action="approve-slot" data-id="${s._id}" ${!a.pending?'disabled':''}>Approve pending</button><button class="btn btn-outline-secondary" data-action="headcount" data-id="${s._id}">Headcount</button><button class="btn btn-outline-danger" data-action="delete-slot" data-id="${s._id}">Delete</button></div></td></tr>`;}).join('');}
// function renderAttendance(){const filter=$('statusFilter').value;const rows=current.records.filter(r=>!filter||(r.status||'pending')===filter);$('attendanceRows').innerHTML=rows.length?rows.map(r=>{const status=r.status||'pending';const date=r.slotDate||localDate(r.scannedAt);return `<tr><td><b>${esc(r.uid)}</b></td><td><b>${esc(r.subject||'RFID Scan')}</b><div class="time-sub">${esc(r.className||'—')}</div></td><td>${fmtDate(date)}<div class="time-sub">${fmtTime(r.scannedAt)}</div></td><td>${statusPill(status)}</td><td><div class="row-buttons">${status!=='approved'?`<button class="btn btn-success" data-action="approve-one" data-id="${r._id}">Approve</button>`:''}${status!=='rejected'?`<button class="btn btn-outline-warning" data-action="reject-one" data-id="${r._id}">Reject</button>`:''}<button class="btn btn-outline-danger" data-action="delete-record" data-id="${r._id}">Delete</button></div></td></tr>`;}).join(''):'<tr><td colspan="5" class="empty-row">No attendance records for this date/filter.</td></tr>';}
// function renderLists(){ $('teacherList').innerHTML=current.teachers.map(t=>`<span class="manage-chip">${esc(t.name)} <button title="Delete teacher" data-action="delete-teacher" data-id="${t._id}">×</button></span>`).join('')||'<small class="text-muted">No teachers added yet.</small>'; $('subjectList').innerHTML=current.subjects.map(s=>`<span class="manage-chip">${esc(s.name)} <small>(${esc(s.className||'MCA')})</small> <button title="Delete subject" data-action="delete-subject" data-id="${s._id}">×</button></span>`).join('')||'<small class="text-muted">No subjects added yet.</small>'; }
// async function refresh(){try{const date=$('selectedDate').value||today();const attendanceDate=$('attendanceDate').value;const attendanceUrl='/api/attendance'+(attendanceDate?'?date='+encodeURIComponent(attendanceDate):'');const [health,data,attendance]=await Promise.all([api('/api/health'),api('/api/bootstrap?date='+encodeURIComponent(date)),api(attendanceUrl)]);$('connectionText').textContent='API connected';$('deviceState').textContent='API reachable';$('deviceDot').style.background='#21c997';$('apiDot').style.background='#21c997';$('dbDot').style.background=health.mongo==='connected'?'#21c997':'#f3b34e';$('dbStatus').textContent=health.mongo==='connected'?'Connected':'Offline';$('approveDate').disabled=!attendanceDate;current.slots=data.slots||[];current.teachers=data.teachers||[];current.subjects=data.subjects||[];current.records=attendance.records||[];$('statSlots').textContent=current.slots.length;$('statScans').textContent=attendance.total??current.records.length;$('statPending').textContent=current.records.filter(r=>(r.status||'pending')==='pending').length;renderSlots();renderAttendance();renderLists();}catch(e){$('connectionText').textContent='API offline';$('deviceState').textContent='API unreachable';$('deviceDot').style.background='#f3b34e';$('apiDot').style.background='#f3b34e';$('dbStatus').textContent='Offline';}}
// $('selectedDate').value=today();$('loadDate').addEventListener('click',refresh);$('attendanceDate').addEventListener('change',refresh);$('statusFilter').addEventListener('change',renderAttendance);
// $('slotForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const body=Object.fromEntries(f.entries());body.date=$('selectedDate').value||today();body.expectedCount=Number(body.expectedCount||0);try{const d=await api('/api/slots',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});toast(d.message);e.currentTarget.reset();e.currentTarget.elements.className.value='MCA';e.currentTarget.elements.startTime.value='10:40';e.currentTarget.elements.endTime.value='10:50';e.currentTarget.elements.expectedCount.value='60';await refresh();}catch(err){toast(err.message,true);}});
// $('slotRows').addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b)return;const {action,id}=b.dataset;try{let d;if(action==='allow'||action==='close')d=await api(`/api/slots/${id}/${action}`,{method:'POST'});else if(action==='approve-slot')d=await api('/api/attendance/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slotId:id})});else if(action==='headcount'){const slot=current.slots.find(s=>s._id===id);const value=prompt('Expected class headcount:',slot?.expectedCount||0);if(value===null)return;const n=Number(value);if(!Number.isInteger(n)||n<0)throw Error('Enter a valid non-negative headcount.');d=await api(`/api/slots/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedCount:n})});}else if(action==='delete-slot'){if(!confirm('Delete this lecture and all its attendance records?'))return;d=await api(`/api/slots/${id}`,{method:'DELETE'});}if(d){toast(d.message);await refresh();}}catch(err){toast(err.message,true);}});
// $('attendanceRows').addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b)return;const {action,id}=b.dataset;try{let d;if(action==='approve-one')d=await api('/api/attendance/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:[id]})});else if(action==='reject-one')d=await api(`/api/attendance/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'rejected'})});else if(action==='delete-record'){if(!confirm('Delete this attendance record?'))return;d=await api(`/api/attendance/${id}`,{method:'DELETE'});}toast(d.message);await refresh();}catch(err){toast(err.message,true);}});
// $('approveDate').addEventListener('click',async()=>{const date=$('attendanceDate').value;if(!date)return;if(!confirm(`Approve all pending attendance records for ${date}?`))return;try{const d=await api('/api/attendance/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date})});toast(d.message);await refresh();}catch(e){toast(e.message,true);}});
// $('uploadForm').addEventListener('submit',async e=>{e.preventDefault();const file=$('timetableFile').files[0];if(!file)return;const form=new FormData();form.append('timetable',file);$('uploadResult').textContent='Uploading…';try{const d=await api('/api/timetable/upload',{method:'POST',body:form});$('uploadResult').textContent=d.message;toast(d.message);await refresh();}catch(err){$('uploadResult').textContent=err.message;toast(err.message,true);}});
// $('teacherForm').addEventListener('submit',async e=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.currentTarget).entries());try{const d=await api('/api/teachers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});toast(d.message);e.currentTarget.reset();await refresh();}catch(err){toast(err.message,true);}});
// $('subjectForm').addEventListener('submit',async e=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.currentTarget).entries());try{const d=await api('/api/subjects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});toast(d.message);e.currentTarget.reset();e.currentTarget.elements.className.value='MCA';await refresh();}catch(err){toast(err.message,true);}});
// document.body.addEventListener('click',async e=>{const b=e.target.closest('[data-action="delete-teacher"],[data-action="delete-subject"]');if(!b)return;const action=b.dataset.action;if(!confirm('Delete this item?'))return;try{const d=await api(`/api/${action==='delete-teacher'?'teachers':'subjects'}/${b.dataset.id}`,{method:'DELETE'});toast(d.message);await refresh();}catch(err){toast(err.message,true);}});
// refresh();setInterval(refresh,3000);


const $ = id => document.getElementById(id);
if (!localStorage.token) {
  location.replace('/login.html?next=' + encodeURIComponent(location.pathname + location.search + location.hash));
} else {
const user = JSON.parse(localStorage.user || '{}');
$('who').textContent = `${user.name || ''} (${user.empCode || ''})`;
$('logout').onclick = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); location.replace('/login.html'); };
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const enc = encodeURIComponent, pad = n => String(n).padStart(2, '0');
const hm = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const prettyDate = v => new Date(v + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

async function api(url, opt = {}) {
  const headers = { Authorization: 'Bearer ' + localStorage.token, ...(opt.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) };
  const r = await fetch(url, { cache: 'no-store', ...opt, headers });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    location.replace('/login.html?next=' + encodeURIComponent(location.pathname + location.search + location.hash));
    throw Error('Please login again');
  }
  if (!r.ok) throw Error(d.message || `Request failed (${r.status})`);
  return d;
}
const post = (url, body) => api(url, { method: 'POST', body: JSON.stringify(body || {}) });
function toast(m, bad) { const d = document.createElement('div'); d.textContent = m; if (bad) d.className = 'err'; $('toasts').appendChild(d); setTimeout(() => d.remove(), 3500); }
const run = fn => async (...a) => { try { await fn(...a); } catch (e) { toast(e.message, true); } };
const charts = {};
function chart(id, cfg) { charts[id]?.destroy(); charts[id] = new Chart($(id), cfg); }
const grp = s => (s.groups && s.groups.length ? `Group ${s.groups.join('+')}` : 'Whole class');
const pill = s => `<span class="pill p-${s}">${s}</span>`;

/* ---------- tabs ---------- */
let timer;
function show(t) {
  document.querySelectorAll('.tab').forEach(x => x.hidden = x.id !== 'tab-' + t);
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  clearInterval(timer);
  const load = { admin: loadAdmin, lectures: loadSlots, reports: () => loadHistory(), students: loadStudents, timetable: loadTimetable }[t];
  if (load) run(load)();
  if (t === 'lectures') timer = setInterval(run(loadSlots), 5000);
  if (t === 'admin') timer = setInterval(run(loadAdmin), 15000);
  if (['admin', 'lectures', 'reports', 'students', 'timetable'].includes(t)) history.replaceState(null, '', '#' + t);
}
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => show(b.dataset.tab));

/* ---------- institute admin ---------- */
const teacherLabel = s => (s.teachers || []).map(t => t.name).join(' / ') || (s.teacherCodes || []).join(' / ') || '—';
let lastAdminSlots = [];
function renderAdminSlots(all) {
  const q = ($('adminFilter')?.value || '').trim().toLowerCase();
  const slots = q ? all.filter(s => [s.className, s.subject, s.room, teacherLabel(s), ...(s.teacherCodes || [])].join(' ').toLowerCase().includes(q)) : all;
  $('adminSlotRows').innerHTML = slots.map(s => `<tr>
    <td><b>${esc(s.className)}</b><div class="muted">${grp(s)}</div></td>
    <td>${esc(s.startTime)}–${esc(s.endTime)}<div class="muted">${s.rounds > 1 ? 'Two scan rounds' : 'One scan window'}</div></td>
    <td>${esc(s.subject)} <span class="pill p-${esc(s.type)}">${esc(s.type)}</span></td>
    <td>${esc(teacherLabel(s))}</td><td>${esc(s.room || '—')}</td>
    <td><span class="pill p-${esc(s.state)}">${esc(s.state)}</span>${s.activeRound ? `<div class="muted">Round ${s.activeRound} open</div>` : ''}</td>
    <td><b>${s.present}</b> / ${s.classSize}${s.partial ? `<div class="muted">${s.partial} partial</div>` : ''}</td>
    <td><button class="btn btn-outline-primary btn-sm" data-admin-report="${s._id}">Report</button></td>
  </tr>`).join('') || '<tr><td colspan="8" class="muted">No classes are scheduled for this date. Upload the institute timetable to generate lectures.</td></tr>';
}
async function loadAdmin() {
  const date = $('adminDate').value || today();
  const d = await api('/api/admin/overview?date=' + enc(date));
  const s = d.summary;
  $('adminClasses').textContent = s.classes;
  $('adminSlots').textContent = s.slots;
  $('adminOpen').textContent = s.open;
  $('adminPresent').textContent = s.present;
  $('adminTeachers').textContent = s.teachers;
  $('adminStudents').textContent = s.students;
  $('adminScans').textContent = s.scans;
  $('adminPartial').textContent = s.partial;
  lastAdminSlots = d.slots;
  renderAdminSlots(d.slots);
  $('adminTeacherRows').innerHTML = d.teachers.map(t => `<tr><td>${esc(t.name)}</td><td>${esc(t.empCode)}</td><td>${esc(t.email)}</td><td>${t.isAdmin ? 'Admin' : 'Teacher'}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No teacher accounts registered yet.</td></tr>';
}
$('adminDate').value = today();
$('adminRefresh').onclick = run(loadAdmin);
$('adminDate').onchange = run(loadAdmin);
$('adminSlotRows').onclick = run(async e => {
  const b = e.target.closest('[data-admin-report]');
  if (!b) return;
  show('reports');
  await loadHistory(b.dataset.adminReport);
});

/* ---------- my lectures ---------- */
$('slotDate').value = today(); $('slotDate').onchange = run(loadSlots);
let slotsNow = [];
async function loadSlots() {
  const d = await api('/api/slots?date=' + $('slotDate').value);
  slotsNow = d.slots;
  $('dayTitle').textContent = (d.date === today() ? 'Today · ' : '') + prettyDate(d.date);
  $('slotList').innerHTML = d.slots.map(s => {
    const stateText = { open: `Scanning open · Round ${s.activeRound}`, locked: 'Scanning locked', upcoming: 'Not started', ended: 'Finished' }[s.state];
    const rounds = s.windows.map(w => `<span class="rnd ${s.activeRound === w.round ? 'live' : ''}">${s.rounds > 1 ? 'Round ' + w.round + ' · ' : ''}auto ${hm(w.from)}–${hm(w.to)} · ${s.roundCounts[w.round] || 0}/${s.classSize} scanned</span>`).join('');
    const extra = s.manualUntil && new Date(s.manualUntil) > new Date() ? `<span class="rnd live">Extra time till ${new Date(s.manualUntil).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>` : '';
    return `<div class="card-box"><div class="lec"><div>
      <h3>${esc(s.subject)} ${pill(s.type)} ${pill(s.state)}</h3>
      <div class="meta">${esc(s.className)} · ${grp(s)} · ${esc(s.room || '—')} · ${esc(s.startTime)}–${esc(s.endTime)} · ${stateText} · Present ${s.present}/${s.classSize}${s.partial ? ` · Partial ${s.partial}` : ''}</div>
      <div class="rounds">${rounds}${extra}</div></div>
      <div class="d-flex gap-2 flex-wrap justify-content-end">
       ${s.date === today() ? `<button class="btn btn-primary btn-sm" data-a="allow" data-id="${s._id}">Allow scanning</button><button class="btn btn-outline-secondary btn-sm" data-a="stop" data-id="${s._id}">Stop extra time</button>` : ''}
       <button class="btn btn-outline-primary btn-sm" data-a="report" data-id="${s._id}">Report</button>
       <button class="btn btn-outline-danger btn-sm" data-a="del" data-id="${s._id}">Delete</button></div></div></div>`;
  }).join('') || '<div class="card-box text-muted">No lectures on this day. Upload your timetable in the Timetable tab.</div>';
}
$('slotList').onclick = run(async e => {
  const b = e.target.closest('[data-a]'); if (!b) return; const id = b.dataset.id;
  if (b.dataset.a === 'allow') { const v = prompt('Allow scanning for how many minutes?', '10'); if (v === null) return; toast((await post(`/api/slots/${id}/allow`, { minutes: Number(v) })).message); }
  if (b.dataset.a === 'stop') toast((await post(`/api/slots/${id}/stop`)).message);
  if (b.dataset.a === 'del') { if (!confirm('Delete this lecture and all its attendance?')) return; toast((await api(`/api/slots/${id}`, { method: 'DELETE' })).message); }
  if (b.dataset.a === 'report') { show('reports'); await loadHistory(id); return; }
  await loadSlots();
});

/* ---------- reports ---------- */
const fill = (id, items, cur) => { $(id).innerHTML = '<option value="">All</option>' + items.map(x => `<option ${x === cur ? 'selected' : ''}>${esc(x)}</option>`).join(''); };
async function loadHistory(keepId) {
  const c = $('fClass').value, s = $('fSubject').value;
  const teacherCode = isAdmin ? $('fTeacher').value : '';
  const d = await api(`/api/history?className=${enc(c)}&subject=${enc(s)}&teacherCode=${enc(teacherCode)}`);
  fill('fClass', d.filters.classes, c); fill('fSubject', d.filters.subjects, s);
  if (isAdmin) {
    $('fTeacher').innerHTML = '<option value="">All teachers</option>' + d.filters.teachers.map(t => `<option value="${esc(t.empCode)}" ${t.empCode === teacherCode ? 'selected' : ''}>${esc(t.name)} (${esc(t.empCode)})</option>`).join('');
  }
  $('fLecture').innerHTML = d.slots.map(x => `<option value="${x._id}">${x.date} · ${x.startTime}–${x.endTime} · ${esc(x.subject)} (${x.type}) · ${esc(x.className)} · ${x.present}/${x.classSize}</option>`).join('') || '<option value="">No lectures yet</option>';
  if (keepId && d.slots.some(x => x._id === keepId)) $('fLecture').value = keepId;
  const t = d.slots.slice(0, 30).reverse();
  chart('trendChart', { type: 'bar', data: { labels: t.map(x => `${x.date.slice(5)} ${x.startTime}`), datasets: [{ label: 'Present %', data: t.map(x => x.classSize ? Math.round(x.present / x.classSize * 100) : 0), backgroundColor: '#2f5bea' }] }, options: { maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } } });
  $('reportBody').innerHTML = ''; if ($('fLecture').value) await loadReport($('fLecture').value);
}
['fClass', 'fSubject'].forEach(i => $(i).onchange = run(() => loadHistory()));
$('fTeacher').onchange = run(() => loadHistory());
$('fLecture').onchange = run(() => $('fLecture').value && loadReport($('fLecture').value));
let curSlot = null;
async function loadReport(id) {
  const d = await api(`/api/slots/${id}/report`); curSlot = id; const s = d.slot, m = d.summary;
  const pct = m.classSize ? Math.round(m.present / m.classSize * 100) : 0;
  $('reportBody').innerHTML = `<div class="card-box"><h2>${esc(s.subject)} <span class="pill p-${s.type}">${s.type}</span></h2>
   <div class="sub">${prettyDate(s.date)} · ${esc(s.startTime)}–${esc(s.endTime)} · ${esc(s.className)} · ${grp(s)} · ${esc(s.room || '—')}${s.rounds > 1 ? ' · Present = scanned in both rounds' : ''}</div>
   <div class="row g-3 align-items-center"><div class="col-md-4"><div class="chartbox" style="height:200px"><canvas id="pie"></canvas></div></div>
   <div class="col-md-8"><div class="row stat g-2"><div class="col"><b>${m.present}</b><span>Present</span></div>${s.rounds > 1 ? `<div class="col"><b>${m.partial}</b><span>Partial</span></div>` : ''}<div class="col"><b>${m.absent}</b><span>Absent</span></div><div class="col"><b>${m.classSize}</b><span>Class size</span></div><div class="col"><b>${pct}%</b><span>Attendance</span></div></div></div></div></div>
   <div class="card-box"><div class="table-responsive"><table class="table table-sm align-middle"><thead><tr><th>Roll</th><th>Name</th><th>UID</th>${s.rounds > 1 ? '<th>Round 1</th><th>Round 2</th>' : '<th>Scanned</th>'}<th>Status</th><th></th></tr></thead><tbody>
   ${d.rows.map(r => `<tr><td>${esc(r.rollNo)}</td><td><a href="#" data-sr="${esc(r.uid)}">${esc(r.name)}</a></td><td class="text-muted">${esc(r.uid)}</td>
    ${r.rounds.map((p, i) => `<td><button class="mk ${p ? 'on' : 'off'}" data-mk="${esc(r.uid)}" data-round="${i + 1}" data-p="${p ? 1 : 0}" title="Click to change">${p ? '✓' : '✗'}</button></td>`).join('')}
    <td>${pill(r.status)}</td><td><button class="btn btn-sm btn-outline-success py-0" data-mk="${esc(r.uid)}" data-round="all" data-p="0">Mark present</button></td></tr>`).join('') || '<tr><td colspan="7" class="text-muted">No students in this class yet. Add them in the Students tab.</td></tr>'}
   </tbody></table></div></div>`;
  chart('pie', { type: 'doughnut', data: { labels: ['Present', 'Partial', 'Absent'], datasets: [{ data: [m.present, m.partial, m.absent], backgroundColor: ['#12a37a', '#f0a63c', '#e0566a'] }] }, options: { maintainAspectRatio: false } });
}
$('reportBody').onclick = run(async e => {
  const sr = e.target.closest('[data-sr]'); if (sr) { e.preventDefault(); return openStudent(sr.dataset.sr); }
  const b = e.target.closest('[data-mk]'); if (!b) return;
  await post(`/api/slots/${curSlot}/mark`, { uid: b.dataset.mk, round: b.dataset.round === 'all' ? 'all' : Number(b.dataset.round), present: b.dataset.p !== '1' });
  await loadReport(curSlot);
});

/* ---------- students ---------- */
async function loadStudents() {
  const c = $('stClass').value; const d = await api('/api/students?className=' + enc(c));
  fill('stClass', d.classes, c);
  $('stRows').innerHTML = d.students.map(s => `<tr><td>${esc(s.rollNo)}</td><td>${esc(s.name)}</td><td>${esc(s.className)}</td><td>${esc(s.group || '—')}</td><td class="text-muted">${esc(s.uid)}</td>
   <td class="text-end"><button class="btn btn-sm btn-outline-primary py-0" data-sr="${esc(s.uid)}">Record</button> <button class="btn btn-sm btn-outline-danger py-0" data-del="${s._id}">×</button></td></tr>`).join('') || '<tr><td colspan="6" class="text-muted">No students yet.</td></tr>';
  $('classList').innerHTML = d.classes.map(c => `<option value="${esc(c)}">`).join('');
  const u = (await api('/api/students/unknown')).card;
  $('unknownBox').innerHTML = u ? `Last unregistered card: <b>${esc(u.uid)}</b> <a href="#" id="useUid">use this</a>` : 'Scan an unregistered card on the reader to see its UID here.';
  if (u) $('useUid').onclick = e => { e.preventDefault(); $('stUid').value = u.uid; };
}
$('stClass').onchange = run(loadStudents);
$('stForm').onsubmit = run(async e => { e.preventDefault(); toast((await post('/api/students', Object.fromEntries(new FormData(e.target).entries()))).message); e.target.reset(); await loadStudents(); });
$('stUpload').onsubmit = run(async e => { e.preventDefault(); const f = new FormData(); f.append('file', e.target.querySelector('input').files[0]); toast((await api('/api/students/upload', { method: 'POST', body: f })).message); await loadStudents(); });
$('stRows').onclick = run(async e => {
  const r = e.target.closest('[data-sr]'); if (r) return openStudent(r.dataset.sr);
  const d = e.target.closest('[data-del]'); if (d && confirm('Delete this student?')) { await api('/api/students/' + d.dataset.del, { method: 'DELETE' }); await loadStudents(); }
});

/* ---------- student record ---------- */
let srUid = null;
async function openStudent(uid) { srUid = uid; show('sreport'); await run(loadStudentReport)(); }
$('srScope').onchange = run(loadStudentReport);
async function loadStudentReport() {
  const d = await api(`/api/students/${enc(srUid)}/report?scope=${$('srScope').value}`), s = d.student;
  $('srTitle').textContent = `${s.name} · ${s.className}${s.rollNo ? ' · Roll ' + s.rollNo : ''}`;
  $('srBody').innerHTML = `<div class="card-box"><div class="row stat g-2"><div class="col"><b>${d.overall.percent}%</b><span>Overall attendance</span></div><div class="col"><b>${d.overall.attended}</b><span>Attended</span></div><div class="col"><b>${d.overall.total}</b><span>Total lectures</span></div></div>
   <div class="chartbox mt-3"><canvas id="srChart"></canvas></div></div>
   <div class="card-box"><div class="table-responsive"><table class="table table-sm"><thead><tr><th>Date</th><th>Time</th><th>Subject</th><th>Teacher</th><th>Status</th></tr></thead><tbody>
   ${d.lectures.map(l => `<tr><td>${l.date}</td><td>${l.startTime}–${l.endTime}</td><td>${esc(l.subject)} ${l.type === 'lab' ? pill('lab') : ''}</td><td>${esc(l.teacher)}</td><td>${pill(l.status)}${l.rounds > 1 ? ` ${l.attended}/${l.rounds}` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="text-muted">No lectures yet.</td></tr>'}</tbody></table></div></div>`;
  chart('srChart', { type: 'bar', data: { labels: d.subjects.map(x => x.subject), datasets: [{ label: 'Attendance %', data: d.subjects.map(x => x.percent), backgroundColor: d.subjects.map(x => x.percent >= 75 ? '#12a37a' : '#e0566a') }] }, options: { maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } } });
}

$('studentSearchForm').onsubmit = run(async e => {
  e.preventDefault();
  await openStudent($('studentSearchUid').value.trim().toUpperCase());
});

/* ---------- timetable ---------- */
async function loadTimetable() {
  const d = await api('/api/timetable');
  $('ttAdmin').hidden = !user.isAdmin;
  $('ttInfo').textContent = d.total ? `Current timetable: ${d.total} lectures/labs, ${d.classes} classes.` : 'No timetable imported yet.';
  $('ttWho').textContent = `Employee code ${user.empCode}`;
  $('ttRows').innerHTML = d.entries.map(e => `<tr><td>${e.weekday.slice(0, 3)}</td><td>${e.startTime}–${e.endTime}</td><td>${esc(e.subject)} ${pill(e.type)}</td><td>${esc(e.className)} · ${grp(e)}</td><td>${esc(e.room || '—')}</td></tr>`).join('') || '<tr><td colspan="5" class="text-muted">No lectures found for your employee code.</td></tr>';
}
$('ttUpload').onsubmit = run(async e => { e.preventDefault(); const f = new FormData(); f.append('file', e.target.querySelector('input[type=file]').files[0]); toast('Importing… PDF can take a few seconds'); toast((await api('/api/timetable/import', { method: 'POST', body: f })).message); await loadTimetable(); if (isAdmin) await loadAdmin(); });

/* ---------- admin: find teacher, day / range view ---------- */
$('adminFilter').oninput = () => renderAdminSlots(lastAdminSlots);
$('tFrom').value = $('tTo').value = today();
const slotTable = slots => `<div class="table-responsive"><table class="table table-sm align-middle">
  <thead><tr><th>Time</th><th>Class / group</th><th>Subject</th><th>Room</th><th>Present</th><th>Status</th><th></th></tr></thead><tbody>
  ${slots.map(s => `<tr><td>${esc(s.startTime)}–${esc(s.endTime)}</td><td>${esc(s.className)} · ${grp(s)}</td><td>${esc(s.subject)} <span class="pill p-${esc(s.type)}">${esc(s.type)}</span></td>
    <td>${esc(s.room || '—')}</td><td><b>${s.present}</b> / ${s.classSize}${s.partial ? ` <span class="muted">(${s.partial} partial)</span>` : ''}</td>
    <td><span class="pill p-${esc(s.state)}">${esc(s.state)}</span></td>
    <td><button class="btn btn-outline-primary btn-sm" data-admin-report="${s._id}">Report</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted">No lectures.</td></tr>'}
  </tbody></table></div>`;
// Resolve the typed name / code to one teacher. Shows a pick list when the text matches several.
async function resolveTeacher() {
  const q = $('tSearch').value.trim();
  if (!q) throw Error('Type a teacher name or employee code.');
  const { teachers } = await api('/api/admin/teachers/search?q=' + enc(q));
  $('tList').innerHTML = teachers.map(t => `<option value="${esc(t.empCode)}">${esc(t.name)}</option>`).join('');
  const exact = teachers.find(t => t.empCode === q.toUpperCase());
  if (exact) return exact.empCode;
  if (teachers.length === 1) return teachers[0].empCode;
  if (!teachers.length) throw Error('No teacher found for that name or code.');
  $('tResults').innerHTML = '<p class="muted">Several teachers match. Choose one:</p>' + teachers.map(t =>
    `<button class="btn btn-outline-secondary btn-sm me-1 mb-1" data-pick="${esc(t.empCode)}">${esc(t.name)} (${esc(t.empCode)})</button>`).join('');
  return null;
}
const teacherHead = (t, title) => `<h3 class="section-title">${esc(t.name)} <span class="muted">(${esc(t.empCode)})</span></h3><p class="muted">${title}</p>`;
async function showTeacherDay(code) {
  const c = code || await resolveTeacher(); if (!c) return;
  const date = $('tFrom').value || today();
  const d = await api(`/api/admin/teachers/${enc(c)}/day?date=${enc(date)}`);
  $('tResults').innerHTML = teacherHead(d.teacher, `${prettyDate(d.date)} · ${d.summary.lectures} lecture(s) · ${d.summary.present} present of ${d.summary.classSize}`) + slotTable(d.slots);
}
async function showTeacherRange(code) {
  const c = code || await resolveTeacher(); if (!c) return;
  const from = $('tFrom').value, to = $('tTo').value;
  const d = await api(`/api/admin/teachers/${enc(c)}/range?from=${enc(from)}&to=${enc(to)}`);
  $('tResults').innerHTML = teacherHead(d.teacher, `${from} to ${to}`) + d.days.map(day =>
    `<h4 class="h6 mt-3">${prettyDate(day.date)}</h4>` + (day.slots.length ? slotTable(day.slots) : '<p class="muted">No lectures this day.</p>')).join('');
}
$('tDay').onclick = run(() => showTeacherDay());
$('tRange').onclick = run(() => showTeacherRange());
$('tSearch').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); run(() => showTeacherRange())(); } };
$('tSearch').onchange = run(() => resolveTeacher());
$('tResults').onclick = run(async e => {
  const pick = e.target.closest('[data-pick]');
  if (pick) return showTeacherRange(pick.dataset.pick);
  const b = e.target.closest('[data-admin-report]');
  if (b) { show('reports'); await loadHistory(b.dataset.adminReport); }
});

const isAdmin = !!user.isAdmin;
document.querySelectorAll('[data-role="admin"]').forEach(x => x.hidden = !isAdmin);
document.querySelectorAll('[data-role="teacher"]').forEach(x => x.hidden = isAdmin);
$('workspaceLabel').textContent = isAdmin ? 'ADMIN WORKSPACE' : 'TEACHER WORKSPACE';
$('dashboardTitle').innerHTML = isAdmin ? 'Admin <span>dashboard.</span>' : 'Teacher <span>dashboard.</span>';
$('dashboardDescription').textContent = isAdmin
  ? 'Manage the institute timetable and monitor every class and teacher.'
  : 'Manage lecture scans, class lists, and attendance reports.';
$('studentSearchBox').hidden = !isAdmin;
$('teacherFilterWrap').hidden = !isAdmin;
$('srScope').value = isAdmin ? 'all' : 'mine';
$('srScope').disabled = isAdmin;
const allowedTabs = isAdmin ? ['admin', 'reports', 'students', 'timetable'] : ['lectures', 'reports', 'students', 'timetable'];
const fromHash = location.hash.slice(1);
show(allowedTabs.includes(fromHash) ? fromHash : (isAdmin ? 'admin' : 'lectures'));
window.addEventListener('hashchange', () => { const t = location.hash.slice(1); if (allowedTabs.includes(t)) show(t); });

/* ---------- scanner devices (live ON/OFF and last scans) ---------- */
async function loadDevices() {
  const { devices } = await api('/api/devices');
  const html = devices.length ? devices.map(d => {
    const e = d.lastEvent;
    const label = e ? ({ success: 'Attendance marked', duplicate: 'Already marked', unknown: 'Unregistered card', closed: 'Scanning closed', offline: 'Server unreachable', invalid: 'Invalid scan' }[e.type] || e.type) : 'No scans yet';
    const who = e ? [e.name, e.uid].filter(Boolean).map(esc).join(' · ') : '';
    const when = e ? new Date(e.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
    return `<div class="lec"><div>
      <h3>${esc(d.room)} <span class="pill ${d.power === 'on' ? 'p-open' : 'p-ended'}">${d.power === 'on' ? 'ON' : 'OFF'}</span> ${d.online ? '' : '<span class="pill p-ended">offline</span>'}</h3>
      <div class="meta">${esc(label)}${who ? ' · ' + who : ''}${when ? ' · ' + when : ''}</div>
    </div></div>`;
  }).join('') : '<div class="muted">No device has reported yet. Press the button on the device to turn it ON.</div>';
  document.querySelectorAll('.deviceList').forEach(el => el.innerHTML = html);
}
loadDevices().catch(() => {});
setInterval(() => loadDevices().catch(() => {}), 2000);
}