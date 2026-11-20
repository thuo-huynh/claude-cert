"""Build data/*.json from the MIT source repo cloned at content/raw/source.

Usage: python scripts/build_data.py
Re-run after updating the source clone. Vietnamese overlays in data/vi/ are never touched.
"""
import json, os, re

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'content', 'raw', 'source')
OUT = os.path.join(ROOT, 'data')
ANSWER_OVERRIDES = {'ccao-f-p5': ['B']}  # read from the rationale text by hand
CERTS = {  # source folder -> our code
    'associate-foundations': ('ccao-f', 'Associate – Foundations'),
    'developer-foundations': ('ccdv-f', 'Developer – Foundations'),
    'architect-foundations': ('ccar-f', 'Architect – Foundations'),
    'architect-professional': ('ccar-p', 'Architect – Professional'),
}


def read(*p):
    return open(os.path.join(SRC, *p), encoding='utf-8').read()


def norm(s):
    return re.sub(r'[^a-z]', '', s.lower().replace('&', 'and'))


def md_table(text, header_first_cell):
    """Rows (list of cells) of the first markdown table whose header starts with header_first_cell."""
    lines = text.splitlines()
    for i, l in enumerate(lines):
        cells = [c.strip() for c in l.strip().strip('|').split('|')]
        if l.startswith('|') and cells[0] == header_first_cell:
            rows = []
            for r in lines[i + 2:]:
                if not r.startswith('|'):
                    break
                rows.append([c.strip() for c in r.strip().strip('|').split('|')])
            return rows
    raise ValueError(f'table {header_first_cell!r} not found')


def parse_options(block):
    opts = re.findall(r'^- ([A-F])\. (.+)$', block, re.M)
    assert len(opts) >= 4, block[:200]
    return [{'k': k, 't': t.strip()} for k, t in opts]


def answer_keys(s):
    return re.findall(r'[A-F]', s)


def build(folder, code, name):
    readme = read(folder, 'README.md')
    facts = {r[0]: r[1] for r in md_table(readme, 'Item')}
    domains = [{'n': int(r[0]), 'name': r[1], 'weight': r[2]} for r in md_table(readme, '#')]
    by_name = {norm(d['name']): d['n'] for d in domains}

    def dom(label):
        n = by_name.get(norm(label))
        assert n, f'{code}: unknown domain {label!r}'
        return n

    questions = []
    # practice: "**N. Domain.** stem", options, <details> with "**A.** rationale"
    prac = read(folder, 'practice-questions.md')
    for m in re.finditer(r'^\*\*(\d+)\. (.+?)\.\*\* (.+?)\n\n(.*?)<details><summary>.*?</summary>\s*(.*?)</details>', prac, re.M | re.S):
        n, label, stem, opt_block, rat = m.groups()
        rat = rat.strip()
        qid = f'{code}-p{n}'
        km = re.match(r'\*\*([A-F](?:\s*(?:,|and)\s*[A-F])*)\.\*\*\s*', rat)
        if km:
            answer, why = answer_keys(km.group(1)), rat[km.end():].strip()
        else:  # a rationale that discusses every option instead of leading with the key
            assert qid in ANSWER_OVERRIDES, f'{qid}: rationale has no answer'
            answer, why = ANSWER_OVERRIDES[qid], rat
        scenario, _, dlabel = label.rpartition(': ')  # CCAR-F labels read "Scenario: Domain"
        q = {'id': qid, 'set': 'practice', 'n': int(n), 'domain': dom(dlabel),
             'q': stem.strip(), 'options': parse_options(opt_block), 'answer': answer, 'why': why}
        if scenario:
            q['scenario'] = scenario
        questions.append(q)
    assert sum(q['set'] == 'practice' for q in questions) == len(re.findall(r'^\*\*\d+\. ', prac, re.M)), f'{code}: practice count'

    for k in (1, 2, 3):
        mock = read(folder, f'mock-exam-{k}.md')
        key = {int(r[0]): r for r in md_table(mock, '#')}
        body = mock.split('## Answer key')[0]
        found = re.findall(r'^\*\*(\d+)\.\*\* (.+?)\n\n((?:- [A-F]\. .+\n?)+)', body, re.M)
        assert len(found) == len(key), f'{code} mock{k}: {len(found)} questions vs {len(key)} keys'
        # CCAR-F groups mock questions under "## Scenario X: name" with a one-paragraph setup
        scen = {}
        for sm in re.finditer(r'^## Scenario [A-Z]: (.+?)\n\n(.*?)\n\n(?=\*\*\d+\.\*\*)', body, re.M | re.S):
            scen[sm.start()] = (sm.group(1).strip(), sm.group(2).strip())
        for qm in re.finditer(r'^\*\*(\d+)\.\*\* (.+?)\n\n((?:- [A-F]\. .+\n?)+)', body, re.M):
            n, stem, opt_block = qm.groups()
            r = key[int(n)]
            q = {'id': f'{code}-m{k}-{n}', 'set': f'mock{k}', 'n': int(n), 'domain': dom(r[2]),
                 'q': stem.strip(), 'options': parse_options(opt_block), 'answer': answer_keys(r[1]), 'why': r[3]}
            before = [p for p in scen if p < qm.start()]
            if before:
                q['scenario'], q['scenarioIntro'] = scen[max(before)]
            questions.append(q)
        minutes = re.search(r'(\d+) questions, (\d+) minutes', mock)

    for q in questions:
        keys = {o['k'] for o in q['options']}
        assert q['answer'] and set(q['answer']) <= keys, q['id']

    return {
        'code': code, 'name': name, 'examCode': facts.get('Exam code'),
        'facts': {'questions': facts.get('Questions'), 'time': facts.get('Time limit'), 'passing': facts.get('Passing score'),
                  'fee': facts.get('Fee'), 'validity': facts.get('Validity'), 'prerequisites': facts.get('Prerequisites')},
        'mockMinutes': int(minutes.group(2)) if minutes else 30,
        'domains': domains,
        'questions': questions,
        'cheatSheet': read(folder, 'cheat-sheet.md'),
        'notes': read(folder, 'notes.md'),
    }


def main():
    os.makedirs(os.path.join(OUT, 'vi'), exist_ok=True)
    certs = []
    for folder, (code, name) in CERTS.items():
        d = build(folder, code, name)
        json.dump(d, open(os.path.join(OUT, f'{code}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        vi = os.path.join(OUT, 'vi', f'{code}.json')
        if not os.path.exists(vi):
            json.dump({}, open(vi, 'w', encoding='utf-8'))
        sets = {}
        for q in d['questions']:
            sets[q['set']] = sets.get(q['set'], 0) + 1
        print(code, sets, 'domains', len(d['domains']))
        certs.append({'code': code, 'name': name, 'examCode': d['examCode'], 'facts': d['facts'], 'total': len(d['questions'])})

    cards = json.load(open(os.path.join(SRC, '.github', 'assets', 'flashcards.json'), encoding='utf-8'))['cards']
    tag2code = {f: c for f, (c, _) in CERTS.items()}
    for i, c in enumerate(cards):
        c['id'] = f'fc{i + 1}'
        c['certs'] = [tag2code[t] for t in c.get('tags', []) if t in tag2code]
    json.dump(cards, open(os.path.join(OUT, 'flashcards.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(certs, open(os.path.join(OUT, 'certs.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('flashcards', len(cards))


if __name__ == '__main__':
    main()
