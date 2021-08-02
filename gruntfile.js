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
        nwjsVersion = '0.21.6';
        platforms.push('osx64');
        options.scope.push('darwinDependencies');
        distCommands.push('compress:osx64');
        break;
      default:
        grunt.log.errorlns('Unknown target <' + item + '>');
    }
  });

  var gruntCfg = {};

  gruntCfg.copy = {
    dist: {
      files: [
        {
          expand: true,
          cwd: '.',
          dest: 'dist/tmp',
          src: [
            'collection/**',
            'controllers/**',
            'graphics/**',
            'constraints/**/*.*',
            'images/**/*.*',
            'locale/**/*.*',
            'plugins/**/*.*',
            'sample/**/*.*',
            'services/*.js',
            'styles/*.css',
            'uiThemes/**/*.*',
            'viewers/**/*.*',
            'views/*.html',
            'app.js',
            'iceplugmanager.js',
            'index.html',
            'package.json',
          ],
        },
        {
          expand: true,
          dest: 'dist/tmp/docs',
          src: '**',
          cwd: 'docs/_build/html',
        },
        {
          expand: true,
          cwd: 'nmodules',
          dest: 'dist/tmp/node_modules',
          src: '**/*.*',
        },
        {
          expand: true,
          dest: 'dist/tmp/fonts',
          src: '*.*',
          cwd: 'freefont/',
        },
      ],
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
          src: '**',
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

  const WIN32 = process.platform === 'win32';

  var pkg = grunt.file.readJSON('package.json');

  require('load-grunt-tasks')(grunt, options);

  // Project configuration
  grunt.initConfig({
    pkg: pkg,
    compress: gruntCfg.compress, // Compress packages usin zip
    copy: gruntCfg.copy, // Copy dist files
    nwjs: gruntCfg.nwjs, // Execute nw-build packaging

    // Watch files for changes and runs tasks based on the changed files
    watch: {
      scripts: {
        files: [
          'constraints/**/*.*',
          'controllers/*.js',
          'fonts/**',
          'graphics/*.js',
          'images/**/*.*',
          'locale/**/*.*',
          'plugins/**/*.*',
          'samples/**/*.*',
          'services/*.js',
          'styles/*.css',
          'uiThemes/**/*.css',
          'viewers/**/*.*',
          'views/*.html',
          'app.js',
          'iceplugmanager.js',
          'gruntfile.js',
          'index.html',
          'package.json',
          '!cache/**',
          '!collection/**',
          '!dist/**',
          '!node_modules/**',
        ],
        tasks: ['exec:stopNW', 'exec:nw'],
        options: {
          atBegin: true,
          interrupt: true,
        },
      },
    },

    // Execute nw application
    exec: {
      nw: 'nw . 0x0' + (WIN32 ? '' : ' 2>/dev/null'),
      stopNW:
        (WIN32
          ? 'taskkill /F /IM nw.exe >NUL 2>&1'
          : 'killall nw 2>/dev/null || killall nwjs 2>/dev/null') +
        ' || (exit 0)',
    },

    // Empty folders to start fresh
    clean: {
      tmp: ['.tmp', 'dist/tmp'],
      dist: ['dist'],
      modules: ['nmodules', 'node_modules'],
      cache: ['cache'],
    },

    // Generate POT file
    nggettext_extract: {
      pot: {
        files: {
          'locale/template.pot': ['views/*.html', '**/*.js'],
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
            cwd: 'locale',
            dest: 'locale',
            src: ['**/*.po'],
            ext: '.json',
          },
          {
            expand: true,
            cwd: 'collection/locale',
            dest: 'collection/locale',
            src: ['**/*.po'],
            ext: '.json',
          },
        ],
      },
    },
  });

  grunt.registerTask('serve', ['nggettext_compile', 'watch:scripts']);
  grunt.registerTask(
    'dist',
    ['clean:dist', 'nggettext_compile', 'copy:dist', 'nwjs'].concat(
      distCommands
    )
  );
};

// Disable Deprecation Warnings
var os = require('os');
os.tmpDir = os.tmpdir;
