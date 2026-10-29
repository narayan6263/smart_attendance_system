// const express = require('express');
// const mongoose = require('mongoose');
// const path = require('path');
// const multer = require('multer');
// const { parse } = require('csv-parse/sync');

// const app = express();
// const PORT = Number(process.env.PORT || 8000);
// const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rfid_attendance';
// const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
// app.use(express.json({ limit: '1mb' }));
// app.use(express.static(path.join(__dirname, 'public')));
// app.use('/vendor/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));

// const slotSchema = new mongoose.Schema({
//   date: { type: String, required: true }, // YYYY-MM-DD
//   weekday: { type: String, required: true },
//   subject: { type: String, required: true, trim: true },
//   className: { type: String, default: 'MCA' },
//   teacher: { type: String, default: 'Teacher' },
//   startTime: { type: String, required: true }, // HH:mm
//   endTime: { type: String, required: true },
//   expectedCount: { type: Number, default: 0, min: 0 },
//   enabled: { type: Boolean, default: true },
//   status: { type: String, enum: ['closed', 'open', 'ended'], default: 'closed' },
//   openedAt: Date,
//   closedAt: Date,
//   createdAt: { type: Date, default: Date.now }
// }, { versionKey: false });
// slotSchema.index({ date: 1, startTime: 1 });
// const Slot = mongoose.models.Slot || mongoose.model('Slot', slotSchema);

// const attendanceSchema = new mongoose.Schema({
//   uid: { type: String, required: true, uppercase: true, trim: true },
//   slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
//   slotDate: { type: String, required: true },
//   subject: { type: String, required: true },
//   className: String,
//   teacher: String,
//   scannedAt: { type: Date, default: Date.now },
//   status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
//   approvedAt: Date
// }, { versionKey: false });
// attendanceSchema.index({ slotId: 1, uid: 1 }, { unique: true });
// const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

// const teacherSchema = new mongoose.Schema({ name: { type: String, required: true, trim: true }, email: { type: String, default: '' }, createdAt: { type: Date, default: Date.now } }, { versionKey: false });
// const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema);
// const subjectSchema = new mongoose.Schema({ name: { type: String, required: true, trim: true }, className: { type: String, default: 'MCA' } }, { versionKey: false });
// const Subject = mongoose.models.Subject || mongoose.model('Subject', subjectSchema);

// function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
// function weekdayFor(date) { return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' }); }
// function timeNow() { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
// function slotIsInWindow(slot) { const t = timeNow(); return t >= slot.startTime && t < slot.endTime; }
// async function updateExpiredSlots(date = todayISO()) {
//   const now = timeNow();
//   await Slot.updateMany({ date, status: 'open', endTime: { $lte: now } }, { $set: { status: 'ended', closedAt: new Date() } });
// }

// app.get('/api/health', (req, res) => res.json({ ok: true, mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
// app.get('/api/bootstrap', async (req, res) => {
//   try {
//     const date = String(req.query.date || todayISO());
//     await updateExpiredSlots(date);
//     const [slots, teachers, subjects] = await Promise.all([
//       Slot.find({ date }).sort({ startTime: 1 }).lean(),
//       Teacher.find().sort({ name: 1 }).lean(),
//       Subject.find().sort({ name: 1 }).lean()
//     ]);
//     const counts = await Attendance.aggregate([{ $match: { slotDate: date } }, { $group: { _id: '$slotId', present: { $sum: { $cond: [{ $ne: ['$status','rejected'] }, 1, 0] } }, pending: { $sum: { $cond: [{ $eq: ['$status','pending'] },1,0] } }, approved: { $sum: { $cond: [{ $eq: ['$status','approved'] },1,0] } } } }]);
//     const countMap = Object.fromEntries(counts.map(x => [String(x._id), x]));
//     res.json({ date, weekday: weekdayFor(date), slots: slots.map(s => ({ ...s, attendance: countMap[String(s._id)] || { present: 0, pending: 0, approved: 0 } })), teachers, subjects });
//   } catch (e) { res.status(500).json({ message: e.message }); }
// });

// // Device is allowed to record only while a teacher-opened slot is active and inside its time window.
// app.post('/api/scan', async (req, res) => {
//   try {
//     const uid = String(req.body?.uid || '').trim().toUpperCase().replace(/\s+/g, ' ');
//     if (!uid || uid.length > 80) return res.status(400).json({ message: 'A valid UID is required' });
//     const date = todayISO();
//     await updateExpiredSlots(date);
//     const slot = await Slot.findOne({ date, status: 'open', enabled: true }).sort({ startTime: 1 });
//     if (!slot) return res.status(423).json({ message: 'Scanning is closed. Ask your teacher to allow attendance for the current lecture.' });
//     if (!slotIsInWindow(slot)) {
//       if (timeNow() >= slot.endTime) { slot.status = 'ended'; slot.closedAt = new Date(); await slot.save(); }
//       return res.status(423).json({ message: `Scan window is ${slot.startTime}–${slot.endTime}.` });
//     }
//     const existing = await Attendance.findOne({ slotId: slot._id, uid }).lean();
//     if (existing) return res.status(200).json({ message: 'This card is already counted for this lecture', duplicate: true, uid, subject: slot.subject });
//     const record = await Attendance.create({ uid, slotId: slot._id, slotDate: date, subject: slot.subject, className: slot.className, teacher: slot.teacher });
//     const present = await Attendance.countDocuments({ slotId: slot._id, status: { $ne: 'rejected' } });
//     console.log(`[RFID] ${uid} | ${slot.subject} | ${date} | present=${present}`);
//     res.status(201).json({ message: 'Attendance recorded; awaiting teacher approval', uid, subject: slot.subject, present, expectedCount: slot.expectedCount, scannedAt: record.scannedAt });
//   } catch (e) {
//     if (e.code === 11000) return res.json({ message: 'This card is already counted for this lecture', duplicate: true });
//     console.error(e); res.status(500).json({ message: e.message });
//   }
// });

// app.post('/api/slots', async (req, res) => {
//   try {
//     const { date, subject, startTime, endTime } = req.body || {};
//     if (!date || [0,6].includes(new Date(`${date}T12:00:00`).getDay()) || !subject || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime || '') || endTime <= startTime) return res.status(400).json({ message: 'Enter date, subject and valid start/end times.' });
//     const slot = await Slot.create({ date, weekday: weekdayFor(date), subject, startTime, endTime, className: req.body.className || 'MCA', teacher: req.body.teacher || 'Teacher', expectedCount: Math.max(0, Number(req.body.expectedCount) || 0) });
//     res.status(201).json({ message: 'Lecture slot created', slot });
//   } catch (e) { res.status(500).json({ message: e.message }); }
// });

