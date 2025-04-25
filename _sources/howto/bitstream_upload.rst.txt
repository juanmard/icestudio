Upload a bitstream
------------------

1. **Open a project**

   Go to **Edit > Open...** and select an **.ice** file.

2. **Verify the project**

   Go to **Tools > Verify**.

   This option checks the generated verilog code using ``apio verify``.

   .. image:: ../_static/img/howto_verify.png
      :width: 400 px
      :align: center

3. **Build the project**

   Go to **Tools > Build**.

   This option generates a bitstream using ``apio build``.

   .. image:: ../_static/img/howto_build.png
      :width: 400 px
      :align: center

4. **Upload the project**

   Connect your FPGA board and press **Tools > Upload**. This option uses ``apio upload``.

   .. image:: ../_static/img/howto_upload.png
      :width: 400 px
      :align: center

After executing *Tools > Verify*, *Tools > Build* or *Tools > Upload* you can see the executed command and the output in a new windows opened from **View > Command output**.

.. image:: ../_static/img/howto_toolchain-output.png
   :width: 400 px
   :align: center
