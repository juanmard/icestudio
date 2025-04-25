Create a collection package
---------------------------

1. **Create one or more collections**

You can use the `icm cli tool <https://github.com/FPGAwars/icm>`_ to create and update a collection.

 .. code::

   Collection/
   ├── blocks
   │   ├── category1
   │   │   ├── block1.ice
   │   │   └── subcategory1
   │   │       ├── block11.ice
   │   │       └── block12.ice
   │   └── category2
   │       └── block2.ice
   ├── examples
   │   ├── example1.ice
   │   ├── example2.ice
   │   └── example3.ice
   ├── locale
   │   ├── en
   │   │   └── en.po
   │   ├── es_ES
   │   │   └── es_ES.po
   │   └── translation.js
   ├── LICENSE
   ├── package.json
   └── README.md

2. **ZIP all your collections**

 Create a ZIP file with all your created collections at the main level.

 .. code::

   Collections.zip
   |
   ├── Collections 1
   │   └── ...
   └── Collections 2
       └── ...

.. note::

   The file **package.json** must exists, and also the **blocks** directory and/or the **examples** directory. The **locale** directory is optional. More information in the `Default collection <https://github.com/FPGAwars/collection-default>`_.
