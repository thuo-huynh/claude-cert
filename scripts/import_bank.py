"""Import the owner's question bank (a saved "Claude Cert Practice" HTML page with an embedded DATA object).

  python scripts/import_bank.py "<path to Claude-Cert-Practice.html>"

Replaces the questions of CCAR-F, CCAO-F and CCDV-F in data/<cert>.json (facts, domains, cheat sheet
and notes are kept) and writes the bank's Vietnamese text into data/vi/<cert>.json. Hand-written fields
already in the overlay (domain, lesson, tip, ask) are kept for questions that still exist.
CCAR-P is not in the bank and is left untouched.
"""
import html, json, os, re, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
BANK = {'ccaf': 'ccar-f', 'ccao': 'ccao-f', 'ccdf': 'ccdv-f'}
MOCK = {'ccar-f': 60, 'ccao-f': 60, 'ccdv-f': 53}  # items on the real exam; mock exams draw this many
KEEP = ('domain', 'lesson', 'tip', 'ask')
# Items whose explanation notes the answer came from an outside site's key; left out at the owner's request.
SKIP = {'159', '196', '239', '1232', '1402', '1407', '1408', '1428', '214', '1412'}  # 1412: options are empty


def text(h):
    """Bank HTML -> the plain text with **bold** / `code` the app formats."""
    h = re.sub(r'<(strong|b)>(.*?)</\1>', r'**\2**', h, flags=re.S)
    h = re.sub(r'<code>(.*?)</code>', r'`\1`', h, flags=re.S)
    h = re.sub(r'</?em>', '', h)
    h = re.sub(r'<li>\s*', '\n- ', h)
    h = re.sub(r'</li>|</?ul>|</?ol>', '', h)
    h = re.sub(r'</p>\s*<p>', '\n', h)
    h = re.sub(r'</?p>', '', h)
    # anything else that looks like a tag (e.g. <source> inside an example prompt) is literal text
    return re.sub(r'[ \t]+\n', '\n', html.unescape(h)).strip()


def main(path):
    page = open(path, encoding='utf-8').read()
    data = json.loads(re.search(r'const DATA = (\{.*?\});\s*\n', page, re.S).group(1))
    for key, cert in BANK.items():
        dpath = os.path.join(ROOT, 'data', f'{cert}.json')
        vpath = os.path.join(ROOT, 'data', 'vi', f'{cert}.json')
        d = json.load(open(dpath, encoding='utf-8'))
        old_vi = json.load(open(vpath, encoding='utf-8')) if os.path.exists(vpath) else {}
        questions, vi = [], {}
        for q in data[key]['qs']:
            if q['id'] in SKIP:
                continue
            n = len(questions) + 1
            qid = f'{cert}-b{q["id"]}'
            pairs = sorted(zip(q['o'], q['v']['o']), key=lambda p: p[0]['k'])  # bank stores options shuffled
            assert len(q['o']) == len(q['v']['o']) and q['a'] and set(q['a']) <= {o['k'] for o in q['o']}, qid
            questions.append({'id': qid, 'set': 'practice', 'n': n, 'domain': None, 'q': text(q['q']),
                              'options': [{'k': o['k'], 't': text(o['h'])} for o, _ in pairs],
                              'answer': sorted(q['a']), 'why': ''})
            entry = {'q': text(q['v']['q']), 'o': {o['k']: text(t) for o, t in pairs}, 'exp': q.get('e', '').strip()}
            entry.update({k: old_vi[qid][k] for k in KEEP if k in old_vi.get(qid, {})})
            vi[qid] = entry
        d['questions'] = questions
        d['mockSize'], d['mockMinutes'] = MOCK[cert], 120
        json.dump(d, open(dpath, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        json.dump(vi, open(vpath, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(cert, len(questions), 'questions')
    certs_path = os.path.join(ROOT, 'data', 'certs.json')
    certs = json.load(open(certs_path, encoding='utf-8'))
    for c in certs:
        c['total'] = len(json.load(open(os.path.join(ROOT, 'data', f'{c["code"]}.json'), encoding='utf-8'))['questions'])
    json.dump(certs, open(certs_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(sys.argv[1])
