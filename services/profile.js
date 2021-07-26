angular
  .module('icestudio')
  .service(
    'profile',
    function (utils, common, gettextCatalog, _package, nodeFs) {
      'use strict';

      const defaultData = {
        apioRepo: 'juanmard/icestudio',
        apioRef: 'apio-dev',
        board: null,
        prog: null,
        boardRules: true,
        language: null,
        uiTheme: 'light',
        collection: null,
        collections: null,
        externalCollections: null,
        externalPlugins: null,
        pythonEnv: null,
      };

      if (common.DARWIN) {
        defaultData['macosFTDIDrivers'] = false;
      }

      this.data = defaultData;

      this.load = function (callback) {
        utils
          .readFile(common.PROFILE_PATH)
          .then((data) => {
            for (var item of [
              'apioRepo',
              'apioRef',
              'board',
              'prog',
              'boardRules',
              'language',
              'uiTheme',
              'collection',
              'collections',
              'externalCollections',
              'externalPlugins',
              'pythonEnv',
            ]) {
              this.data[item] = data[item] || defaultData[item];
            }
            //-- Custom Theme support
            if (this.data.uiTheme !== 'light') {
              let cssFile =
                '<link  rel="stylesheet" href="uiThemes/dark/dark.css">';
              let pHead = document.getElementsByTagName('head')[0];
              pHead.innerHTML = pHead.innerHTML + cssFile;
            }
            //-- End Custom Theme support
            if (common.DARWIN) {
              this.data['macosFTDIDrivers'] =
                data.macosFTDIDrivers || defaultData['macosFTDIDrivers'];
            }
            if (callback) {
              callback();
            }
          })
          .catch(function (error) {
            console.warn(error);
            if (callback) {
              callback();
            }
          });
      }.bind(this);

      this.set = function (key, value) {
        if (this.data.hasOwnProperty(key)) {
          this.data[key] = value;
          this.save();
        }
      };

      this.get = function (key) {
        return this.data[key];
      };

      this.save = function () {
        if (!nodeFs.existsSync(common.ICESTUDIO_DIR)) {
          nodeFs.mkdirSync(common.ICESTUDIO_DIR);
        }
        utils.saveFile(common.PROFILE_PATH, this.data).catch(function (error) {
          alertify.error(error, 30);
        });
      };

      this.setBoard = function (board) {
        this.set('board', board.name);
        alertify.success(
          gettextCatalog.getString('Board {{name}} selected', {
            name: utils.bold(board.info.label),
          })
        );
      };

      this.setProgrammer = function (name) {
        this.set('prog', name);
        alertify.success(
          gettextCatalog.getString('Programmer {{name}} selected', {
            name: utils.bold(name),
          })
        );
      };
    }
  );
