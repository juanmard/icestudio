.. _DEV:rules:

Tooling
=======

Build the app
-------------

Install `Python >= 3.6 <https://www.python.org/downloads/>`__ and `Node.js <https://nodejs.org/>`__.
On Windows, the recommended Node.js version is `10.17.x`.

Install dependencies and start development:

.. code-block:: bash

    yarn install
    yarn start

.. ATTENTION:: Use ``yarn run check`` for checking the style of sources and ``yarn prettify`` for fixing them.
  CI will fail if *non-pretty* sources are pushed.

.. NOTE:: Use envvar ``ICESTUDIO_APIO`` for using apio from a custom location.

Build the docs
--------------

.. code-block:: bash

    cd docs
    pip3 install -r requirements.txt
    make html
    firefox _build/html/index.html

Internationalisation
--------------------

Use ``yarn gettext`` to extract the labels from the code.

Localisation
------------

Basque, Catalan, Chinese, Czech, Dutch, English, French, Galician, German, Greek, Italian, Korean, Russian, Spanish...

``*.po`` sources for localisation are located in ``app/resources/locale``.
For contributing, add or update the `app translations <https://github.com/juanmard/icestudio/tree/develop/app/resources/locale>`__
using `Poedit <https://poedit.net/>`__.

Package for distribution
------------------------

.. code-block:: bash

    yarn dist

* GNU/Linux: (linux32,linux64).zip
* Windows: (win32,win64).zip
* Mac OS: osx64.zip

Apio configuration
------------------

Apio backend is configured in the `app/package.json` file:

* ``apio.min``: minimum version (>=)
* ``apio.max``: maximum version (<)
* ``apio.extras``: list of external Python programmers (``blackiceprog``, ``tinyfpgab``)
* ``apio.external``: load an external Apio package instead of the default one (e.g. ``/path/to/my/apio``)
* ``apio.branch``: install Apio from the repository branch instead of PyPI.

An external Apio package can be also set on runtime using the `ICESTUDIO_APIO` environment variable.

References
----------

* App and GUI:

  * `AngularJS <https://angularjs.org/>`__
  * `UI Bootstrap <https://angular-ui.github.io/bootstrap>`__
  * `Bootstrap <https://getbootstrap.com/docs/3.3>`__
  * `Font Awesome <https://fontawesome.com/v4.7.0>`__
  * `Marked.js <https://marked.js.org/#/README.md#README.md>`__
  * `AlertifyJS <https://alertifyjs.com/>`__

* Dekstop framework (backend, to be replaced with `electron <https://www.electronjs.org/>`__) or with a Python/golang CLI-LIB-API).

  * `NW.js <https://nwjs.io/>`__

* Build system (packager to be replaced with `webpack <https://webpack.js.org/>`__, `ncc <https://github.com/vercel/ncc>`__, `pika <https://www.pika.dev>`__...)

  * `grunt <https://gruntjs.com/>`__
  * `bower <https://bower.io/>`__
  * `Prettier <https://prettier.io>`__
