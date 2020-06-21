angular
  .module('icestudio')
  .service('boards', function (common, nodeFs, nodePath, utils) {
    'use strict';

    const DEFAULT = 'icestick';

    this.loadBoards = _loadBoards;
    this.selectBoard = _selectBoard;

    // Read list of subdirs of 'resources/boards' which do not start with '_';
    // for each, read 'info.json' and 'rules'.json'.
    // Generate list of boards and list of devices.
    function _loadBoards() {
      try {
        var boards = [];
        var devices = [];
        var rpath = nodePath.join('resources', 'boards');
        nodeFs.readdirSync(rpath).forEach((bdir) => {
          if (bdir[0] !== '_' && !nodePath.extname(bdir)) {
            const bpath = nodePath.join(rpath, bdir);
            const idata = _readJSONFile(bpath, 'info.json');
            boards.push({
              name: bdir,
              info: idata,
              rules: _readJSONFile(bpath, 'rules.json'),
            });
            if (devices.indexOf(idata.device) < 0) {
              devices.push(idata.device);
            }
          }
        });
        common.boards = boards;
        common.devices = devices.sort();
      } catch (err) {
        console.error('[srv.boards.loadBoards]', err);
      }
    }

    function _readJSONFile(filepath, filename) {
      try {
        return JSON.parse(
          nodeFs.readFileSync(nodePath.join(filepath, filename))
        );
      } catch (err) {
        console.error('[srv.boards._readJSONFile]', err);
      }
      return {};
    }

    function _selectBoard(name) {
      try {
        name = name || DEFAULT;
        common.selectedBoard = common.boards.find((x) => x.name === name);
        if (!common.selectedBoard) {
          console.error(`[srv.boards._selectBoard] board ${name} not found!`);
          return;
        }
        common.selectedDevice = common.selectedBoard.info.device;
        common.pinoutInputHTML = generateHTMLOptions(
          common.selectedBoard.info['pinout'],
          'input'
        );
        common.pinoutOutputHTML = generateHTMLOptions(
          common.selectedBoard.info['pinout'],
          'output'
        );
        utils.rootScopeSafeApply();
      } catch (err) {
        console.error('[srv.boards._readJSONFile]', err);
      }
    }

    this.boardLabel = function (name) {
      const label = common.boards.find((board) => board.name === name).info
        .label;
      return label ? label : name;
    };

    function generateHTMLOptions(pinout, type) {
      var code = '<option></option>';
      for (var i in pinout) {
        if (pinout[i].type === type || pinout[i].type === 'inout') {
          code +=
            '<option value="' +
            pinout[i].value +
            '">' +
            pinout[i].name +
            '</option>';
        }
      }
      return code;
    }
  });