// app.post('/api/slots/:id/allow', async (req, res) => {
//   try {
//     const slot = await Slot.findById(req.params.id);
//     if (!slot) return res.status(404).json({ message: 'Lecture slot not found' });
//     const now = timeNow();
//     if (slot.date !== todayISO()) return res.status(400).json({ message: 'Only today’s lecture can be opened for live RFID scanning.' });
//     if (now >= slot.endTime) return res.status(400).json({ message: `This slot ended at ${slot.endTime}. Change the end time or create a new slot.` });
//     if (slot.status === 'open') return res.json({ message: 'This lecture is already open', slot });
//     // Keep only one slot open at a time.
//     await Slot.updateMany({ date: slot.date, status: 'open' }, { $set: { status: 'closed', closedAt: new Date() } });
//     slot.status = 'open'; slot.openedAt = new Date(); slot.closedAt = undefined; await slot.save();
//     res.json({ message: 'RFID scanning allowed for this lecture', slot });
//   } catch (e) { res.status(500).json({ message: e.message }); }
// });
// app.post('/api/slots/:id/close', async (req, res) => {
//   try { const slot = await Slot.findByIdAndUpdate(req.params.id, { $set: { status: 'closed', closedAt: new Date() } }, { new: true }); if (!slot) return res.status(404).json({ message: 'Slot not found' }); res.json({ message: 'Scanning closed', slot }); }
//   catch (e) { res.status(500).json({ message: e.message }); }
// });
// app.patch('/api/slots/:id', async (req, res) => {
//   try {
//     const allowed = ['subject','className','teacher','startTime','endTime','expectedCount','enabled'];
//     const patch = {}; for (const key of allowed) if (req.body[key] !== undefined) patch[key] = req.body[key];
//     const slot = await Slot.findByIdAndUpdate(req.params.id, { $set: patch }, { new: true, runValidators: true });
//     if (!slot) return res.status(404).json({ message: 'Slot not found' }); res.json({ message: 'Lecture updated', slot });
//   } catch (e) { res.status(500).json({ message: e.message }); }
// });
// app.delete('/api/slots/:id', async (req, res) => {
//   try { await Attendance.deleteMany({ slotId: req.params.id }); const result = await Slot.findByIdAndDelete(req.params.id); if (!result) return res.status(404).json({ message: 'Slot not found' }); res.json({ message: 'Slot and its attendance records deleted' }); }
//   catch (e) { res.status(500).json({ message: e.message }); }
// });

// app.get('/api/attendance', async (req, res) => {
//   try {
//     const filter = {};
//     if (req.query.date) {
//       const date = String(req.query.date);
//       if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: 'Date must use YYYY-MM-DD format.' });
//       const start = new Date(`${date}T00:00:00`);
//       if (Number.isNaN(start.getTime())) return res.status(400).json({ message: 'Enter a valid date.' });
//       const end = new Date(start);
//       end.setDate(end.getDate() + 1);
//       filter.$or = [
//         { slotDate: date },
//         { slotDate: { $exists: false }, scannedAt: { $gte: start, $lt: end } }
//       ];
//     }
//     if (req.query.slotId) filter.slotId = req.query.slotId;
//     if (req.query.status && ['pending','approved','rejected'].includes(req.query.status)) filter.status = req.query.status;
//     const rows = await Attendance.find(filter).sort({ scannedAt: -1 }).limit(1000).lean();
//     res.json({ records: rows, total: rows.length });
//   } catch (e) { res.status(500).json({ message: e.message }); }
// });
// app.post('/api/attendance/approve', async (req, res) => {
//   try {
//     const { ids, slotId, date } = req.body || {};
//     const filter = { $and: [{ $or: [{ status: 'pending' }, { status: { $exists: false } }] }] };
//     if (Array.isArray(ids) && ids.length) filter._id = { $in: ids };
//     else if (slotId) filter.slotId = slotId;
//     else if (date) {
//       const start = new Date(`${date}T00:00:00`);
//       if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(start.getTime())) return res.status(400).json({ message: 'Enter a valid date in YYYY-MM-DD format.' });
//       const end = new Date(start);
//       end.setDate(end.getDate() + 1);
//       filter.$and.push({ $or: [
//         { slotDate: date },
//         { slotDate: { $exists: false }, scannedAt: { $gte: start, $lt: end } }
//       ] });
//     }
//     else return res.status(400).json({ message: 'Provide ids, slotId or date to approve.' });
//     const result = await Attendance.updateMany(filter, { $set: { status: 'approved', approvedAt: new Date() } });
//     res.json({ message: `${result.modifiedCount} attendance record(s) approved`, approved: result.modifiedCount });
//   } catch (e) { res.status(500).json({ message: e.message }); }
// });
// app.patch('/api/attendance/:id', async (req, res) => {
//   try { const status = req.body.status; if (!['approved','rejected','pending'].includes(status)) return res.status(400).json({ message: 'Invalid status' }); const row = await Attendance.findByIdAndUpdate(req.params.id, { $set: { status, ...(status === 'approved' ? { approvedAt: new Date() } : {}) } }, { new: true }); if (!row) return res.status(404).json({ message: 'Record not found' }); res.json({ message: `Attendance ${status}`, record: row }); }
//   catch (e) { res.status(500).json({ message: e.message }); }
// });
// app.delete('/api/attendance/:id', async (req, res) => { try { const row = await Attendance.findByIdAndDelete(req.params.id); if (!row) return res.status(404).json({ message: 'Record not found' }); res.json({ message: 'Attendance record deleted' }); } catch (e) { res.status(500).json({ message: e.message }); } });

