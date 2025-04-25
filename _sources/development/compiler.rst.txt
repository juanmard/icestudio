.. _compiler:

Compilers
=========

1. Verilog
2. PCF
3. Testbench
4. GTKWave

Implementation
--------------

Compiler `source code <https://github.com/FPGAwars/icestudio/blob/develop/app/services/compiler.js>`_.

Sample
------

Counter
```````

.. image:: ../_static/img/compiler/counter.png

.. container:: toggle

    .. container:: header

        **counter.ice**

    |

    .. literalinclude:: ../_static/samples/compiler/counter.ice
       :language: json

|

.. container:: toggle

    .. container:: header

        **div.v**

    |

    .. literalinclude:: ../_static/samples/compiler/div.v

|

Generates
~~~~~~~~~

.. container:: toggle

    .. container:: header

        **counter.v**

    |

    .. literalinclude:: ../_static/samples/compiler/counter.v
       :language: verilog

|

.. container:: toggle

   .. container:: header

       **counter.pcf**

   |

   .. literalinclude:: ../_static/samples/compiler/counter.pcf

|

.. container:: toggle

   .. container:: header

       **counter_tb.v**

   |

   .. literalinclude:: ../_static/samples/compiler/counter_tb.v

|

.. container:: toggle

   .. container:: header

       **counter_tb.gtkw**

   |

   .. literalinclude:: ../_static/samples/compiler/counter_tb.gtkw

|
