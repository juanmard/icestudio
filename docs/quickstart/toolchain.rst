.. _quickstart:toolchain:

Install/configure the toolchain
-------------------------------

For configuring the built-in toolchain of custom statically built binaries, go to **Edit > Preferences** and select *install*:

.. image:: ../_static/img/start_toolchain.png
   :width: 500 px
   :align: center

The latest stable release of `Apio <https://github.com/FPGAwars/apio>`_ and all its built-in packages will be installed.

.. IMPORTANT:: Some boards are not supported in the stable releases of Apio, but are available in the development branch.
   You might need to install/update Apio from the git repository.

   NOTE: on GNU/Linux, first ``source ~/.icestudio/venv/bin/activate``.

   .. code-block:: shell

      pip install -U git+https://github.com/FPGAwars/apio.git@develop#egg=apio
