<p align="center">
  <a title="juanmard.github.io/icestudio" href="https://juanmard.github.io/icestudio"><img src="https://img.shields.io/website.svg?label=juanmard.github.io%2Ficestudio&longCache=true&style=flat-square&url=http%3A%2F%2Fjuanmard.github.io%2Ficestudio%2Findex.html&logo=github"></a><!--
  -->
  <a title="'icestudio' workflow status" href="https://github.com/juanmard/icestudio/actions?query=workflow%3Aicestudio"><img alt="'icestudio' workflow status" src="https://img.shields.io/github/workflow/status/juanmard/icestudio/icestudio?longCache=true&style=flat-square&label=icestudio&logo=github"></a>
</p>

<p align="center">
<a href="http://juanmard.github.io/icestudio"><img src="./docs/resources/images/logo/icestudio-logo-label-nightly.png" align="center"></a>
</p>

<p align="center">
  <a title="DevDependency Status" href="https://david-dm.org/juanmard/icestudio/moon?type=dev"><img src="https://img.shields.io/david/dev/juanmard/icestudio.svg?longCache=true&style=flat-square&label=devdeps&logo=npm"></a><!--
  -->
  <a title="Dependency Status" href="https://david-dm.org/juanmard/icestudio/moon?path=app"><img src="https://img.shields.io/david/juanmard/icestudio.svg?path=app&longCache=true&style=flat-square&label=app%20deps&logo=npm"></a><!--
  -->
  <a title="Code Climate maintainability" href="https://codeclimate.com/github/juanmard/icestudio"><img src="https://img.shields.io/codeclimate/maintainability/juanmard/icestudio?longCache=true&style=flat-square&logo=codeclimate"></a><!--
  -->
  <a title="Code Climate technical debt" href="https://david-dm.org/juanmard/icestudio/moon?path=app"><img src="https://img.shields.io/codeclimate/tech-debt/juanmard/icestudio?longCache=true&style=flat-square&logo=codeclimate"></a>
</p>

Visual editor for Verilog designs, built on top of [Icestorm](http://www.clifford.at/icestorm/) and [Apio](https://github.com/FPGAwars/apio). Find installation guidelines, user guide and further information at [juanmard.github.io/icestudio](https://juanmard.github.io/icestudio).

# Development

Install [Python >= 3.6](https://www.python.org/downloads/) and [Node.js](https://nodejs.org/). On Windows, the recommended Node.js version is `10.17.x`.

Install dependencies and start development:

```bash
yarn install
yarn start
```

> NOTE: use `yarn run check` for checking the style of sources and `yarn prettify` for fixing them. CI will fail if _non-pretty_ sources are pushed.

> NOTE: for adding blocks or examples, you can contribute to [icestudio-blocks](https://github.com/FPGAwars/icestudio-blocks), [icestudio-examples](https://github.com/FPGAwars/icestudio-examples) or [collection-default](https://github.com/FPGAwars/collection-default).

## Build the docs

```bash
cd docs
pip3 install -r requirements.txt
make html
firefox _build/html/index.html
```

## Internationalisation

Use `yarn gettext` to extract the labels from the code.

## Localisation

Basque, Catalan, Chinese, Czech, Dutch, English, French, Galician, German, Greek, Italian, Korean, Russian, Spanish...

`*.po` sources for localisation are located in [`app/resources/locale`](./app/resources/locale). For contributing, add or update the [app translations](https://github.com/juanmard/icestudio/tree/develop/app/resources/locale) using **[Poedit](https://poedit.net/)**.

## Package for distribution

```bash
yarn dist
```

- GNU/Linux: (linux32,linux64).zip
- Windows: (win32,win64).zip
- Mac OS: osx64.zip

## References

- App and GUI:
  - [AngularJS](https://angularjs.org/)
  - [UI Bootstrap](https://angular-ui.github.io/bootstrap)
  - [Bootstrap](https://getbootstrap.com/docs/3.3)
  - [Font Awesome](https://fontawesome.com/v4.7.0)
  - [Marked.js](https://marked.js.org/#/README.md#README.md)
  - [AlertifyJS](https://alertifyjs.com/)
- Dekstop framework (backend, to be replaced with [electron](https://www.electronjs.org/) or with a Python/golang CLI-LIB-API).
  - [NW.js](https://nwjs.io/)
- Build system (packager to be replaced with [webpack](https://webpack.js.org/), [ncc](https://github.com/vercel/ncc), [pika](https://www.pika.dev)...)
  - [grunt](https://gruntjs.com/)
  - [bower](https://bower.io/)
  - [Prettier](https://prettier.io)

## Apio configuration

Apio backend is configured in the `app/package.json` file:

- `apio.min`: minimum version (>=)
- `apio.max`: maximum version (<)
- `apio.extras`: list of external Python programmers (_blackiceprog_, _tinyfpgab_)
- `apio.external`: load an external Apio package instead of the default one (e.g. _/path/to/my/apio_)
- `apio.branch`: install Apio from the repository branch instead of PyPI.

An external Apio package can be also set on runtime using the `ICESTUDIO_APIO` environment variable.
