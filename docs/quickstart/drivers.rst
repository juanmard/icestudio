.. _quickstart:drivers:

Install/configure the drivers
-----------------------------

Then, for configuring drivers, connect your board and select **Enable** in *toolchain* section. This operation requires **administrator privileges**.

.. attention::

    On Windows, an external application (`Zadig <https://zadig.akeo.ie/>`_) is used for boards with FTDI devices.
    It replaces the existing FTDI driver of the **Interface 0** with **libusbK**.

    .. image:: ../_static/img/zadig.png
       :width: 500 px
       :align: center

    |

    On macOS, this operation requires internet connection to allow *Homebrew* to install ``libffi`` and ``libftdi`` packages.
