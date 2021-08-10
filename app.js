/* eslint-disable no-unused-vars */

angular
  .module('icestudio', ['ui.bootstrap', 'ngRoute', 'gettext'])
  .config([
    '$routeProvider',
    function ($routeProvider) {
      'use strict';
      $routeProvider
        .when('/', {
          templateUrl: 'views/main.html',
          controller: 'MainCtrl',
        })
        .otherwise({
          redirectTo: '/',
        });
    },
  ])
  .config([
    '$compileProvider',
    function ($compileProvider) {
      'use strict';
      $compileProvider.aHrefSanitizationWhitelist(
        /^\s*(https?|local|data|chrome-extension):/
      );
      $compileProvider.imgSrcSanitizationWhitelist(
        /^\s*(https?|local|data|chrome-extension):/
      );
    },
  ])
  .run(function (
    collections,
    common,
    gettextCatalog,
    project,
    tools,
    utils,
    nodeFs
  ) {
    'use strict';

    function _tcStr(str, args) {
      return gettextCatalog.getString(str, args);
    }

    utils.startWait();

    project.updateTitle(gettextCatalog.getString('Untitled'));

    if (nodeFs.existsSync(common.PROFILE_PATH)) {
      try {
        const data = JSON.parse(
          nodeFs.readFileSync(common.PROFILE_PATH, {
            encoding: 'utf8',
            flag: 'r',
          })
        );
        for (var item of [
          'apioRepo',
          'apioRef',
          'board',
          'prog',
          'boardRules',
          'language',
          'theme',
          'collection',
          'collections',
          'externalCollections',
          'externalPlugins',
          'pythonEnv',
        ]) {
          common.data[item] = data[item] || common.data[item];
        }
        if (common.DARWIN) {
          common.data['macosFTDIDrivers'] =
            data.macosFTDIDrivers || common.data['macosFTDIDrivers'];
        }
      } catch (err) {
        console.warn('Profile config parse error:', err);
      }
    }

    collections.loadAllCollections();
    collections.sort();

    function loadLanguage(lang) {
      const blang = utils.setLocale(lang);
      common.set('language', blang);
      $('html').attr('lang', blang);
    }

    var lang = common.get('language');
    if (lang) {
      loadLanguage(lang);
    } else {
      require('node-lang-info')((err, sysLang) => {
        if (!err) {
          loadLanguage(sysLang);
        }
      });
    }

    const _prog = common.get('prog');
    if (_prog != null) {
      common.selectedProgrammer = _prog;
    }

    const _board = common.get('board');
    if (_board === null) {
      utils.disableKeyEvents();
      $('.ajs-cancel').addClass('hidden');
      utils.renderForm(
        [
          {
            type: 'combobox',
            label: _tcStr('Select your board'),
            value: '',
            options: common.boards.map(function (board) {
              return {
                value: board.name,
                label: board.info.label,
              };
            }),
          },
        ],
        function (evt, values) {
          var selectedBoard = values[0];
          if (selectedBoard) {
            evt.cancel = false;
            utils.selectBoard(selectedBoard);
            utils.enableKeyEvents();
            $('.ajs-cancel').removeClass('hidden');
          } else {
            evt.cancel = true;
          }
        }
      );
    } else {
      utils.selectBoard(_board);
    }

    setTimeout(() => {
      utils.endWait();
      tools.checkToolchain();
    }, 1250);
  });

/*
  Factories
*/

angular
  .module('icestudio')
  // Window
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
  })
  // Joint
  .factory('joint', function ($window) {
    'use strict';
    return $window.joint;
  })
  // Node
  .factory('nodeFs', function () {
    'use strict';
    return require('fs');
  })
  .factory('nodeFse', function () {
    'use strict';
    return require('fs-extra');
  })
  .factory('nodePath', function () {
    'use strict';
    return require('path');
  })
  .factory('nodeChildProcess', function () {
    'use strict';
    return require('child_process');
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

/*
  Directives
*/

angular
  .module('icestudio')

  .directive('menutree', function () {
    'use strict';
    /*
    Draws a data structure such as the following, as a dropdown menu with two levels:

    data = [
      {name: "groupname",
      children: [
        { path: "apath", name: "aname" },
        { path: "anotherpath", name: "anothername" },
      ]}
    ]
  */
    return {
      restrict: 'E',
      replace: true,
      scope: {
        data: '=',
        right: '=',
        callback: '&',
      },
      template: `
<ul uib-dropdown-menu ng-show="data.length > 0">
  <child
    ng-repeat="item in data"
    cdata="item"
    callback="click(path)"
    right="right"
  ></child>
</ul>
`,
      link: function (scope /*, element, attrs*/) {
        scope.click = function (path) {
          scope.callback({path: path});
        };
      },
    };
  })

  .directive('child', function ($compile) {
    'use strict';
    return {
      restrict: 'E',
      replace: true,
      scope: {
        cdata: '=',
        right: '=',
        callback: '&',
      },
      template: `
<li
  ng-class="cdata.children ? (right ? \'dropdown-submenu-right\' : \'dropdown-submenu\') : \'\'"
  uib-dropdown
>
  <a href
    ng-click="click(cdata.path)"
    ng-if="!cdata.children"
  >{{ cdata.name | translate }}</a>
  <a href
    uib-dropdown-toggle
    ng-if="cdata.children"
  >{{ cdata.name | translate }}</a>
</li>
`,
      link: function (scope, element /*, attrs*/) {
        scope.click = function (path) {
          scope.callback({path: path});
        };
        if (angular.isArray(scope.cdata.children)) {
          element.append(`
<menutree
  data="cdata.children"
  callback="click(path)"
  right="right"
></menutree>
`);
          $compile(element.contents())(scope);
        }
      },
    };
  });
