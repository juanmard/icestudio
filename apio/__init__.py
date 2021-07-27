"""Open source ecosystem for open FPGA boards"""
# -*- coding: utf-8 -*-
# -- This file is part of the Apio project
# -- (C) 2016-2021 FPGAwars contributors
# -- Licence GPLv2

VERSION = (0, 9, 0)
__version__ = ".".join([str(s) for s in VERSION])

__title__ = "apio"
__description__ = "Open source ecosystem for FPGA development boards"
__url__ = "https://github.com/FPGAwars/apio"

__author__ = "FPGAwars contributors"

__license__ = "GPLv2"

# Enable this flag to load data from /etc/apio.json file
# Used in apio-debian distribution
LOAD_CONFIG_DATA = False
