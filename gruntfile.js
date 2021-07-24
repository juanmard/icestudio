/* eslint-disable camelcase */

module.exports = function (grunt) {
  'use strict';

  var platforms = [];
  var distCommands = [];
  var options = {scope: ['devDependencies']};
  var nwjsVersion = '0.35.5';

  function targetLin(bits) {
    platforms.push('linux' + bits);
    distCommands.push('compress:linux' + bits);
  }
  function targetWin(bits) {
    platforms.push('win' + bits);
    distCommands.push('compress:win' + bits);
  }
  function targetOSX() {
    nwjsVersion = '0.21.6';
    platforms.push('osx64');
    options.scope.push('darwinDependencies');
    distCommands.push('compress:osx64');
  }
  var targets = process.env.DIST_TARGET;
  if (targets === undefined) {
    targets = process.platform === 'darwin' ? 'osx' : 'lin,win';
  }
  targets.split(',').forEach(function (item) {
    switch (item) {
      case 'lin64':
        targetLin('64');
        break;
      case 'lin32':
        targetLin('32');
        break;
      case 'lin':
        targetLin('64');
        targetLin('32');
        break;
      case 'win64':
        targetWin('64');
        break;
      case 'win32':
        targetWin('32');
        break;
      case 'win':
        targetWin('64');
        targetWin('32');
        break;
      case 'osx':
        targetOSX();
        break;
      default:
        grunt.log.errorlns('Unknown target <' + item + '>');
    }
  });

  var gruntCfg = {};

  const sources = [
    'controllers/**',
    'fonts/Lato2OFLWeb/Lato/**',
    'graphics/**',
    'libs/**',
    'node_modules/**/*.*',
    'resources/**/*.*',
    'services/*.js',
    'styles/*.css',
    'views/*.html',
    '*.js',
    'index.html',
    'package.json',
  ];

  var copyArgs = [
    {
      expand: true,
      cwd: 'app',
      dest: 'dist/tmp',
      src: sources,
    },
    {
      expand: true,
      dest: 'dist/tmp/docs',
      src: '**',
      cwd: 'docs/_build/html',
    },
  ];

  for (var font of [
    'app/fonts/freefont/',
    'app/node_modules/font-awesome/fonts',
  ]) {
    copyArgs.push({
      expand: true,
      dest: 'dist/tmp/fonts',
      src: '*.*',
      cwd: font,
    });
  }

  gruntCfg.copy = {
    dist: {
      files: copyArgs,
    },
  };

  gruntCfg.nwjs = {
    options: {
      version: nwjsVersion,
      flavor: 'sdk', // 'normal' (stable) | 'sdk' (development)
      zip: false,
      buildDir: 'dist/',
      winIco: 'docs/_static/img/logo/icestudio-logo.ico',
      macIcns: 'docs/_static/img/logo/nw.icns',
      macPlist: {CFBundleIconFile: 'app'},
      platforms: platforms,
    },
    src: ['dist/tmp/**'],
  };

  function _compress(os, bits) {
    return {
      options: {
        archive: 'dist/<%=pkg.name%>-<%=pkg.version%>-' + os + bits + '.zip',
      },
      files: [
        {
          expand: true,
          cwd: 'dist/icestudio/' + os + bits + '/',
          src: ['**'].concat(sources),
          dest: '<%=pkg.name%>-<%=pkg.version%>-' + os + bits,
        },
      ],
    };
  }

  function _compressOSX(tgt) {
    var opts = _compress('osx', tgt);
    opts.files.src = ['icestudio.app/**'];
    return opts;
  }

  gruntCfg.compress = {
    linux32: _compress('linux', '32'),
    linux64: _compress('linux', '64'),
    win32: _compress('win', '32'),
    win64: _compress('win', '64'),
    osx32: _compressOSX('32'),
    osx64: _compressOSX('64'),
  };

  gruntCfg.watch = {
    scripts: {
      files: [
        'app/**/*.*',
        '!app/node_modules/**',
        '!app/resources/collection/**',
      ],
      tasks: ['exec:stopNW', 'exec:nw'],
      options: {
        atBegin: true,
        interrupt: true,
      },
    },
  };

  gruntCfg.wget = {
    python32: {
      options: {overwrite: false},
      src: 'https://www.python.org/ftp/python/3.8.2/python-3.8.2.exe',
      dest: 'cache/python/python-3.8.2.exe',
    },
    python64: {
      options: {overwrite: false},
      src: 'https://www.python.org/ftp/python/3.8.2/python-3.8.2-amd64.exe',
      dest: 'cache/python/python-3.8.2-amd64.exe',
    },
    collection: {
      options: {overwrite: false},
      src: 'https://github.com/FPGAwars/collection-default/archive/v<%=pkg.collection%>.zip',
      dest: 'cache/collection/collection-default-v<%=pkg.collection%>.zip',
    },
  };

  const WIN32 = process.platform === 'win32';

  var pkg = grunt.file.readJSON('app/package.json');

  require('load-grunt-tasks')(grunt, options);

  // Project configuration
  grunt.initConfig({
    pkg: pkg,
    compress: gruntCfg.compress, // Compress packages usin zip
    copy: gruntCfg.copy, // Copy dist files
    nwjs: gruntCfg.nwjs, // Execute nw-build packaging
    watch: gruntCfg.watch, // Watch files for changes and runs tasks based on the changed files
    wget: gruntCfg.wget, // Wget: Python installer and Default collection

    // Execute nw application
    exec: {
      nw: 'nw app 0x0' + (WIN32 ? '' : ' 2>/dev/null'),
      stopNW:
        (WIN32
          ? 'taskkill /F /IM nw.exe >NUL 2>&1'
          : 'killall nw 2>/dev/null || killall nwjs 2>/dev/null') +
        ' || (exit 0)',
      nsis32:
        'makensis -DARCH=win32 -DPYTHON="python-3.8.2.exe" -DVERSION=<%=pkg.version%> -V3 scripts/windows_installer.nsi',
      nsis64:
        'makensis -DARCH=win64 -DPYTHON="python-3.8.2-amd64.exe" -DVERSION=<%=pkg.version%> -V3 scripts/windows_installer.nsi',
    },

    // JSON minification plugin without concatination
    'json-minify': {
      json: {files: 'dist/tmp/resources/**/*.json'},
      ice: {files: 'dist/tmp/resources/**/*.ice'},
    },

    // Unzip Default collection
    unzip: {
      'using-router': {
        router: function (filepath) {
          return filepath.replace(/^collection-default-.*?\//g, 'collection/');
        },
        src: 'cache/collection/collection-default-v<%=pkg.collection%>.zip',
        dest: 'app/resources/',
      },
    },

    // Empty folders to start fresh
    clean: {
      tmp: ['.tmp', 'dist/tmp'],
      dist: ['dist'],
      collection: ['app/resources/collection'],
      // node: ['node_modules'],
      // appnode: ['app/node_modules'],
      // cache: ['cache']
    },

    // Generate POT file
    nggettext_extract: {
      pot: {
        files: {
          'app/resources/locale/template.pot': [
            'app/views/*.html',
            'app/**/*.js',
          ],
        },
      },
    },

    // Compile PO files into JSON
    nggettext_compile: {
      all: {
        options: {format: 'json'},
        files: [
          {
            expand: true,
            cwd: 'app/resources/locale',
            dest: 'app/resources/locale',
            src: ['**/*.po'],
            ext: '.json',
          },
          {
            expand: true,
            cwd: 'app/resources/collection/locale',
            dest: 'app/resources/collection/locale',
            src: ['**/*.po'],
            ext: '.json',
          },
        ],
      },
    },
  });

  grunt.registerTask('getcollection', [
    'clean:collection',
    'wget:collection',
    'unzip',
  ]);
  grunt.registerTask('serve', ['nggettext_compile', 'watch:scripts']);
  grunt.registerTask(
    'dist',
    [
      'clean:dist',
      'nggettext_compile',
      'copy:dist',
      'json-minify',
      'nwjs',
    ].concat(distCommands)
  );
};

// Disable Deprecation Warnings
var os = require('os');
os.tmpDir = os.tmpdir;
