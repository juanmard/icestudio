.. _board:

Board
=====

A dropdown menu on the top right corner allows to view/modify settings related to the target board:

+--------------------+------------------------------------------------------+
|   Action           |             Description                              |
+====================+======================================================+
| *Board name*       | Show the board SVG pinout                            |
+--------------------+------------------------------------------------------+
| Constraints        | Show the board constraints configuration file        |
+--------------------+------------------------------------------------------+
| Datasheet          | Open board/device datasheet in the sytem web browser |
+--------------------+------------------------------------------------------+
| View board rules   | Show rules of the board                              |
+--------------------+------------------------------------------------------+
| Toggle board rules | Enable/disable rules of the board                    |
+--------------------+------------------------------------------------------+
| Change board       | Select a different board                             |
+--------------------+------------------------------------------------------+

Board rules (see :ref:`rules`) allow to automate tasks such as default port connections or default pin values. For example:

* Connectint all unconnected *clk* ports to the internal CLK signal.
* Turn all unused LEDs off.

When a board is selected, all I/O blocks are updated and the values are reset.

.. hint:: The configuration sources of board are stored in ``app/resources/boards``. In order to support a new board, create a new directory with the ``info.json``, ``pinout.*`` and ``pinout.*`` (optional) files. ``pinout.json`` MUST be generated from the ``pinout.*`` using the ``generator.py`` script.
