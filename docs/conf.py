# -- General configuration ------------------------------------------------

extensions = []

templates_path = ['source/_templates']

source_suffix = '.rst'

master_doc = 'index'

project = u'Icestudio'
copyright = u'2016-2020, Icestudio contributors'
author = u'Icestudio contributors'

title = u'Icestudio v1 (nightly)'

version = u'0.5.1' # The short X.Y version.
release = u'0.5.1dev' # The full version, including alpha/beta/rc tags.

language = 'None'

exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']

pygments_style = 'sphinx'

todo_include_todos = False


# -- Options for HTML output ----------------------------------------------

html_theme = 'sphinx_rtd_theme'

html_static_path = ['source/_static']

htmlhelp_basename = 'icestudiodoc'


# -- Options for LaTeX output ---------------------------------------------

latex_documents = [
    (master_doc, 'icestudio.tex', title,
     author, 'manual'),
]


# -- Options for manual page output ---------------------------------------

man_pages = [
    (master_doc, 'icestudio', title,
     [author], 1)
]


# -- Options for Texinfo output -------------------------------------------


texinfo_documents = [
    (master_doc, 'icestudio', title,
     author, 'icestudio', 'Visual editor for Verilog designs.',
     'Miscellaneous'),
]
