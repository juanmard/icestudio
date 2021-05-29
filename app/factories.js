// Window

angular
  .module('icestudio')
  .factory('gui', function () {
    'use strict';
    var gui = require('nw.gui');
    return gui;
  })
  .factory('window', function () {
    'use strict';
    var gui = require('nw.gui');
    return gui.Window;
  })
  .factory('_package', function () {
    'use strict';
    var _package = require('./package.json');
    return _package;
  });

// Joint

angular.module('icestudio').factory('joint', function ($window) {
  'use strict';
  return $window.joint;
});

// Node

angular
  .module('icestudio')
  .factory('fastCopy', function () {
    'use strict';
    return require('fast-copy');
  })
  .factory('nodeFs', function () {
    'use strict';
    return require('fs');
  })
  .factory('nodeFse', function () {
    'use strict';
    return require('fs-extra');
  })
  .factory('nodeRmdir', function () {
    'use strict';
    return require('rmdir');
  })
  .factory('nodeSha1', function () {
    'use strict';
    return require('sha1');
  })
  .factory('nodePath', function () {
    'use strict';
    return require('path');
  })
  .factory('nodeChildProcess', function () {
    'use strict';
    return require('child_process');
  })
  .factory('nodeZlib', function () {
    'use strict';
    return require('zlib');
  })
  .factory('nodeSSHexec', function () {
    'use strict';
    return require('ssh-exec');
  })
  .factory('nodeRSync', function () {
    'use strict';
    return require('rsyncwrapper');
  })
  .factory('nodeSudo', function () {
    'use strict';
    return require('sudo-prompt');
  })
  .factory('nodeOnline', function () {
    'use strict';
    return require('is-online');
  })
  .factory('nodeGlob', function () {
    'use strict';
    return require('glob');
  })
  .factory('nodeLangInfo', function () {
    'use strict';
    return require('node-lang-info');
  })
  .factory('nodeAdmZip', function () {
    'use strict';
    return require('adm-zip');
  })
  .factory('nodeExtract', function () {
    'use strict';
    return require('extract-zip');
  })
  .factory('nodeGettext', function () {
    'use strict';
    return require('angular-gettext-tools');
  })
  .factory('nodeCP', function () {
    'use strict';
    return require('copy-paste');
  })
  .factory('nodeGetOS', function () {
    'use strict';
    return require('getos');
  })
  .factory('nodeTmp', function () {
    'use strict';
    return require('tmp');
  })
  .factory('nodeDebounce', function () {
    'use strict';
    return require('lodash.debounce');
  })
  .factory('SVGO', function () {
    'use strict';
    var config = {
      full: true,
      plugins: [
        'removeDoctype',
        'removeXMLProcInst',
        'removeComments',
        'removeMetadata',
        'removeXMLNS',
        'removeEditorsNSData',
        'cleanupAttrs',
        'minifyStyles',
        'convertStyleToAttrs',
        'cleanupIDs',
        'removeRasterImages',
        'removeUselessDefs',
        'cleanupNumericValues',
        'cleanupListOfValues',
        'convertColors',
        'removeUnknownsAndDefaults',
        'removeNonInheritableGroupAttrs',
        'removeUselessStrokeAndFill',
        'removeViewBox',
        'cleanupEnableBackground',
        'removeHiddenElems',
        'removeEmptyText',
        'convertShapeToPath',
        'moveElemsAttrsToGroup',
        'moveGroupAttrsToElems',
        'collapseGroups',
        'convertPathData',
        'convertTransform',
        'removeEmptyAttrs',
        'removeEmptyContainers',
        'mergePaths',
        'removeUnusedNS',
        'transformsWithOnePath',
        'sortAttrs',
        'removeTitle',
        'removeDesc',
        'removeDimensions',
        'removeAttrs',
        'removeElementsByAttr',
        'addClassesToSVGElement',
        'removeStyleElement',
        'removeStyleElement',
      ],
    };
    var SVGO = require('svgo');
    return new SVGO(config);
  });
