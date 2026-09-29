"""Build:
  index.html                     ← src/index.src.html + icon sprite
  admin/index.html               ← admin/index.html + icon sprite (in place)
  dist/agape-website-preview.html  single file, all assets inlined
  dist/agape-admin-demo.html       single-file admin with live preview (demo mode)
"""
import re, base64, pathlib, mimetypes, json
root = pathlib.Path(__file__).resolve().parent.parent
sprite = (root/'src/sprite.html').read_text()

def data_uri(path):
    mt = mimetypes.guess_type(str(path))[0] or 'application/octet-stream'
    if path.suffix == '.woff': mt = 'font/woff'
    return f"data:{mt};base64," + base64.b64encode(path.read_bytes()).decode()

# ---- site
html = (root/'src/index.src.html').read_text().replace('<!--SPRITE-->', sprite)
(root/'index.html').write_text(html)

# ---- admin (sprite injected between markers so the build is repeatable)
ap = root/'admin/index.html'
a = ap.read_text()
a = re.sub(r'<!--SPRITE-->|<!--SPRITE:START-->.*?<!--SPRITE:END-->', lambda m: '<!--SPRITE:START-->' + sprite + '<!--SPRITE:END-->', a, count=1, flags=re.S)
ap.write_text(a)

# ---- shared asset map: every image referenced by content.js
content_js = (root/'assets/js/content.js').read_text()
paths = sorted(set(re.findall(r'"(assets/img/[^"]+)"', content_js)) | {'assets/img/logo-full.png','assets/img/logo-mark.png','assets/img/logo-mark-light.png'})
assets = {p: data_uri(root/p) for p in paths}
assets_js = 'window.AGAPE_ASSETS=' + json.dumps(assets) + ';'

def inline_css(css_path, rel):
    css = css_path.read_text()
    return re.sub(r'url\("\.\./([^"]+)"\)', lambda m: f'url("{data_uri(root/rel/m.group(1)) if (root/rel/m.group(1)).exists() else data_uri(root/m.group(1))}")', css)

def inline_scripts(doc, base):
    def rep(m):
        f = (base/m.group(1)).resolve()
        return '<script>' + f.read_text().replace('</script>', '<\\/script>') + '</script>'
    return re.sub(r'<script src="([^"]+)"></script>', rep, doc)

def site_single(include_assets=True, preview=False):
    out = html.replace('<link rel="stylesheet" href="assets/css/style.css" />', '<style>' + inline_css(root/'assets/css/style.css', pathlib.Path('assets')) + '</style>')
    out = re.sub(r'<link rel="preload"[^>]+>\n', '', out)
    out = inline_scripts(out, root)
    cache = {}
    def img(m):
        p = m.group(2)
        if p not in cache: cache[p] = data_uri(root/p)
        return f'{m.group(1)}"{cache[p]}"'
    out = re.sub(r'((?:src|data-img|content)=)"(assets/img/[^"]+)"', img, out)
    head = ''
    if include_assets: head += '<script>' + assets_js + '</script>'
    if preview: head += '<script>window.AGAPE_PREVIEW=true;</script>'
    return out.replace('</head>', head + '\n</head>', 1)

(root/'dist').mkdir(exist_ok=True)
site = site_single()
(root/'dist/agape-website-preview.html').write_text(site)

# ---- admin demo single file
adm = a.replace('<link rel="stylesheet" href="admin.css" />', '<style>' + (root/'admin/admin.css').read_text().replace('url("../assets/fonts/', 'url("__F__') + '</style>')
adm = re.sub(r'url\("__F__([^"]+)"\)', lambda m: f'url("{data_uri(root/"assets/fonts"/m.group(1))}")', adm)
adm = re.sub(r'src="\.\./(assets/img/[^"]+)"', lambda m: f'src="{assets.get(m.group(1)) or data_uri(root/m.group(1))}"', adm)
adm = inline_scripts(adm, root/'admin')
site_for_preview = site_single(include_assets=False, preview=True)
adm = adm.replace('</head>', '<script>' + assets_js + '</script>\n<script>window.AGAPE_SITE_HTML=' + json.dumps(site_for_preview).replace('</', '<\\/') + ';</script>\n</head>', 1)
(root/'dist/agape-admin-demo.html').write_text(adm)
print('index.html', len(html)//1024, 'KB · site preview', len(site)//1024, 'KB · admin demo', len(adm)//1024, 'KB')
