Configure a remote host
------------------------

I you want to use a RPi (or another computer), e.g. ``pi@192.168.0.22``, first configure the host:

1. **Copy your SSH public key into the server**

  .. code-block:: bash

    $ ssh-keygen
    $ ssh-copy-id -i .ssh/id_rsa.pub pi@192.168.0.22

2. **Install apio on the server**

  .. code-block:: bash

    $ ssh pi@192.168.0.22
    $ sudo pip install -U apio
    $ apio install --all
    $ apio drivers --enable  # For FTDI devices

3. **Enter the host name in Icestudio, Edit > Remote hostname**

   .. image:: ../_static/img/howto_remotehost.png

4. **Now, Verify, Build and Upload tools will run on the selected host**
