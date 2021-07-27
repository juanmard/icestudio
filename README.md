![](docs/resources/images/logo.png)

Open source **ecosystem for open FPGA boards**

Apio (pronounced [ˈa.pjo]) is a **multiplatform toolbox**, with static pre-built packages, project configuration tools and easy command interface to verify, synthesize, simulate and upload your **verilog** designs.

Apio is used by [Icestudio](https://github.com/juanmard/icestudio).

# Installation

- Clone this branch: `git clone -b apio-dev https://github.com/juanmard/icestudio apio`.
- Set environment variable `PYTHONPATH=$(pwd)/apio`.

# Packages

- [dfu-utils](https://github.com/FPGAwars/toolchain-dfu):  Device Firmware Upgrade Utilities
- [drivers](https://github.com/FPGAwars/tools-drivers): Drivers tools (only for Windows)
- [ecp5](https://github.com/FPGAwars/toolchain-ecp5): ECP5 tools including [Project Trellis](https://github.com/SymbiFlow/prjtrellis) and [nextpnr](https://github.com/YosysHQ/nextpnr)
- [examples](https://github.com/FPGAwars/apio-examples): Verilog basic examples, pinouts, etc
- [fujprog](https://github.com/FPGAwars/toolchain-fujprog): Programmer for ULX2/3S boards
- [gtkwave](https://github.com/FPGAwars/tool-gtkwave): Simulation viewer. [GTKWave project](http://gtkwave.sourceforge.net) (only for Windows)
- [icesprog](https://github.com/FPGAwars/toolchain-icesprog): Programmer for the [iCESugar](https://github.com/wuxx/icesugar)
- [iverilog](https://github.com/FPGAwars/toolchain-iverilog): Verilog simulation and synthesis tool. [Icarus Verilog project](http://iverilog.icarus.com)
- [scons](https://github.com/FPGAwars/tool-scons): A software construction tool. [Scons project](http://scons.org)
- [verilator](https://github.com/FPGAwars/toolchain-verilator): Verilog HDL simulator. [Verilator project](https://www.veripool.org/wiki/verilator)

## Deprecated

- [ice40](https://github.com/FPGAwars/toolchain-ice40): iCE40 place & route and configuration tools. [Icestorm project](http://www.clifford.at/icestorm)
- [system](https://github.com/FPGAwars/tools-system): Tools for listing the USB devices and retrieving information from the FTDI chips
- [yosys](https://github.com/FPGAwars/toolchain-yosys): FPGA synthesis. [Yosys project](http://www.clifford.at/yosys)

# Documentation

```bash
cd docs
make html
firefox _build/html/index.html
```

There is also a list of [frequently asked questions (FAQ)](https://github.com/FPGAwars/apio/wiki/FAQs-and-troubleshooting).

# Testing

```bash
pip install tox
```

```bash
tox
```

```bash
tox -e offline
tox -e coverage
```

[![](https://github.com/FPGAwars/icestudio-wiki/raw/main/Logos/fgpawars-banner.svg)](https://fpgawars.github.io/)
