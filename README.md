# NovaID Smart RFID Attendance

Smart attendance for multiple classes, teachers, rooms, and RFID readers. An admin imports the institute timetable once; the timetable assigns each class/lecture to its teacher by employee code. Teachers then see their own lecture schedule and class reports, while the admin can view all classes and teachers.

## Run locally on Windows

1. Install Node.js and MongoDB Community Server and make sure the MongoDB service is running.
2. Open PowerShell in this folder.
3. Run `npm install` (first run only).
4. Run `npm start`.
5. Open `http://localhost:8000`.
6. Register the first teacher account before importing the timetable. The first account becomes the admin account. Use its timetable employee code too if the admin also teaches.
7. Sign in as admin and upload the timetable. Teachers can then register using their employee codes from the timetable.

The default database is `mongodb://127.0.0.1:27017/smart_attendance`. Set `MONGO_URI` before starting if you use a different MongoDB database. Set `JWT_SECRET` to a private random value for a real deployment. If `TEACHER_CODE` is configured, a teacher must enter that code to register. If `DEVICE_KEY` is configured, put the same value in the ESP8266 firmware.

## Timetable and teacher assignment

On the admin dashboard, upload a timetable as CSV, Excel (`.xlsx`/`.xls`), or the supported aSc Classwise PDF. The ready-to-use template is [`timetable-template.csv`](./timetable-template.csv). Required columns:

| Column | Meaning |
| --- | --- |
| `className` | Class identifier, e.g. `25MAM-2B` |
| `day` | Weekday, e.g. `Monday` |
| `startTime`, `endTime` | 24-hour time, e.g. `09:55`, `10:40` |
| `subject` | Subject or lecture name |
| `teacherCodes` | One or more teacher employee codes; separate multiple codes with `;` |

Optional columns include `type` (`lecture`/`lab`), `room`, `groups` (`A`/`B` for lab groups), `teachers` (names in the same order as the codes), `subjectCode`, and `block`. If `type` is omitted, a timetable entry lasting at least 75 minutes is treated as a lab. Each teacher account's employee code is matched against `teacherCodes`, so each teacher sees the lectures assigned to them. Room names from the timetable should match the `roomCode` configured on the RFID device for that room.

For PDF import, install Python and `pdfplumber` (`python -m pip install pdfplumber`). The built-in parser supports the aSc Classwise PDF layout; for another timetable format, convert it to the CSV template first.

## Attendance windows and duplicate protection

- A 45-minute lecture accepts automatic scans during its first 10 minutes. For example, a 09:55–10:40 lecture accepts scans from 09:55 to 10:05.
- A 90-minute lab has two rounds: the first 10-minute window at the start, and the first 10-minute window 45 minutes later. Each round records attendance separately.
- The teacher can use **Allow scanning** to give late students extra scan time and can stop the extra window.
- Students can only scan when their class has a scheduled session in the device's room. Lab group A/B restrictions are applied from the timetable and student roster.
- A card UID cannot be counted twice in the same lecture round. A lab student may scan once in each of the two rounds.

## Admin and teacher dashboards

- **Admin:** institute-wide daily schedule and present counts, all teacher accounts, timetable upload, class/subject/teacher-filtered lecture reports, class rosters, and full student attendance history by RFID UID.
- **Teacher:** assigned daily lectures, scan-window controls, their timetable, student roster for their assigned classes, lecture attendance reports, and student history for their own lectures.
- Lecture reports show present, absent, and (for labs) partial attendance. Student reports show attendance by lecture and subject.
- Add students in the dashboard or upload a CSV/XLSX with `uid,name,rollNo,className,group`. The student's class and optional lab group must match the timetable.

## ESP8266 + MFRC522

Configure Wi-Fi, `serverUrl`, and the room code in [`firmware/esp8266_rfid.ino`](./firmware/esp8266_rfid.ino). Each reader should send the same room name/key that appears in the timetable. If the server uses `DEVICE_KEY`, set `deviceKey` to the same value in the firmware.

Wiring: RC522 SDA/SS → D2, SCK → D5, MOSI → D7, MISO → D6, RST → D1, GND → GND, 3.3V → 3V3. Do not power the RC522 from 5V. Keep the laptop and NodeMCU on the same Wi-Fi/hotspot and allow Node.js through Windows Firewall on private networks.

## Demo data

The `demo/` folder has sample data for testing:

- `demo/demo-timetable-24h.csv`: same as below but with lectures every hour from 00:00 to 23:50, Monday to Saturday. Use this for testing at any time, including night.
- `demo/demo-timetable.csv`: 2 classes (25MAM-2, 25MCA-1), 3 teachers (E7981, E15037, E22041), Monday to Friday, 1-hour gaps from 09:00 to 16:00, room R101.
- `demo/demo-students.csv`: 8 students with sample card UIDs.
- `demo/demo-scan.ps1`: sends card scans to the server like the RFID reader does.

Demo steps:

1. Start the server and register a teacher with code `E7981` (first account = admin).
2. Log in as admin, open **Institute timetable**, and upload `demo/demo-timetable.csv`.
3. Register the other teachers with codes `E15037` and `E22041` (they must match the timetable).
4. Open **Students** and upload `demo/demo-students.csv`.
5. During a lecture (for example 09:00–09:50 on a weekday), run `.\demo\demo-scan.ps1`. Students will be marked present. The last card is unregistered and will show as an unknown card.
6. To test late students, go to **My lectures**, click **Allow scanning**, and scan again after 10 minutes.

To replace the timetable with a new one, upload the new file in **Institute timetable**. The old lectures without attendance are removed, and past attendance records are kept.
