"""Downloads the web fonts referenced by src/fonts-subset.css (Google Fonts, OFL) into fonts/."""
import os
import re
import urllib.request

here = os.path.dirname(os.path.abspath(__file__))
css = open(os.path.join(here, 'src', 'fonts-subset.css')).read()
os.makedirs(os.path.join(here, 'fonts'), exist_ok=True)
for name in sorted(set(re.findall(r'url\(fonts/([^)]+)\)', css))):
    family, version, rest = name.split('_', 2)
    url = f'https://fonts.gstatic.com/s/{family}/{version}/{rest}'
    dest = os.path.join(here, 'fonts', name)
    if not os.path.exists(dest):
        urllib.request.urlretrieve(url, dest)
        print('downloaded', name)
print('fonts ok')