// app.post('/api/timetable/upload', upload.single('timetable'), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ message: 'Choose a CSV timetable file.' });
//     const rows = parse(req.file.buffer.toString('utf8'), { columns: true, skip_empty_lines: true, trim: true, bom: true });
//     const made = [];
//     for (const row of rows) {
//       const day = String(row.weekday || row.day || '').trim();
//       const date = String(row.date || '').trim();
//       const subject = String(row.subject || row.lecture || '').trim();
//       const startTime = String(row.startTime || row.start || '').trim();
//       const endTime = String(row.endTime || row.end || '').trim();
//       if (!subject || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || endTime <= startTime) continue;
//       // If date is supplied, import that exact date. Otherwise create matching weekday slots for the next 5 weekdays.
//       const dates = date ? [date] : nextDatesForWeekday(day, 5);
//       for (const d of dates) {
//         if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || weekdayFor(d).toLowerCase() !== (date ? weekdayFor(d).toLowerCase() : day.toLowerCase())) continue;
//         const slot = await Slot.create({ date: d, weekday: weekdayFor(d), subject, startTime, endTime, className: row.className || row.class || 'MCA', teacher: row.teacher || 'Teacher', expectedCount: Math.max(0, Number(row.expectedCount || row.students) || 0) });
//         made.push(slot);
//       }
//     }
//     res.json({ message: `Imported ${made.length} lecture slot(s).`, imported: made.length, slots: made });
//   } catch (e) { res.status(400).json({ message: `Could not read timetable CSV: ${e.message}` }); }
// });
// function nextDatesForWeekday(day, count) {
//   const wanted = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(String(day).toLowerCase());
//   if (wanted < 1 || wanted > 5) return [];
//   const result = []; const d = new Date(); d.setHours(12,0,0,0);
//   for (let i = 0; result.length < count && i < 20; i++, d.setDate(d.getDate()+1)) if (d.getDay() === wanted) result.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
//   return result;
// }
// app.post('/api/teachers', async (req, res) => { try { const name = String(req.body.name || '').trim(); if (!name) return res.status(400).json({ message: 'Teacher name required' }); const item = await Teacher.create({ name, email: String(req.body.email || '').trim() }); res.status(201).json({ message: 'Teacher added', teacher: item }); } catch (e) { res.status(500).json({ message: e.message }); } });
// app.delete('/api/teachers/:id', async (req, res) => { try { await Teacher.findByIdAndDelete(req.params.id); res.json({ message: 'Teacher deleted' }); } catch (e) { res.status(500).json({ message: e.message }); } });
// app.post('/api/subjects', async (req, res) => { try { const name = String(req.body.name || '').trim(); if (!name) return res.status(400).json({ message: 'Subject name required' }); const item = await Subject.create({ name, className: req.body.className || 'MCA' }); res.status(201).json({ message: 'Subject added', subject: item }); } catch (e) { res.status(500).json({ message: e.message }); } });
// app.delete('/api/subjects/:id', async (req, res) => { try { await Subject.findByIdAndDelete(req.params.id); res.json({ message: 'Subject deleted' }); } catch (e) { res.status(500).json({ message: e.message }); } });

// (async () => {
//   try {
//     await mongoose.connect(MONGO_URI);
//     console.log('MongoDB connected');
//     app.listen(PORT, '0.0.0.0', () => console.log(`RFID Attendance: http://localhost:${PORT} | API /api/scan`));
//   } catch (e) { console.error('MongoDB connection failed:', e.message); process.exit(1); }
// })();


const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');
const { parse } = require('csv-parse/sync');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');

const PORT = Number(process.env.PORT || 9000);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_attendance';
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const TEACHER_CODE = process.env.TEACHER_CODE || '';   // set this so students cannot register as teachers
const DEVICE_KEY = process.env.DEVICE_KEY || '';       // same key must be in NodeMCU code
const SCAN_MINUTES = Number(process.env.SCAN_MINUTES || 10); // auto scan window at start of each round

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));
app.use('/vendor/chartjs', express.static(path.join(__dirname, 'node_modules/chart.js/dist')));

/* ---------- helpers ---------- */
const pad = n => String(n).padStart(2, '0');
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const weekdayFor = date => DAYS[new Date(`${date}T12:00:00`).getDay()];
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };
const roomKey = v => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const bad = (m, s = 400) => Object.assign(new Error(m), { status: s });
const h = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(e => {
  console.error(e.message);
  res.status(e.status || (e.code === 11000 ? 409 : 500)).json({ message: e.message });
});
const U = (extra = {}) => ({ type: String, trim: true, set: v => String(v ?? '').trim().toUpperCase(), ...extra });

/* ---------- models ---------- */
const Teacher = mongoose.model('Teacher', new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  empCode: U({ required: true, unique: true }),         // employee code from the timetable, e.g. E15037
  isAdmin: { type: Boolean, default: false },           // first account = admin (can import timetable)
  passwordHash: { type: String, required: true }
}, { versionKey: false, timestamps: true }));

const Student = mongoose.model('Student', new mongoose.Schema({
  uid: U({ required: true, unique: true }),
  name: { type: String, required: true, trim: true },
  rollNo: { type: String, default: '', trim: true },
  className: U({ required: true }),                     // e.g. "25MAM-2"
  group: U({ default: '' })                             // "A", "B" or "" (labs are split in groups)
}, { versionKey: false }));

const teacherSub = { _id: false, name: String, code: String };
const slotFields = {
  weekday: String, startTime: String, endTime: String,
  subjectCode: String, subject: String,
  type: { type: String, enum: ['lecture', 'lab'], default: 'lecture' },
  className: U(), room: { type: String, default: '' }, roomKey: { type: String, default: '' }, block: { type: String, default: '' },
  groups: [String],                                     // [] = whole class
  teachers: [teacherSub], teacherCodes: [String]
};
// Institute timetable (one row per class / day / time / group), imported from the aSc PDF
const entrySchema = new mongoose.Schema({ ...slotFields }, { versionKey: false });
entrySchema.index({ teacherCodes: 1 }); entrySchema.index({ className: 1, weekday: 1 });
const Entry = mongoose.model('Entry', entrySchema);

// One real lecture/lab on one date (auto-created from Entry)
const slotSchema = new mongoose.Schema({
  ...slotFields,
  entryId: mongoose.Schema.Types.ObjectId,
  date: { type: String, required: true },
  rounds: { type: Number, default: 1 },                 // lecture = 1 attendance, lab (2 periods) = 2
  scanMinutes: { type: Number, default: 10 },
  manualRound: Number,                                  // teacher-allowed extra scanning
  manualUntil: Date
}, { versionKey: false });
slotSchema.index({ entryId: 1, date: 1 }, { unique: true, partialFilterExpression: { entryId: { $type: 'objectId' } } });
slotSchema.index({ teacherCodes: 1, date: 1 });
slotSchema.index({ className: 1, date: 1 });
const Slot = mongoose.model('Slot', slotSchema);

