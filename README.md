<p align="center">
<a href="http://juanmard.github.io/icestudio"><img src="./docs/_static/logo.png" align="center"></a>
</p>

<p align="center">
  <a title="juanmard.github.io/icestudio" href="https://juanmard.github.io/icestudio"><img src="https://img.shields.io/website.svg?label=juanmard.github.io%2Ficestudio&longCache=true&style=flat-square&url=http%3A%2F%2Fjuanmard.github.io%2Ficestudio%2Findex.html&logo=github"></a><!--
  -->
  <a title="'icestudio' workflow status" href="https://github.com/juanmard/icestudio/actions?query=workflow%3Aicestudio"><img alt="'icestudio' workflow status" src="https://img.shields.io/github/workflow/status/juanmard/icestudio/icestudio?longCache=true&style=flat-square&label=icestudio&logo=Github%20Actions&logoColor=fff"></a>
</p>

Visual editor for Verilog designs.
Find installation guidelines, user guide and further information at
[juanmard.github.io/icestudio](https://juanmard.github.io/icestudio).

<p align="center">
<a href="http://juanmard.github.io/icestudio"><img src="https://raw.githubusercontent.com/juanmard/gallery/master/icestudio/icestudio_moon.gif" align="center"></a>
</p>

<p align="center">
  <a title="Code Climate maintainability" href="https://codeclimate.com/github/juanmard/icestudio"><img src="https://img.shields.io/codeclimate/maintainability/juanmard/icestudio?longCache=true&style=flat-square&logo=codeclimate"></a><!--
  -->
  <a title="Code Climate technical debt" href="https://codeclimate.com/github/juanmard/icestudio/trends/technical_debt"><img src="https://img.shields.io/codeclimate/tech-debt/juanmard/icestudio?longCache=true&style=flat-square&logo=codeclimate"></a>
</p>

**IMPORTANT: Since June 2021, several frontend and internal enhancements available in this variant are being applied [upstream](https://github.com/FPGAwars/icestudio). Find further details in the [WIKI](https://github.com/juanmard/icestudio/wiki).**

# Installation

Unlike the [upstream](https://github.com/FPGAwars/icestudio), _Icestudio Nightly_ is agnostic to the toolchain
installation solution and it does not require admin/sudo permissions.
Users are free to choose between [OSS CAD Suite](https://github.com/YosysHQ/oss-cad-suite-build), system packages, Conda environments, [apio](https://github.com/FPGAwars/apio), [containers](https://hdl.github.io/containers/), etc. as their
preferred solution for getting the required tools and making them available in the PATH.
See [hdl/packages](https://github.com/hdl/packages).
By the same token, the usage of virtual environments is optional, although recommended when using Python based packaging
systems such as Conda or apio.

Furthermore, _Icestudio Nightly_ uses [ICETool](ICETool) by default, a Python script that allows executing
`verify`, `build` and `upload` commands without the SCons infrastructure required by `apio`.
Currently, ICETool is in an early development stage and it is not published through PyPI.
Therefore, the location of the package needs to be added to the PYTHONPATH before starting Icestudio:

```sh
PYTHONPATH=$(pwd) yarn start
```

Moreover, environment variable `ICETOOL_CMD` allows overriding the backend.

```sh
# Use apio
ICETOOL_CMD=apio yarn start

# Use custom tool
ICETOOL_CMD=mytool yarn start
```

Do you want to convert Icestudio commands into [FuseSoC](https://github.com/olofk/FuseSoC)/[Edalize](https://github.com/olofk/edalize/) or any other EDA workflow provider? [Let us know!](https://github.com/juanmard/icestudio/issues)!
See [Electronic Design Automation Abstraction (EDA²)](https://edaa-org.github.io/).
