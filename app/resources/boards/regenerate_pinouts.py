#!/usr/bin/python3

import re
import json
from pathlib import Path

p = Path('.').resolve()

nullpins = [{
   'type': item,
   'name': 'NULL',
   'value': 'NULL'
} for item in ['output', 'input']]

for item in list(p.glob('*')):
    if item.is_dir() and item.name[0] != '_':
        path = item
        cfile = path / 'pinout.pcf'
        if not cfile.exists():
            cfile = path / 'pinout.lpf'
            if not cfile.exists():
                raise Exception('No known constraints file found in %s', str(path))

        print('· Processing %s file %s' % (item.name, cfile.name))

        pattern = 'set_io\s+(--warn-no-port)?\s*(.*?)\s+(.*?)\s+(#+\s+(input|output))?' if cfile.suffix == '.pcf' else r'LOCATE\s*?COMP\s*?"(.*)"\s*?SITE\s*?"(.*)";\s*?#?\s*?(input|output|inout)'
        pinout = re.findall(pattern, cfile.read_text())

        if len(pinout) == 0:
            print('  !!! Something went wrong; empty pinout list')
            continue

        if cfile.suffix == '.pcf':
            data = [{
                'type': item[4] or 'inout',
                'name': item[1],
                'value': item[2]
            } for item in sorted(pinout, key=lambda pinout: pinout[1],reverse=True)]
        else:
            data = [{
                'type': item[2] or 'inout',
                'name': item[0],
                'value': item[1]
            } for item in pinout]

        info = json.loads((path / 'info.json').read_text())
        info['pinout'] = data + nullpins
        (path / 'info.json').write_text(json.dumps(info, indent=2))
