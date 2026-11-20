"""Extract lesson bodies from saved pages: content/raw/<cert>/*.html -> content/<cert>/<slug>.html + index.json.

Usage: python scripts/extract_lessons.py ccar-p ccao-f ...
"""
import html, json, os, re, sys

ROOT = os.path.join(os.path.dirname(__file__), '..', 'content')
DROP = [r'<nav class="crumb".*?</nav>', r'<nav class="lnav".*?</nav>',
        r'<div class="ctaband">.*?</div>', r'<ul class="lchips">.*?</ul>',
        r'<section class="lsources".*?</section>']


def text(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s)).strip()


def extract(cert):
    src, out = os.path.join(ROOT, 'raw', cert), os.path.join(ROOT, cert)
    os.makedirs(out, exist_ok=True)
    index = []
    for f in sorted(os.listdir(src)):
        slug = f[:-5]
        page = open(os.path.join(src, f), encoding='utf-8').read()
        m = re.search(r'<article[^>]*>.*?</article>', page, re.S)
        assert m, f'{cert}/{slug}: no <article>'
        a = re.sub(r'<svg.*?</svg>|<!-- -->', '', m.group(0), flags=re.S)
        for pat in DROP:
            a = re.sub(pat, '', a, flags=re.S)
        a = re.sub(r'href="/kien-thuc/', 'href="#/kien-thuc/', a)
        a = re.sub(r'^<article[^>]*>|</article>$', '', a).strip()
        h1 = re.search(r'<h1[^>]*>(.*?)</h1>', a, re.S)
        eb = re.search(r'<p class="leyebrow">(.*?)</p>', a, re.S)
        lede = re.search(r'<p class="lede">(.*?)</p>', a, re.S)
        ebt = text(eb.group(1)) if eb else ''
        task = re.search(r'Task\s*([\d.]+)', ebt)
        dom = re.search(r'Domain\s*(\d+):\s*([^·]*)', ebt)
        index.append({'slug': slug, 'task': task and task.group(1), 'domain': dom and int(dom.group(1)),
                      'domainName': dom and dom.group(2).strip(), 'title': text(h1.group(1)) if h1 else slug,
                      'lede': text(lede.group(1)) if lede else ''})
        open(os.path.join(out, slug + '.html'), 'w', encoding='utf-8').write(a + '\n')
    # overview first, then by task number
    index.sort(key=lambda i: (i['task'] is not None, [int(x) for x in (i['task'] or '0').split('.')]))
    json.dump(index, open(os.path.join(out, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    lessons = [i for i in index if i['task']]
    assert lessons and all(i['domainName'] for i in lessons), f'{cert}: missing domain info'
    print(f'{cert}: {len(lessons)} lessons, {len(index) - len(lessons)} other, domains {sorted({i["domain"] for i in lessons})}')


if __name__ == '__main__':
    for c in sys.argv[1:]:
        extract(c)
