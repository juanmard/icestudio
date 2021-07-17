Include a list file
-------------------

If your code block contains a list file(s), for example:

.. code-block:: verilog

  $readmemh("rom.list", rom);

1. **Save the ice project**

2. **Copy the list file(s) to the project directory**

3. **Build and upload the project**

Also you can include explicitly a list file in the header of a code block:

.. code-block:: verilog

  // @include rom.list
