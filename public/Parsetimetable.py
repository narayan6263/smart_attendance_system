#!/usr/bin/env python3
"""
Convert an aSc Timetables "Classwise" PDF into a CSV that the Smart Attendance
dashboard can import (Timetable tab -> Import institute timetable).

Usage:  pip install pdfplumber
        python public/Parsetimetable.py Classwise_27-9-2026_.pdf timetable.csv
"""
import csv, re, sys
from collections import Counter, defaultdict
import pdfplumber

DAYS = {'Mo': 'Monday', 'Tu': 'Tuesday', 'We': 'Wednesday', 'Th': 'Thursday', 'Fr': 'Friday', 'Sa': 'Saturday'}
TITLE = r'(?<![A-Za-z])(?:Mr|Mrs|Ms|Dr|Er)(?:\.|\s)'
STOP = {'of', 'and', 'for', 'with', 'in', 'the', 'to'}

def join_lines(lines):
    out = ''
    for ln in lines:
        ln = ln.strip()
        if not ln:
            continue
        if not out:
            out = ln
        elif ln[0].islower() and ln.split()[0] not in STOP:   # word broken across lines: "Containeriza|tion"
            out += ln
        else:
            out += ' ' + ln
    return out

def fix_wrapped_codes(lines):
    res = []
    for ln in lines:
        if res and re.fullmatch(r'\d', ln.strip()) and re.search(r'_[ER]\d+$', res[-1].strip()):
            res[-1] = res[-1].strip() + ln.strip()           # "E1345|3" -> "E13453"
        else:
            res.append(ln)
    return res

def parse_cell(text):
    lines = fix_wrapped_codes([l for l in text.split('\n') if l.strip()])
    flat = '\n'.join(lines)
    m = re.search(r'(\d{2}[A-Z]{3}-\d{3})_', flat)
    if not m:
        return None
    rest = flat[m.end():]
    codes = list(re.finditer(r'_[ER]\d+', rest))
    cut = codes[-1].end() if codes else len(rest)
    prefix = join_lines(rest[cut:].split('\n'))          # room line comes after the teachers in the PDF text stream
    head = rest[:cut]
    t = re.search(TITLE, head)
    if t:
        subject, teach = join_lines(head[:t.start()].split('\n')), head[t.start():]
    else:
        rl = head.split('\n'); subject, teach = join_lines(rl[:-2]), ' '.join(rl[-2:])
    teachers = []
    for name, code in re.findall(r'((?:Mr|Mrs|Ms|Dr|Er)[^_/]*?)_([ER]\d+)', teach.replace('\n', ' ')):
        teachers.append((re.sub(r'\s+', ' ', name).strip(' /'), code))
    # room / block / group
    room, block, group = prefix, '', ''
    b = re.search(r'_?\s*Block-?E?(\w?)(\d?)', prefix)
    pm = re.match(r'^(.*?)_?\s*Block-?(E\d|EA\d|E\w?)\s*(.*)$', prefix)
    if pm:
        room, block, group = pm.group(1), pm.group(2), pm.group(3)
    # fix "Block-EA2" produced by interleaved text: letter A/B belongs to group
    mb = re.match(r'^E([AB])(\d)$', block)
    if mb:
        block, group = 'E' + mb.group(2), mb.group(1) + ' ' + group
    mb = re.match(r'^E(\d)([AB])?$', block)
    if mb and mb.group(2):
        block, group = 'E' + mb.group(1), mb.group(2) + ' ' + group
    room = re.sub(r'\s*-\s*', '-', re.sub(r'\s+', ' ', room.strip(' _')))
    # room name may be split "SoftSkills Lab A -105": move stray group letter out
    sm = re.match(r'^(.*?)\s+([AB])\s*(-\d+)$', room)
    if sm:
        room, group = sm.group(1) + sm.group(3), sm.group(2) + ' ' + group
    room = re.sub(r'\s*-\s*', '-', room)
    if re.search(r'Entire class', group, re.I):
        groups = []
    else:
        groups = sorted(set(re.findall(r'[AB]', group)))
    return dict(code=m.group(1), subject=subject, room=room, block=block, groups=groups, teachers=teachers)

def parse_pdf(path):
    rows = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            cls = next((w['text'] for w in page.extract_words() if w['top'] < 45 and re.fullmatch(r'\d{2}M[A-Z]{2}-\d+', w['text'])), None)
            tables = page.find_tables()
            if not cls or not tables:
                continue
            t = max(tables, key=lambda x: len(x.rows))
            # period columns from the header row
            periods = {}
            for r in t.rows:
                for c in r.cells:
                    if not c: continue
                    tx = page.crop(c).extract_text() or ''
                    pm = re.match(r'^(\d)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$', tx.strip().replace('\n', ' '))
                    if pm:
                        periods[int(pm.group(1))] = ((c[0] + c[2]) / 2, pm.group(2).zfill(5), pm.group(3).zfill(5))
            # day bands from the first column
            bands = []
            for r in t.rows:
                c = r.cells[0]
                if c:
                    tx = (page.crop(c).extract_text() or '').strip()
                    if tx in DAYS:
                        bands.append((c[1], c[3], DAYS[tx]))
            seen = set()
            for r in t.rows:
                for c in r.cells:
                    if not c or c[0] < 85 or c[1] < bands[0][0] - 1 or tuple(c) in seen: continue
                    seen.add(tuple(c))
                    tx = page.crop(c).extract_text(use_text_flow=True) or ''
                    if not tx.strip() or tx.strip().startswith('Lunch'): continue
                    cy = (c[1] + c[3]) / 2
                    band = next((b for b in bands if b[0] <= cy <= b[1]), None)
                    cov = sorted(n for n, (cx, _, _) in periods.items() if c[0] <= cx <= c[2])
                    info = parse_cell(tx)
                    if not band or not cov or not info:
                        print(f'  ! skipped cell on {cls}: {tx[:50]!r}', file=sys.stderr); continue
                    if not info['groups'] and not re.search('Entire class', tx) and (c[3] - c[1]) < (band[1] - band[0]) * 0.7:
                        info['groups'] = ['A'] if cy < (band[0] + band[1]) / 2 else ['B']   # half-height cell without a letter
                    rows.append(dict(className=cls, day=band[2], startTime=periods[cov[0]][1], endTime=periods[cov[-1]][2], span=len(cov), **info))
    return rows

def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    rows = parse_pdf(sys.argv[1])
    # pick the cleanest spelling of every subject code (fewest words = no broken words)
    names = defaultdict(list)
    for r in rows: names[r['code']].append(r['subject'])
    best = {k: sorted(Counter(v).items(), key=lambda kv: (len(kv[0].split()), -kv[1]))[0][0] for k, v in names.items()}
    with open(sys.argv[2], 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['className', 'day', 'startTime', 'endTime', 'type', 'subjectCode', 'subject', 'room', 'block', 'groups', 'teachers', 'teacherCodes'])
        for r in sorted(rows, key=lambda r: (r['className'], list(DAYS.values()).index(r['day']), r['startTime'])):
            w.writerow([r['className'], r['day'], r['startTime'], r['endTime'], 'lab' if r['span'] >= 2 else 'lecture', r['code'], best[r['code']],
                        r['room'], r['block'], ','.join(r['groups']), ' / '.join(n for n, _ in r['teachers']), ';'.join(c for _, c in r['teachers'])])
    print(f'{len(rows)} lectures/labs from {len({r["className"] for r in rows})} classes -> {sys.argv[2]}')

if __name__ == '__main__':
    main()