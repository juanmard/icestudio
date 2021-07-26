/* eslint-disable new-cap */

angular
  .module('icestudio')
  .service('common', function ($log, nodeFs, nodePath) {
    'use strict';

    const self = this;

    // Project version
    this.VERSION = '1.2';

    // Project status
    this.topModule = true;
    this.hasChangesSinceBuild = false;

    // All project dependencies
    this.allDependencies = {};

    // Boards
    this.boards = [];
    this.devices = [];
    this.selectedProgrammer = null;
    this.selectedBoard = null;
    this.selectedDevice = null;
    this.pinoutInputHTML = '';
    this.pinoutOutputHTML = '';

    // Collections
    this.defaultCollection = null;
    this.internalCollections = [];
    this.externalCollections = [];

    // FPGA resources
    this.FPGAResources = {
      ffs: '-',
      luts: '-',
      pios: '-',
      plbs: '-',
      brams: '-',
    };

    // Debug mode (uncomment)
    // this.DEBUGMODE = 1;

    // Command output
    this.commandOutput = '';

    // OS
    this.LINUX = Boolean(process.platform.indexOf('linux') > -1);
    this.WIN32 = Boolean(process.platform.indexOf('win32') > -1);
    this.MSYSTEM = Boolean(process.env.MSYSTEM != undefined);
    this.DARWIN = Boolean(process.platform.indexOf('darwin') > -1);

    // Paths
    this.LOCALE_DIR = nodePath.join('locale');
    this.DEFAULT_COLLECTION_DIR = nodePath.resolve('collection');
    this.DEFAULT_PLUGIN_DIR = nodePath.resolve('plugins');

    this.BASE_DIR = process.env.HOME || process.env.USERPROFILE;
    this.LOGFILE = nodePath.join(this.BASE_DIR, 'icestudio.log');

    this.ICESTUDIO_DIR = nodePath.join(
      this.BASE_DIR,
      this.WIN32 && !this.MSYSTEM && process.arch === 'ia32'
        ? 'icestudio_home'
        : '.icestudio'
    );

    this.INTERNAL_COLLECTIONS_DIR = nodePath.join(
      this.ICESTUDIO_DIR,
      'collections'
    );
    this.APIO_HOME_DIR = nodePath.join(this.ICESTUDIO_DIR, 'apio');
    this.PROFILE_PATH = nodePath.join(this.ICESTUDIO_DIR, 'profile.json');

    this.APP_DIR = nodePath.dirname(process.execPath);

    //-- Folder name for the virtual environment
    this.ENV_DIR = nodePath.join(this.ICESTUDIO_DIR, 'venv');
    this.ENV_BIN_DIR = nodePath.join(
      this.ENV_DIR,
      this.WIN32 && !this.MSYSTEM ? 'Scripts' : 'bin'
    );
    this.ENV_APIO = nodePath.join(
      this.ENV_BIN_DIR,
      this.WIN32 ? 'apio.exe' : 'apio'
    );
    this.APIO_CMD = this.WIN32
      ? `set APIO_HOME_DIR="${this.APIO_HOME_DIR}"& "${this.ENV_APIO}"`
      : `export APIO_HOME_DIR="${this.APIO_HOME_DIR}"; "${this.ENV_APIO}"`;

    const nodeTmp = require('tmp');

    this.BUILD_DIR = new nodeTmp.dirSync({
      prefix: 'icestudio-',
      unsafeCleanup: true,
    }).name;
    this.BUILD_DIR_TMP = this.BUILD_DIR;

    this.PATTERN_PORT_LABEL =
      /^([A-Za-z_][A-Za-z_$0-9]*)?(\[([0-9]+):([0-9]+)\])?$/;
    this.PATTERN_PARAM_LABEL = /^([A-Za-z_][A-Za-z_$0-9]*)?$/;

    this.PATTERN_GLOBAL_PORT_LABEL = /^([^\[\]]+)?(\[([0-9]+):([0-9]+)\])?$/;
    this.PATTERN_GLOBAL_PARAM_LABEL = /^([^\[\]]+)?$/;

    this.setBuildDir = function (buildpath) {
      if (!nodeFs.existsSync(buildpath)) {
        try {
          nodeFs.mkdirSync(buildpath, {recursive: true});
          this.BUILD_DIR = buildpath;
          return;
        } catch (e) {}
      }
      this.BUILD_DIR = this.BUILD_DIR_TMP;
    };

    this.isEditingSubmodule = false;

    // Read list of subdirs of 'constraints' which do not start with '_';
    // for each, read 'info.json' and 'rules'.json'.
    // Generate list of boards and list of devices.
    try {
      var boards = [];
      var devices = [];
      var dpath = nodePath.join('constraints', 'devices');
      nodeFs.readdirSync(dpath).forEach((ditem) => {
        const ddata = _readJSONFile(dpath, ditem);
        devices.push({
          name: ditem.slice(0, -5),
          resources: ddata,
        });
      });
      var rpath = nodePath.join('constraints', 'boards');
      nodeFs.readdirSync(rpath).forEach((bdir) => {
        if (bdir[0] !== '_' && !nodePath.extname(bdir)) {
          const bpath = nodePath.join(rpath, bdir);
          const idata = _readJSONFile(bpath, 'info.json');
          const mdata = nodeFs.existsSync(nodePath.join(bpath, 'iomode.json'))
            ? _readJSONFile(bpath, 'iomode.json')
            : {};
          var pinout = [];
          for (const [key, value] of Object.entries(idata.pinout)) {
            const constraint = mdata[key];
            pinout.push({
              name: key,
              value: value,
              type: constraint ? constraint : 'inout',
            });
          }
          idata.pinout = pinout;
          boards.push({
            name: bdir,
            info: idata,
            rules: _readJSONFile(bpath, 'rules.json'),
          });
          if (
            devices.filter((obj) => {
              return obj.name === idata.device;
            }).length < 1
          ) {
            console.log(
              'Resource info of device',
              idata.device,
              'not available!'
            );
            devices.push({name: idata.device});
          }
        }
      });
      self.boards = boards;
      self.devices = devices;
    } catch (err) {
      console.error('[srv.boards.loadBoards]', err);
    }

    function _readJSONFile(filepath, filename) {
      try {
        return JSON.parse(
          nodeFs.readFileSync(nodePath.join(filepath, filename))
        );
      } catch (err) {
        $log.error('[srv.boards._readJSONFile]', err);
      }
      return {};
    }

    this.boardLabel = function (name) {
      const label = this.boards.find((board) => board.name === name).info.label;
      return label ? label : name;
    };
  });
