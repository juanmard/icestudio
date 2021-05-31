from pathlib import Path
from json import loads

# -- General configuration ------------------------------------------------

extensions = []

templates_path = ['_templates']

source_suffix = '.rst'

master_doc = 'index'

project = u'Icestudio'
copyright = u'2016-2021, Icestudio Nightly contributors'
author = u'Icestudio contributors'

title = u'Icestudio Nightly'

version = u'0.5.1-dev' # The short X.Y version.
release = version # The full version, including alpha/beta/rc tags.

language = 'None'

exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']

todo_include_todos = False


# -- Options for HTML output ----------------------------------------------

html_theme_options = {
    'logo_only': True,
    'home_breadcrumbs': False,
    'vcs_pageview_mode': 'blob',
}

html_context = {}
ctx = Path(__file__).resolve().parent / 'context.json'
if ctx.is_file():
    html_context.update(loads(ctx.open('r').read()))

html_theme_path = ["."]
html_theme = "_theme"

html_static_path = ['_static']

html_logo = str(Path(html_static_path[0]) / 'logo.png')
html_favicon = str(Path(html_static_path[0]) / 'icon.png')

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
