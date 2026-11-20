"""Helpers for the Vietnamese overlays in data/vi/<cert>.json.

  python scripts/vi_tools.py dump <cert> <from> <to>    print questions (1-based slice) to translate
  python scripts/vi_tools.py merge <cert> <batch.json>  validate a batch and merge it into data/vi/<cert>.json
  python scripts/vi_tools.py check                      validate every overlay and report coverage
"""
import json, os, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
CERTS = ['ccao-f', 'ccdv-f', 'ccar-f', 'ccar-p']


def load(p):
    return json.load(open(os.path.join(ROOT, p), encoding='utf-8'))


def problems(cert, entries):
    data = load(f'data/{cert}.json')
    qs = {q['id']: q for q in data['questions']}
    slugs = {l['slug'] for l in load(f'content/{cert}/index.json')}
    out = []
    for qid, e in entries.items():
        q = qs.get(qid)
        if not q:
            out.append(f'{qid}: unknown question'); continue
        keys = {o['k'] for o in q['options']}
        bank = 'exp' in e  # imported bank: translated options + one explanation, domain tagged here
        per_option = e.get('o' if bank else 'opts', {})
        if set(per_option) != keys:
            out.append(f'{qid}: options {sorted(per_option)} != {sorted(keys)}')
        for f in ('q', 'tip', 'lesson') + (('domain', 'exp') if bank else ('ask',)):
            if not e.get(f):
                out.append(f'{qid}: missing {f}')
        if bank and e.get('domain') and e['domain'] not in {d['n'] for d in data['domains']}:
            out.append(f'{qid}: bad domain {e["domain"]!r}')
        if e.get('tip') and not (e['tip'].get('title') and e['tip'].get('body')):
            out.append(f'{qid}: tip needs title and body')
        if e.get('ask') and not (e['ask'].get('title') and e['ask'].get('body')):
            out.append(f'{qid}: ask needs title and body')
        if e.get('lesson') and e['lesson'] not in slugs:
            out.append(f'{qid}: lesson {e["lesson"]!r} not found')
    return out


def main():
    cmd = sys.argv[1]
    if cmd == 'dump':
        cert, a, b = sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
        data = load(f'data/{cert}.json')
        dom = {d['n']: d['name'] for d in data['domains']}
        if data['questions'][0]['domain'] is None:  # imported bank: compact view for tagging
            vi = load(f'data/vi/{cert}.json')
            print('DOMAINS:', ' | '.join(f'{n}={v}' for n, v in dom.items()))
            for q in data['questions'][a - 1:b]:
                right = ' / '.join(o['t'] for o in q['options'] if o['k'] in q['answer'])
                print(f"## {q['id']} | ans {','.join(q['answer'])}\nQ: {q['q'][:420]}\nRIGHT: {right[:260]}\nVI: {vi[q['id']]['exp'][:300]}\n")
            print('LESSONS:', ' | '.join(l['slug'] for l in load(f'content/{cert}/index.json') if l['task']))
            return
        for q in data['questions'][a - 1:b]:
            scen = f" | scenario: {q['scenario']}" if q.get('scenario') else ''
            print(f"## {q['id']} | D{q['domain']} {dom[q['domain']]} | ans {','.join(q['answer'])}{scen}")
            if q.get('scenarioIntro'):
                print('SCEN:', q['scenarioIntro'])
            print('Q:', q['q'])
            for o in q['options']:
                print(f"{o['k']}. {o['t']}")
            print('WHY:', q['why'])
            print()
        print('LESSONS:', ' | '.join(f"{l['slug']}" for l in load(f'content/{cert}/index.json') if l['task']))
    elif cmd == 'merge':
        cert, batch = sys.argv[2], json.load(open(sys.argv[3], encoding='utf-8'))
        path = os.path.join(ROOT, 'data', 'vi', f'{cert}.json')
        cur = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}
        batch = {k: {**cur.get(k, {}), **v} for k, v in batch.items()}  # add fields to existing entries
        errs = problems(cert, batch)
        if errs:
            print('\n'.join(errs)); sys.exit(1)
        cur.update(batch)
        order = [q['id'] for q in load(f'data/{cert}.json')['questions']]
        cur = {k: cur[k] for k in order if k in cur}
        json.dump(cur, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f'{cert}: merged {len(batch)}, now {len(cur)}/{len(order)}')
    elif cmd == 'check':
        bad = 0
        for c in CERTS:
            path = os.path.join(ROOT, 'data', 'vi', f'{c}.json')
            cur = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}
            errs = problems(c, cur)
            bad += len(errs)
            print(f"{c}: {len(cur)}/{len(load(f'data/{c}.json')['questions'])} translated", *errs, sep='\n  ')
        sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