const attSchema = new mongoose.Schema({
  slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
  round: { type: Number, default: 1 },
  uid: U({ required: true }),
  method: { type: String, enum: ['card', 'manual'], default: 'card' },
  scannedAt: { type: Date, default: Date.now }
}, { versionKey: false });
attSchema.index({ slotId: 1, round: 1, uid: 1 }, { unique: true }); // no duplicate attendance
attSchema.index({ uid: 1 });
const Attendance = mongoose.model('Attendance', attSchema);

/* ---------- scan-window logic ---------- */
// lecture(45m): one window at start. lab(90m): window at start + window at middle.
function windowsOf(s) {
  const a = toMin(s.startTime), b = toMin(s.endTime), n = s.rounds || 1, step = Math.floor((b - a) / n);
  return Array.from({ length: n }, (_, i) => ({ round: i + 1, from: a + i * step, to: Math.min(a + i * step + (s.scanMinutes || SCAN_MINUTES), b) }));
}
function activeRound(s) {
  if (s.date !== todayISO()) return null;
  const m = nowMin();
  if (m < toMin(s.startTime) || m >= toMin(s.endTime)) return null;
  if (s.manualUntil && new Date(s.manualUntil) > new Date()) return s.manualRound || 1;
  const w = windowsOf(s).find(r => m >= r.from && m < r.to);
  return w ? w.round : null;
}
function stateOf(s) {
  const t = todayISO();
  if (activeRound(s)) return 'open';
  if (s.date > t) return 'upcoming';
  if (s.date < t) return 'ended';
  const m = nowMin();
  return m < toMin(s.startTime) ? 'upcoming' : m < toMin(s.endTime) ? 'locked' : 'ended';
}
const allowsGroup = (s, g) => !s.groups || !s.groups.length || s.groups.includes(g || '');
async function ensureSlots(filter, date) {
  const entries = await Entry.find({ ...filter, weekday: weekdayFor(date) }).lean();
  await Promise.all(entries.map(e => {
    const { _id, ...f } = e;
    return Slot.updateOne({ entryId: _id, date }, { $setOnInsert: { ...f, rounds: e.type === 'lab' ? 2 : 1, scanMinutes: SCAN_MINUTES } }, { upsert: true })
      .catch(err => { if (err.code !== 11000) throw err; });
  }));
}
async function slotStats(slots) {
  const ids = slots.map(s => s._id);
  const [perUid, perRound, sizes] = await Promise.all([
    Attendance.aggregate([{ $match: { slotId: { $in: ids } } }, { $group: { _id: { s: '$slotId', u: '$uid' }, n: { $sum: 1 } } }]),
    Attendance.aggregate([{ $match: { slotId: { $in: ids } } }, { $group: { _id: { s: '$slotId', r: '$round' }, n: { $sum: 1 } } }]),
    Student.aggregate([{ $group: { _id: { c: '$className', g: '$group' }, n: { $sum: 1 } } }])
  ]);
  const uidMap = {}, roundMap = {};
  perUid.forEach(r => (uidMap[r._id.s] = uidMap[r._id.s] || []).push(r.n));
  perRound.forEach(r => (roundMap[r._id.s] = roundMap[r._id.s] || {})[r._id.r] = r.n);
  return slots.map(s => {
    const ns = uidMap[s._id] || [];
    const classSize = sizes.filter(x => x._id.c === s.className && allowsGroup(s, x._id.g)).reduce((a, x) => a + x.n, 0);
    return { ...s, classSize, present: ns.filter(n => n >= s.rounds).length, partial: ns.filter(n => n < s.rounds).length,
      roundCounts: roundMap[s._id] || {}, windows: windowsOf(s), activeRound: activeRound(s), state: stateOf(s) };
  });
}

/* ---------- auth ---------- */
const session = t => {
  const user = { id: String(t._id), name: t.name, email: t.email, empCode: t.empCode, isAdmin: !!t.isAdmin };
  return { token: jwt.sign(user, JWT_SECRET, { expiresIn: '7d' }), user };
};
const auth = (req, res, next) => {
  try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), JWT_SECRET); next(); }
  catch { res.status(401).json({ message: 'Please login again' }); }
};
const adminOnly = (req, res, next) => req.user.isAdmin ? next() : res.status(403).json({ message: 'Only the admin (first registered teacher) can do this.' });
const deviceAuth = (req, res, next) => (DEVICE_KEY && req.get('x-device-key') !== DEVICE_KEY) ? res.status(401).json({ message: 'Bad device key' }) : next();

app.post('/api/auth/register', h(async (req, res) => {
  const { name, email, password, code } = req.body || {};
  const empCode = String(req.body?.empCode || '').trim().toUpperCase();
  if (!name || !email || !password || String(password).length < 6) throw bad('Name, email and password (min 6 characters) are required.');
  if (!/^[ER]\d{2,6}$/.test(empCode)) throw bad('Enter your employee code exactly as in the timetable, e.g. E15037.');
  if (TEACHER_CODE && code !== TEACHER_CODE) throw bad('Wrong teacher registration code.', 403);
  if (await Entry.exists({}) && !(await Entry.exists({ teacherCodes: empCode }))) throw bad(`${empCode} is not in the imported timetable. Check the code.`);
  try {
    const t = await Teacher.create({ name, email, empCode, isAdmin: (await Teacher.countDocuments()) === 0, passwordHash: await bcrypt.hash(String(password), 10) });
    res.status(201).json(session(t));
  } catch (e) { if (e.code === 11000) throw bad('This email or employee code is already registered.', 409); throw e; }
}));
app.post('/api/auth/login', h(async (req, res) => {
  const t = await Teacher.findOne({ email: String(req.body?.email || '').toLowerCase().trim() });
  if (!t || !(await bcrypt.compare(String(req.body?.password || ''), t.passwordHash))) throw bad('Wrong email or password.', 401);
  res.json(session(t));
}));
app.get('/api/health', (req, res) => res.json({ ok: true, mongo: mongoose.connection.readyState === 1 }));

