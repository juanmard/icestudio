#!/usr/bin/python3

import re
import json
from pathlib import Path

p = Path('.').resolve()

for item in list(p.glob('*')):
    if item.is_dir() and item.name[0] != '_':
        path = item
        cfile = path / 'pinout.pcf'
        if not cfile.exists():
            cfile = path / 'pinout.lpf'
            if not cfile.exists():
                raise Exception('No known constraints file found in %s', str(path))

        print('· Processing %s file %s' % (item.name, cfile.name))

        pattern = 'set_io\s+(--warn-no-port|-nowarn)?\s*(.*?)\s+(.*?)\s+(#+\s+)?' if cfile.suffix == '.pcf' else r'LOCATE\s*?COMP\s*?"(.*)"\s*?SITE\s*?"(.*)";\s*?#?\s*?'
        pinout = re.findall(pattern, cfile.read_text())

        if len(pinout) == 0:
            print('  !!! Something went wrong; empty pinout list')
            continue

        info = json.loads((path / 'info.json').read_text())

        info['pinout'] = { item[1]: item[2] for item in sorted(pinout, key=lambda pinout: pinout[1],reverse=True) } if cfile.suffix == '.pcf' else { item[0]: item[1] for item in pinout }

        (path / 'info.json').write_text(json.dumps(info, indent=2) + "\n")
