Create a project
----------------

1. **Create a new project**

   Go to **Edit > New**. A new window will be opened.

   .. image:: ../_static/img/howto_new.png
     :width: 400 px
     :align: center

2. **Add blocks**

.. image:: ../_static/img/howto_demo.gif
     :width: 400 px
     :align: center

There are different types of blocks:

 1. *Input/Output blocks*

    Click on **Basic > Input** or **Basic > Output**, write the block's name and press OK or Enter.

    Also, it can be configured as **buses** using the ``[x:y]`` notation (``x`` is the most significant bit).

    .. image:: ../_static/img/howto_io-fpga.png
       :width: 400 px
       :align: center

    If these blocks are used to build generic blocks, they should be configured as **virtual** (green). Then, the FPGA pin selector won't be shown.

    .. image:: ../_static/img/howto_io-virtual.png
       :width: 400 px
       :align: center

 2. *Constant blocks*

    Click on **Basic > Constant**, write the block's name and press OK or Enter.

    These blocks can be configures as **local**. Then, this parameter won't be exported.

    .. image:: ../_static/img/howto_constant.png
       :width: 400 px
       :align: center

 3. *Memory blocks*

    Click on **Basic > Memory**, write the block's name and press OK or Enter.

    These blocks can be configures as **local**. Then, this parameter won't be exported. Also you can update the **address format** of the memory to be *binary*, *decimal* or *hexadecimal*.

    .. image:: ../_static/img/howto_memory.png
       :width: 400 px
       :align: center

 4. *Code blocks*

    Click on **Basic > Code**, add the code ports. Port names are separated by a comma. E.g.: ``a, b``.

    .. image:: ../_static/img/howto_code-prompt.png
       :width: 400 px
       :align: center

    This block contains a text editor to write your module in verilog code. Module header and footer are not required.

    .. image:: ../_static/img/howto_code.png
       :width: 400 px
       :align: center

 5. *Info blocks*

    Click on **Basic > Info**.

    This block contains a text editor to add comments about the project in **Markdown** or **HTML**.

    .. image:: ../_static/img/howto_info.png
       :width: 400 px
       :align: center

    It can be rendered simply by double-clicking the block.

    .. image:: ../_static/img/howto_info-render.png
       :width: 400 px
       :align: center

 6. *Bit blocks*

    Click on **Bit > 0** or **Bit > 1**.

    These blocks are low and high logic drivers.

    .. image:: ../_static/img/howto_bit.png
       :width: 400 px
       :align: center

 7. *Logic blocks*

    Go to the **Logic** menu and select a block. This menu contains **Gates**, **Combinational blocks** and **Sequential blocks**.

    .. image:: ../_static/img/howto_logic.png
       :width: 400 px
       :align: center

 8. *Setup blocks*

    Click on **Setup > Pull up** or **Setup > Tri-state**.

    The *Pull up* block must be connected to input ports in order to configure a pull up in the FPGA.

    .. image:: ../_static/img/howto_setup.png
       :width: 400 px
       :align: center

In this example we are going to implement an AND logic gate with its input/output pins connected to the FPGA I/O.

.. image:: ../_static/img/howto_bwire.png
   :width: 400 px
   :align: center

3. **Connect the blocks**

.. image:: ../_static/img/howto_wire.png
   :width: 400 px
   :align: center

4. **Select your board**

   Go to **Select > Board** and select the board from the list.

   .. image:: ../_static/img/howto_board.png
     :width: 400 px
     :align: center

5. **Set FPGA I/O pins**

   Select all Input/Output blocks' pins.

   .. image:: ../_static/img/howto_fpgapin.png
     :width: 400 px
     :align: center

6. **Save the project**

   Go to **Edit > Save as** and select the project name, for example *myProject*.

   It will be saved as an **.ice** file.

   .. image:: ../_static/img/howto_saveas.png
     :width: 400 px
     :align: center