/* ---------- RFID scan (called by NodeMCU) ---------- */
// Scanning works ONLY when the student's class has a lecture/lab right now (per timetable),
// inside its scan window (first SCAN_MINUTES of each round) or while the teacher has allowed extra time.
// Room light for the ESP32 LEDs: yellow = teacher allowed extra time, green = scan window open, red = closed / no lecture
app.get('/api/device/status', deviceAuth, h(async (req, res) => {
  const dRoom = roomKey(req.query.room);
  if (!dRoom) throw bad('room is required');
  const date = todayISO();
  await ensureSlots({ roomKey: dRoom }, date);
  const slots = await Slot.find({ date, roomKey: dRoom }).lean();
  const live = slots.map(s => ({ s, r: activeRound(s) })).filter(x => x.r);
  const manual = live.find(x => x.s.manualUntil && new Date(x.s.manualUntil) > new Date());
  const pick = manual || live[0];
  res.json({
    light: manual ? 'yellow' : live.length ? 'green' : 'red',
    subject: pick ? pick.s.subject : '',
    className: pick ? pick.s.className : '',
    until: manual ? manual.s.manualUntil : null
  });
}));

let lastUnknown = null;
app.post('/api/scan', deviceAuth, h(async (req, res) => {
  const uid = String(req.body?.uid || '').trim().toUpperCase().replace(/\s+/g, ' ');
  const dRoom = roomKey(req.body?.room);
  if (!uid || uid.length > 80) throw bad('A valid UID is required');
  const student = await Student.findOne({ uid }).lean();
  if (!student) { lastUnknown = { uid, room: req.body?.room || '', at: new Date() }; return res.status(404).json({ message: 'Card not registered. Ask teacher to add it.', uid }); }
  const date = todayISO();
  await ensureSlots({ className: student.className }, date);
  const all = await Slot.find({ date, className: student.className }).lean();
  const mine = all.filter(s => allowsGroup(s, student.group));
  if (!mine.length && all.length && !student.group) return res.status(423).json({ message: 'Your lab group (A/B) is not set. Ask teacher to update your profile.' });
  const live = mine.map(s => ({ s, r: activeRound(s) })).filter(x => x.r);
  const hit = live.find(x => !dRoom || x.s.roomKey === dRoom);
  if (!hit) {
    if (live.length) return res.status(423).json({ message: `Wrong room. Your lecture is in ${live[0].s.room}.` });
    const m = nowMin(), running = mine.find(s => m >= toMin(s.startTime) && m < toMin(s.endTime));
    return res.status(423).json({ message: running ? `Scanning closed for ${running.subject}. Ask teacher to allow.` : 'No lecture for your class right now.' });
  }
  const { s, r } = hit;
  try { await Attendance.create({ slotId: s._id, round: r, uid }); }
  catch (e) {
    if (e.code === 11000) return res.json({ message: 'Already marked for this lecture', duplicate: true, name: student.name, subject: s.subject, round: r });
    throw e;
  }
  console.log(`[RFID] ${student.name} | ${s.className} | ${s.subject} R${r} | ${date}`);
  res.status(201).json({ message: 'Attendance marked', name: student.name, subject: s.subject, round: r, rounds: s.rounds });
}));

/* ---------- teacher: lectures ---------- */
const ownSlot = async (req) => {
  const filter = req.user.isAdmin ? { _id: req.params.id } : { _id: req.params.id, teacherCodes: req.user.empCode };
  const s = await Slot.findOne(filter);
  if (!s) throw bad('Lecture not found', 404);
  return s;
};

app.get('/api/admin/overview', auth, adminOnly, h(async (req, res) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : todayISO();
  await ensureSlots({}, date);
  const [slots, teachers, classNames, students] = await Promise.all([
    Slot.find({ date }).sort({ startTime: 1, className: 1 }).lean(),
    Teacher.find().select('name email empCode isAdmin').sort({ name: 1 }).lean(),
    Entry.distinct('className'),
    Student.countDocuments()
  ]);
  const enriched = await slotStats(slots);
  const totals = enriched.reduce((out, slot) => {
    out.present += slot.present;
    out.partial += slot.partial;
    out.scans += Object.values(slot.roundCounts).reduce((sum, count) => sum + count, 0);
    if (slot.state === 'open') out.open++;
    return out;
  }, { present: 0, partial: 0, scans: 0, open: 0 });
  res.json({
    date,
    slots: enriched,
    teachers,
    summary: { slots: enriched.length, open: totals.open, present: totals.present, partial: totals.partial, scans: totals.scans, teachers: teachers.length, classes: classNames.length, students }
  });
}));

// Admin: find teachers by name, employee code (e.g. E7981) or email
app.get('/api/admin/teachers/search', auth, adminOnly, h(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ teachers: [] });
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const teachers = await Teacher.find({ $or: [{ name: re }, { empCode: re }, { email: re }] })
    .select('name email empCode isAdmin').sort({ name: 1 }).limit(20).lean();
  res.json({ teachers });
}));

// Admin: one teacher's lectures on one date, class-wise, with present counts
app.get('/api/admin/teachers/:code/day', auth, adminOnly, h(async (req, res) => {
  const code = String(req.params.code).trim().toUpperCase();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : todayISO();
  const teacher = await Teacher.findOne({ empCode: code }).select('name email empCode').lean();
  if (!teacher) throw bad('Teacher not found', 404);
  await ensureSlots({ teacherCodes: code }, date);
  const slots = await Slot.find({ date, teacherCodes: code }).sort({ startTime: 1, className: 1 }).lean();
  const enriched = await slotStats(slots);
  res.json({ teacher, date, weekday: weekdayFor(date), slots: enriched,
    summary: { lectures: enriched.length, present: enriched.reduce((a, s) => a + s.present, 0), classSize: enriched.reduce((a, s) => a + s.classSize, 0) } });
}));

// Admin: one teacher's lectures across a date range (max 31 days), grouped by day
app.get('/api/admin/teachers/:code/range', auth, adminOnly, h(async (req, res) => {
  const code = String(req.params.code).trim().toUpperCase();
  const from = String(req.query.from || ''), to = String(req.query.to || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) throw bad('Choose a valid from and to date.');
  const days = [];
  for (let d = new Date(`${from}T12:00:00`), end = new Date(`${to}T12:00:00`); d <= end && days.length < 31; d.setDate(d.getDate() + 1)) {
    days.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }
  const teacher = await Teacher.findOne({ empCode: code }).select('name email empCode').lean();
  if (!teacher) throw bad('Teacher not found', 404);
  await Promise.all(days.map(day => ensureSlots({ teacherCodes: code }, day)));
  const slots = await Slot.find({ teacherCodes: code, date: { $in: days } }).sort({ date: 1, startTime: 1 }).lean();
  const enriched = await slotStats(slots);
  res.json({ teacher, from, to, days: days.map(date => ({ date, weekday: weekdayFor(date), slots: enriched.filter(s => s.date === date) })) });
}));

