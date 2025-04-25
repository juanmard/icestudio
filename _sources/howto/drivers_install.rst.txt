Install the drivers
-------------------

1. **Install the toolchain** (required for Windows)

2. **Enable the FTDI drivers**

  Go to **Edit > Preferences > Drivers > Enable**. Each OS has a different process. This configuration requires administration privileges.

.. note::

    On Windows, an external application (`Zadig <https://zadig.akeo.ie/>`_) is used. It replaces the existing FTDI driver of the **Interface 0** with **libusbK**.

    .. image:: ../_static/img/zadig.png
        :align: center
        :width: 400 px

    On macOS, this operation requires internet connection to allow *Homebrew* to install ``libffi`` and ``libftdi`` packages.

.. hint::

  For reverting the configuration, go to **Edit > Preferences > Drivers > Disable**.
