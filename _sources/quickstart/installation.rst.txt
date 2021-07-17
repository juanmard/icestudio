.. _installation:

Installation
============

Icestudio is available on GNU/Linux, Windows and macOS.

.. note:: Since this repository is a proof of concept built on top of `FPGAwars/icestudio <https://github.com/FPGAwars/icestudio>`_,
  no regular/tagged releases are available yet. However, after each commit is pushed, CI workflows produce nightly
  builds for all the supported platforms.

Users can pick artifacts from pre-release `nightly <https://github.com/juanmard/icestudio/releases/tag/nightly>`_ or
from any of the successful jobs in `juanmard/icestudio/actions <https://github.com/juanmard/icestudio/actions?query=workflow%3Aicestudio>`_.

Requirements:

- `Python <https://www.python.org>`_ ``>=3.6``.
- GNU/Linux: ``xclip`` (to enable Copy/Paste).
- macOS: `Homebrew <https://brew.sh>`_.

.. warning:: Non-root Ubuntu/Debian users may need to add themselves to group ``dialout``: ``sudo usermod -a -G dialout $USER``.
  At the same time, some additional packages might be required, such as ``libgconf`` and ``canberra-gtk-module``:
  ``sudo apt install -y libgconf-2-4 libcanberra-gtk-module``.

.. hint:: Optional script `linux_installer.sh <https://github.com/FPGAwars/icestudio/blob/develop/scripts/linux_installer.sh>`_
  registers the ``*.ice`` files as *Icestudio project files*. There is also a `linux_uninstaller.sh <https://github.com/FPGAwars/icestudio/blob/develop/scripts/linux_uninstaller.sh>`_
  to revert the previous configuration.