app.get('/api/slots', auth, h(async (req, res) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : todayISO();
  await ensureSlots({ teacherCodes: req.user.empCode }, date);
  const slots = await Slot.find({ teacherCodes: req.user.empCode, date }).sort({ startTime: 1, className: 1 }).lean();
  res.json({ date, weekday: weekdayFor(date), slots: await slotStats(slots) });
}));

// Teacher gives extra scan time (e.g. late students) for the current/latest round
app.post('/api/slots/:id/allow', auth, h(async (req, res) => {
  const s = await ownSlot(req);
  if (s.date !== todayISO()) throw bad('Only today\'s lecture can be opened.');
  const m = nowMin(), ws = windowsOf(s);
  if (m < toMin(s.startTime) || m >= toMin(s.endTime)) throw bad('Extra scanning can only be allowed during the scheduled lecture.');
  const requestedMinutes = Math.min(60, Math.max(1, Number(req.body?.minutes) || 10));
  const defaultRound = ([...ws].reverse().find(w => m >= w.from) || ws[0]).round;
  const round = req.body?.round === undefined ? defaultRound : Number(req.body.round);
  if (!Number.isInteger(round) || round < 1 || round > s.rounds) throw bad('Choose a valid attendance round.');
  const nextRoundStart = ws.find(w => w.round === round + 1)?.from ?? toMin(s.endTime);
  const minutes = Math.min(requestedMinutes, Math.max(0, nextRoundStart - m));
  s.manualRound = round; s.manualUntil = new Date(Date.now() + minutes * 60000); await s.save();
  res.json({ message: `Scanning allowed for Round ${round} for ${minutes} min` });
}));
app.post('/api/slots/:id/stop', auth, h(async (req, res) => {
  const s = await ownSlot(req); s.manualUntil = undefined; await s.save(); res.json({ message: 'Extra scanning stopped' });
}));
app.delete('/api/slots/:id', auth, h(async (req, res) => {
  const s = await ownSlot(req); await Attendance.deleteMany({ slotId: s._id }); await s.deleteOne();
  res.json({ message: 'Lecture and its attendance deleted' });
}));

// Past lectures (for the dropdown + trend graph)
app.get('/api/history', auth, h(async (req, res) => {
  const q = { date: { $lte: todayISO() } };
  if (!req.user.isAdmin) q.teacherCodes = req.user.empCode;
  if (req.query.className) q.className = String(req.query.className).toUpperCase();
  if (req.query.subject) q.subject = String(req.query.subject);
  if (req.user.isAdmin && req.query.teacherCode) q.teacherCodes = String(req.query.teacherCode).trim().toUpperCase();
  const slots = await Slot.find(q).sort({ date: -1, startTime: -1 }).limit(300).lean();
  const teacherFilter = req.user.isAdmin ? {} : { teacherCodes: req.user.empCode };
  const [classes, subjects, teachers] = await Promise.all([
    Slot.distinct('className', teacherFilter),
    Slot.distinct('subject', teacherFilter),
    req.user.isAdmin ? Teacher.find().select('name empCode').sort({ name: 1 }).lean() : Promise.resolve([])
  ]);
  res.json({ slots: await slotStats(slots), filters: { classes: classes.sort(), subjects: subjects.sort(), teachers } });
}));

app.get('/api/slots/:id/report', auth, h(async (req, res) => {
  const s = (await ownSlot(req)).toObject();
  const [all, recs] = await Promise.all([Student.find({ className: s.className }).lean(), Attendance.find({ slotId: s._id }).lean()]);
  const students = all.filter(x => allowsGroup(s, x.group));
  students.sort((a, b) => (a.rollNo || '').localeCompare(b.rollNo || '', undefined, { numeric: true }) || a.name.localeCompare(b.name));
  const got = {}; recs.forEach(r => (got[r.uid] = got[r.uid] || {})[r.round] = r);
  const rows = students.map(st => {
    const rd = Array.from({ length: s.rounds }, (_, i) => !!(got[st.uid] || {})[i + 1]), n = rd.filter(Boolean).length;
    return { uid: st.uid, name: st.name, rollNo: st.rollNo, group: st.group, rounds: rd, status: n === s.rounds ? 'present' : n ? 'partial' : 'absent' };
  });
  const count = k => rows.filter(r => r.status === k).length;
  res.json({ slot: s, rows, summary: { classSize: rows.length, present: count('present'), partial: count('partial'), absent: count('absent') } });
}));

// Teacher fixes a record by hand (lost card, mistaken scan)
app.post('/api/slots/:id/mark', auth, h(async (req, res) => {
  const s = await ownSlot(req); const uid = String(req.body?.uid || '').toUpperCase();
  const rounds = req.body?.round === 'all' ? Array.from({ length: s.rounds }, (_, i) => i + 1) : [Number(req.body?.round) || 1];
  for (const round of rounds) {
    if (req.body?.present) await Attendance.updateOne({ slotId: s._id, round, uid }, { $setOnInsert: { method: 'manual', scannedAt: new Date() } }, { upsert: true });
    else await Attendance.deleteOne({ slotId: s._id, round, uid });
  }
  res.json({ message: req.body?.present ? 'Marked present' : 'Marked absent' });
}));

/* ---------- file helpers ---------- */
function readRows(buf, filename) {
  const name = String(filename || '').toLowerCase(); let rows;
  if (name.endsWith('.csv')) rows = parse(buf.toString('utf8'), { columns: true, skip_empty_lines: true, trim: true, bom: true });
  else if (/\.xlsx?$/.test(name)) { const wb = XLSX.read(buf, { type: 'buffer' }); rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false }); }
  else throw bad('Upload a .csv or .xlsx file.');
  return rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [String(k).toLowerCase().replace(/[^a-z0-9]/g, ''), typeof v === 'string' ? v.trim() : v])));
}
const pick = (r, ...keys) => { for (const k of keys) if (r[k] !== undefined && String(r[k]).trim() !== '') return String(r[k]).trim(); return ''; };

