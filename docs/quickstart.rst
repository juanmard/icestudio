.. _quickstart:

Quick Start
===========

Select board
------------

The first time *Icestudio* is executed, a board needs to be selected:

.. image:: img/start_selectboard-prompt.png
   :width: 400 px
   :align: center

A *microchip* icon on the bottom right corner provides access to board details, such as the pinout, the datasheet or implementation constraints. The selected board can be changed from the same window:

.. image:: img/start_selectboard.gif
   :width: 400 px
   :align: center


Install/configure the toolchain
-------------------------------

For configuring the built-in toolchain of custom statically built binaries, go to **Edit > Preferences** and select *install*:

.. image:: img/start_toolchain.png
   :width: 400 px
   :align: center

The latest stable release of `Apio <https://github.com/FPGAwars/apio>`_ and all its built-in packages will be installed.

.. IMPORTANT:: Some boards are not supported in the stable releases of Apio, but are available in the development branch.
   You might need to install/update Apio from the git repository.

   NOTE: on GNU/Linux, first ``source ~/.icestudio/venv/bin/activate``.

   .. code-block:: shell

      pip install -U git+https://github.com/FPGAwars/apio.git@develop#egg=apio


Install/configure the drivers
-----------------------------

Then, for configuring drivers, connect your board and select **Enable** in *toolchain* section. This operation requires **administrator privileges**.

.. attention::

    On Windows, an external application (`Zadig <https://zadig.akeo.ie/>`_) is used for boards with FTDI devices.
    It replaces the existing FTDI driver of the **Interface 0** with **libusbK**.

    .. image:: img/zadig.png
       :width: 400 px
       :align: center

    |

    On macOS, this operation requires internet connection to allow *Homebrew* to install ``libffi`` and ``libftdi`` packages.


Test 'One LED' example
----------------------

After doing the initial setup, go to **File > Collections > Basic > 1. Basic > 01. One LED**

.. image:: img/start_example.png
   :width: 400 px
   :align: center

.. image:: img/start_oneled.png
   :width: 400 px
   :align: center

Last, the design can be verified, built or uploaded through the buttons on the bottom right corner:

.. image:: img/start_upload.gif
   :width: 400 px
   :align: center


.. _project:

Project
-------

An *Icestudio* project is a JSON file that fulfills the format described in :ref:`DEV:project`. ICE files contain the
whole design, along with metadata about the project. Menu option **Edit > Project information** allows to easily modify
the metadata:

.. image:: img/project-info.png
  :width: 400px
  :align: center
