.. _quickstart:

Quick Start
===========

The first time Icestudio is executed, a board needs to be selected:

.. image:: img/start_selectboard-prompt.png
   :width: 400 px
   :align: center

A *microchip* icon on the top right corner provides access to board details, such as the pinout, the datasheet or implementation constraints. The selected board can be changed from the same menu:

.. image:: img/start_selectboard.png
   :width: 400 px
   :align: center

For configuring the built-in toolchain of custom statically built binaries, go to **Edit > Preferences > Manage toolchain > Install**:

.. image:: img/start_toolchain.png
   :width: 400 px
   :align: center

A cached release of `Apio <https://github.com/FPGAwars/apio>`_ and all its needed `packages <https://github.com/FPGAwars/apio#apio-packages>`_ will be installed.

Then, for configuring drivers, connect your board and select **Edit > Preferences > Drivers > Enable**. This operation requires **administrator privileges**.

.. image:: img/start_drivers.png
   :width: 400 px
   :align: center

.. note::

    On Windows, an external application (`Zadig <https://zadig.akeo.ie/>`_) is used. It replaces the existing FTDI driver of the **Interface 0** with **libusbK**.

    .. image:: img/zadig.png
       :width: 400 px
       :align: center

    |

    On macOS, this operation requires internet connection to allow *Homebrew* to install ``libffi`` and ``libftdi`` packages.

After doing the initial setup, go to **File > Collections > Basic > 1. Basic > 01. One LED**

.. image:: img/start_example.png
   :width: 400 px
   :align: center

.. image:: img/start_oneled.png
   :width: 400 px
   :align: center

Last, the design can be verified, built or uploaded through the buttons on the bottom right corner, or from menu **File**:

.. image:: img/start_upload.png
   :width: 400 px
   :align: center

.. _project:

Project
-------

An Icestudio project is a JSON file that fulfills the format described in :ref:`DEV:project`. ICE files contain the
whole design, along with metadata about the project. Menu option **Edit > Project information** allows to easily modify
the metadata:

.. image:: img/project-info.png
  :width: 400px
  :align: center