/* ---------- students ---------- */
const normGroup = g => { g = String(g || '').trim().toUpperCase(); return g === 'A' || g === 'B' ? g : ''; };
app.get('/api/students', auth, h(async (req, res) => {
  const assignedClasses = req.user.isAdmin ? null : await Entry.distinct('className', { teacherCodes: req.user.empCode });
  const className = req.query.className ? String(req.query.className).toUpperCase() : '';
  const q = assignedClasses
    ? { className: { $in: assignedClasses, ...(className ? { $eq: className } : {}) } }
    : className ? { className } : {};
  const students = await Student.find(q).lean();
  students.sort((a, b) => a.className.localeCompare(b.className) || (a.rollNo || '').localeCompare(b.rollNo || '', undefined, { numeric: true }));
  const classes = req.user.isAdmin
    ? [...new Set([...(await Student.distinct('className')), ...(await Entry.distinct('className'))])].sort()
    : assignedClasses.sort();
  res.json({ students, classes });
}));
app.post('/api/students', auth, h(async (req, res) => {
  const { uid, name, rollNo, className } = req.body || {};
  if (!uid || !name || !className) throw bad('UID, name and class are required.');
  const normalizedClass = String(className).trim().toUpperCase();
  if (!req.user.isAdmin && !(await Entry.exists({ className: normalizedClass, teacherCodes: req.user.empCode }))) {
    throw bad('You can only add students to classes in your timetable.', 403);
  }
  res.status(201).json({ message: 'Student saved', student: await Student.findOneAndUpdate({ uid: String(uid).trim().toUpperCase().replace(/\s+/g, ' ') }, { $set: { name, rollNo: rollNo || '', className: normalizedClass, group: normGroup(req.body.group) } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }) });
}));
app.delete('/api/students/:id', auth, h(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw bad('Student not found', 404);
  if (!req.user.isAdmin && !(await Entry.exists({ className: student.className, teacherCodes: req.user.empCode }))) {
    throw bad('You can only remove students from classes in your timetable.', 403);
  }
  await student.deleteOne();
  res.json({ message: 'Student deleted' });
}));
app.post('/api/students/upload', auth, upload.single('file'), h(async (req, res) => {
  if (!req.file) throw bad('Choose a .csv or .xlsx file.');
  const ops = []; let skipped = 0;
  for (const r of readRows(req.file.buffer, req.file.originalname)) {
    const uid = pick(r, 'uid', 'cardid', 'rfid').toUpperCase().replace(/\s+/g, ' '), name = pick(r, 'name', 'studentname'), className = pick(r, 'classname', 'class');
    if (!uid || !name || !className) { skipped++; continue; }
    ops.push({ updateOne: { filter: { uid }, update: { $set: { uid, name, rollNo: pick(r, 'rollno', 'roll', 'rollnumber'), className: className.toUpperCase(), group: normGroup(pick(r, 'group', 'labgroup')) } }, upsert: true } });
  }
  if (!req.user.isAdmin && ops.length) {
    const allowedClasses = await Entry.distinct('className', { teacherCodes: req.user.empCode });
    const disallowedClass = ops.find(op => !allowedClasses.includes(op.updateOne.update.$set.className));
    if (disallowedClass) throw bad('You can only upload students for classes in your timetable.', 403);
  }
  if (ops.length) await Student.bulkWrite(ops);
  res.json({ message: `${ops.length} student(s) saved${skipped ? `, ${skipped} row(s) skipped (uid/name/class missing)` : ''}.` });
}));
app.get('/api/students/unknown', auth, (req, res) => res.json({ card: lastUnknown && Date.now() - lastUnknown.at < 10 * 60000 ? lastUnknown : null }));

// One student's full record (my lectures, or all teachers' lectures)
app.get('/api/students/:uid/report', auth, h(async (req, res) => {
  const student = await Student.findOne({ uid: String(req.params.uid).toUpperCase() }).lean();
  if (!student) throw bad('Student not found', 404);
  if (req.query.scope === 'all' && !req.user.isAdmin) throw bad('Only the admin can view attendance across all teachers.', 403);
  const q = { className: student.className, date: { $lte: todayISO() } };
  if (req.query.scope !== 'all') q.teacherCodes = req.user.empCode;
  const m = nowMin(), t = todayISO();
  const slots = (await Slot.find(q).sort({ date: -1, startTime: -1 }).lean()).filter(s => allowsGroup(s, student.group) && (s.date < t || toMin(s.startTime) <= m));
  const recs = await Attendance.aggregate([{ $match: { uid: student.uid, slotId: { $in: slots.map(s => s._id) } } }, { $group: { _id: '$slotId', n: { $sum: 1 } } }]);
  const att = Object.fromEntries(recs.map(r => [String(r._id), r.n]));
  const lectures = slots.map(s => { const n = Math.min(att[String(s._id)] || 0, s.rounds); return { _id: s._id, date: s.date, startTime: s.startTime, endTime: s.endTime, subject: s.subject, type: s.type, teacher: (s.teachers || []).map(x => x.name).join(' / '), rounds: s.rounds, attended: n, status: n === s.rounds ? 'present' : n ? 'partial' : 'absent' }; });
  const bySub = {};
  lectures.forEach(l => { const k = l.subject + (l.type === 'lab' ? ' (Lab)' : ''); const x = bySub[k] = bySub[k] || { subject: k, total: 0, score: 0 }; x.total++; x.score += l.attended / l.rounds; });
  const subjects = Object.values(bySub).map(x => ({ ...x, percent: Math.round(x.score / x.total * 100) }));
  const total = lectures.length, score = lectures.reduce((a, l) => a + l.attended / l.rounds, 0);
  res.json({ student, lectures, subjects, overall: { total, attended: Math.round(score * 10) / 10, percent: total ? Math.round(score / total * 100) : 0 } });
}));

