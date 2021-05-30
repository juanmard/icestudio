# How to add a new board

Create a subdir with a unique name/identifier for the board.
Add the following files to that subdir:

- `info.json`, including the following fields:
  - `label`: string. The name that will be shown in the GUI.
  - `device`: string. The main FPGA device on the board.
  - `datasheet`: string. URL to the board datasheet/website.
  - `prog`: list of strings. The identifiers of the programmers supported for the board.
  - `pinout`: a placeholder, to be filled from the constraints file.
- A `*.pcf` or `*.lpf` constraints file.

Optionally:

- A `iomode.json` file for constraining the mode of I/O pins. By default, all pins are considered to be
  of mode `inout`; therefore, `input` and `output` need to be defined only.
- A diagram named `pinout.svg`.
- A `rules.json` file.

Then, execute `regenereate_pinouts.py` for having the `pinout` field of the `info.json` filled automatically.
Check the content of field `pinout` in `info.json`.

Furthermore, check whether a JSON file exists in [`../devices`](../devices), which corresponds to the device field in
the `info.json` file. If it is missing, it can be optionally added.

Last, commit the changes and open a Pull Request!

NOTE: adding boards to Icestudio does not imply that the designs can be synthesized or implemented. Currently, Icestudio
depends on `apio` for those tasks. Therefore, adding boards to Icestudio is only useful for defining I/O pins and/or for
using Board Rules. Further features require separated PRs to `apio`'s sources.