/* ---------- institute timetable ---------- */
function parseDay(v) { const k = String(v || '').trim().toLowerCase().slice(0, 3); const i = k.length === 3 ? DAYS.findIndex(d => d.toLowerCase().startsWith(k)) : -1; return i >= 1 && i <= 6 ? DAYS[i] : null; }
function parseTime(v) {
  const m = String(v || '').trim().match(/^(\d{1,2})\s*[:.]\s*(\d{2})(?::\d{2})?\s*([ap]m)?$/i); if (!m) return null;
  let hr = +m[1]; const mi = +m[2], ap = (m[3] || '').toLowerCase();
  if (ap === 'pm' && hr < 12) hr += 12; if (ap === 'am' && hr === 12) hr = 0;
  return hr > 23 || mi > 59 ? null : `${pad(hr)}:${pad(mi)}`;
}
function rowToEntry(r) {
  const weekday = parseDay(pick(r, 'day', 'weekday')), startTime = parseTime(pick(r, 'starttime', 'start', 'from')), endTime = parseTime(pick(r, 'endtime', 'end', 'to'));
  const subject = pick(r, 'subject'), className = pick(r, 'classname', 'class').toUpperCase();
  const codes = pick(r, 'teachercodes', 'teachercode').split(/[;,]/).map(x => x.trim().toUpperCase()).filter(Boolean);
  if (!weekday || !startTime || !endTime || endTime <= startTime || !subject || !className || !codes.length) return null;
  const names = pick(r, 'teachers', 'teacher').split('/').map(x => x.trim());
  const t = pick(r, 'type').toLowerCase();
  const type = t ? (t.includes('lab') ? 'lab' : 'lecture') : (toMin(endTime) - toMin(startTime) >= 75 ? 'lab' : 'lecture');
  const room = pick(r, 'room', 'roomno');
  return { weekday, startTime, endTime, subjectCode: pick(r, 'subjectcode', 'code'), subject, type, className, room, roomKey: roomKey(room), block: pick(r, 'block'),
    groups: pick(r, 'groups', 'group').split(/[,;]/).map(normGroup).filter(Boolean), teachers: codes.map((c, i) => ({ name: names[i] || c, code: c })), teacherCodes: codes };
}
// The aSc "Classwise" PDF is converted by public/Parsetimetable.py (needs Python + pdfplumber).
function pdfToCsv(buf) {
  return new Promise((resolve, reject) => {
    const tmp = path.join(os.tmpdir(), `tt_${Date.now()}`), script = path.join(__dirname, 'public', 'Parsetimetable.py');
    fs.writeFileSync(tmp + '.pdf', buf);
    const cleanup = () => { for (const f of [tmp + '.pdf', tmp + '.csv']) fs.existsSync(f) && fs.unlinkSync(f); };
    const tryNext = cmds => {
      const cmd = cmds.shift();
      if (!cmd) { cleanup(); return reject(bad('Python was not found. Install Python and run "python -m pip install pdfplumber", or upload the timetable as CSV/Excel instead.')); }
      execFile(cmd, [script, tmp + '.pdf', tmp + '.csv'], { timeout: 180000 }, err => {
        if (err && err.code === 'ENOENT') return tryNext(cmds);
        if (err) { const m = String(err.stderr || err.message).slice(-300); cleanup(); return reject(bad(`PDF could not be read (${m}). Run: pip install pdfplumber`)); }
        const out = fs.readFileSync(tmp + '.csv'); cleanup(); resolve(out);
      });
    };
    tryNext(['python3', 'python', 'py']);
  });
}
app.get('/api/timetable', auth, h(async (req, res) => {
  const e = await Entry.find(req.user.isAdmin ? {} : { teacherCodes: req.user.empCode }).lean();
  e.sort((a, b) => DAYS.indexOf(a.weekday) - DAYS.indexOf(b.weekday) || a.startTime.localeCompare(b.startTime));
  res.json({ entries: e, total: e.length, classes: new Set(e.map(x => x.className)).size });
}));
app.post('/api/timetable/import', auth, adminOnly, upload.single('file'), h(async (req, res) => {
  if (!req.file) throw bad('Choose the timetable PDF or CSV.');
  const nm = req.file.originalname.toLowerCase();
  const rows = nm.endsWith('.pdf') ? readRows(await pdfToCsv(req.file.buffer), 'x.csv') : readRows(req.file.buffer, req.file.originalname);
  const entries = rows.map(rowToEntry).filter(Boolean);
  if (!entries.length) throw bad('No valid rows. Needed columns: className, day, startTime, endTime, subject, teacherCodes (room, groups, type optional).');
  await Entry.deleteMany({});
  // drop not-yet-used future slots so the new timetable takes effect (slots that already have attendance are kept)
  await Slot.deleteMany({ date: { $gte: todayISO() }, entryId: { $exists: true }, _id: { $nin: await Attendance.distinct('slotId') } });
  await Entry.insertMany(entries);
  res.json({ message: `Timetable imported: ${entries.length} lectures/labs for ${new Set(entries.map(e => e.className)).size} classes, ${new Set(entries.flatMap(e => e.teacherCodes)).size} teachers.`, skipped: rows.length - entries.length });
}));
app.get('/students-template.csv', (req, res) => { res.attachment('students-template.csv').type('text/csv').send('uid,name,rollNo,className,group\n04 A3 1B 2C,Rahul Sharma,1,25MAM-2,B\n'); });

/* ---------- live scanner devices (ESP32 reports power + scan results) ---------- */
const devices = new Map(); // roomKey -> live state, kept in memory, refreshed by the device every 5 s

app.post('/api/device/report', deviceAuth, (req, res) => {
  const body = req.body || {};
  const room = String(body.room || '').trim();
  const key = roomKey(room);
  if (!key) return res.status(400).json({ message: 'room is required' });

  const d = devices.get(key) || { room, power: 'off', events: [] };
  d.room = room;
  d.power = body.power === 'on' ? 'on' : 'off';
  d.lastSeen = new Date();

  if (body.event) {
    const ev = {
      type: String(body.event).slice(0, 20),
      uid: String(body.uid || '').slice(0, 40),
      name: String(body.name || '').slice(0, 80),
      at: new Date()
    };
    d.lastEvent = ev;
    d.events = [ev, ...(d.events || [])].slice(0, 15);
  }
  devices.set(key, d);
  res.json({ ok: true });
});

app.get('/api/devices', auth, (req, res) => {
  const now = Date.now();
  res.json({
    devices: [...devices.values()].map(d => ({
      ...d,
      online: now - new Date(d.lastSeen).getTime() < 15000
    }))
  });
});

/* ---------- start ---------- */
(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');
    app.listen(PORT, '0.0.0.0', () => console.log(`Smart Attendance: http://localhost:${PORT} | device API: POST /api/scan`));
  } catch (e) { console.error('MongoDB connection failed:', e.message); process.exit(1); }
})();