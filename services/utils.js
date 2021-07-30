angular
  .module('icestudio')
  .service(
    'utils',
    function (
      $rootScope,
      alerts,
      gettextCatalog,
      common,
      _package,
      window,
      nodeFs,
      nodeFse,
      nodePath,
      gui,
      SVGO
    ) {
      'use strict';

      function _tcStr(str, args) {
        return gettextCatalog.getString(str, args);
      }

      function disableEvent(event) {
        event.stopPropagation();
        event.preventDefault();
      }

      this.enableClickEvents = function () {
        document.removeEventListener('click', disableEvent, true);
      };

      this.disableClickEvents = function () {
        document.addEventListener('click', disableEvent, true);
      };

      this.enableKeyEvents = function () {
        document.removeEventListener('keyup', disableEvent, true);
        document.removeEventListener('keydown', disableEvent, true);
        document.removeEventListener('keypress', disableEvent, true);
      };

      this.disableKeyEvents = function () {
        document.addEventListener('keyup', disableEvent, true);
        document.addEventListener('keydown', disableEvent, true);
        document.addEventListener('keypress', disableEvent, true);
      };

      /*
    const nodeZlib = require('zlib');

    function compressJSON(data, callback) {
      var content = JSON.stringify(data);
      nodeZlib.gzip(content, function (_, compressed) {
        if (callback) {
          callback(compressed);
        }
      });
    }

    function decompressJSON(content, callback) {
      nodeZlib.gunzip(content, function(_, uncompressed) {
        var data = JSON.parse(uncompressed);
        if (callback) {
          callback(data);
        }
      });
    }
*/

      this.setLocale = function (locale, callback) {
        locale = splitLocale(locale);
        var supported = getSupportedLanguages();
        var bestLang = bestLocale(locale, supported);
        gettextCatalog.setCurrentLanguage(bestLang);
        gettextCatalog.loadRemote(
          nodePath.join(common.LOCALE_DIR, bestLang, bestLang + '.json')
        );
        var collections = [common.defaultCollection]
          .concat(common.internalCollections)
          .concat(common.externalCollections);
        for (var c in collections) {
          var collection = collections[c];
          var filepath = nodePath.join(
            collection.path,
            'locale',
            bestLang,
            bestLang + '.json'
          );
          if (nodeFs.existsSync(filepath)) {
            gettextCatalog.loadRemote('file://' + filepath);
          }
        }
        if (callback) {
          callback();
        }
        return bestLang;
      };

      function splitLocale(locale) {
        var ret = {};
        var list = locale.split('_');
        if (list.length > 0) {
          ret.lang = list[0];
        }
        if (list.length > 1) {
          ret.country = list[1];
        }
        return ret;
      }

      function getSupportedLanguages() {
        var supported = [];
        nodeFs.readdirSync(common.LOCALE_DIR).forEach((element) => {
          if (
            nodeFs
              .lstatSync(nodePath.join(common.LOCALE_DIR, element))
              .isDirectory()
          ) {
            supported.push(splitLocale(element));
          }
        });
        return supported;
      }

      function bestLocale(locale, supported) {
        var i;
        // 1. Try complete match
        if (locale.country) {
          for (i = 0; i < supported.length; i++) {
            if (
              locale.lang === supported[i].lang &&
              locale.country === supported[i].country
            ) {
              return supported[i].lang + '_' + supported[i].country;
            }
          }
        }
        // 2. Try lang match
        for (i = 0; i < supported.length; i++) {
          if (locale.lang === supported[i].lang) {
            return (
              supported[i].lang +
              (supported[i].country ? '_' + supported[i].country : '')
            );
          }
        }
        // 3. Return default lang
        return 'en';
      }

      this.renderForm = function (specs, callback) {
        var content = [];
        content.push('<form><fieldset>');
        for (var i in specs) {
          var spec = specs[i];
          switch (spec.type) {
            case 'text':
              if (spec.label) {
                content.push(`<label>${spec.label}</label>`);
              }
              content.push(
                `<input class="ajs-input" type="text" id="form${i}"/>`
              );
              break;
            case 'checkbox':
              content.push(`<div class="checkbox">
              <label><input
                type="checkbox"
                ${spec.value ? 'checked ' : ''}
                id="form${i}"
              />${spec.label}</label>
            </div>`);
              break;
            case 'combobox':
              var options = spec.options
                .map(function (option) {
                  return `<option value="${
                    option.value
                  }" ${spec.value === option.value ? ' selected' : ''}>${option.label}</option>`;
                })
                .join('');
              content.push(`<div class="form-group">
              <label style="font-weight:normal">${spec.label}</label>
              <select class="form-control" id="form${i}">${options}</select>
            </div>`);
              break;
          }
        }
        content.push('</fieldset></form>');
        alerts.confirm({
          icon: specs[0].icon || 'question-circle',
          title: specs[0].title || 'Form',
          body: content.join('\n'),
          onok: (evt) => {
            var values = [];
            if (callback) {
              for (var i in specs) {
                var spec = specs[i];
                switch (spec.type) {
                  case 'text':
                  case 'combobox':
                    values.push($('#form' + i).val());
                    break;
                  case 'checkbox':
                    values.push($('#form' + i).prop('checked'));
                    break;
                }
              }
              callback(evt, values);
            }
          },
        });
        // Set default input values
        $('#form0').select();
        for (var i in specs) {
          var spec = specs[i];
          switch (spec.type) {
            case 'text':
            case 'combobox':
              $('#form' + i).val(spec.value);
              break;
            case 'checkbox':
              $('#form' + i).prop('checked', spec.value);
              break;
          }
        }
      };

      this.projectinfoprompt = function (values, callback) {
        var i;
        var content = [];
        var messages = [
          _tcStr('Name'),
          _tcStr('Version'),
          _tcStr('Description'),
          _tcStr('Author'),
        ];
        var n = messages.length;
        var image = values[4];
        var blankImage =
          'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
        content.push('<form><fieldset>');
        for (i in messages) {
          content.push(`<label>${messages[i]}</label>
<input class="ajs-input" id="input${i}" type="text" value="${values[i]}">`);
        }
        const img = image ? 'data:image/svg+xml,' + image : blankImage;
        content.push(`<label>${_tcStr('Image')}</label>
        <input id="input-open-svg" type="file" accept=".svg" class="hidden">
        <input id="input-save-svg" type="file" accept=".svg" class="hidden" nwsaveas="image.svg">
        <div>
          <center>
            <img id="preview-svg" class="ajs-input" src="${img}" height="68" style="pointer-events:none">
          </center>
        </div>
        <div>
          <label
            for="input-open-svg"
            class="btn"
          >${_tcStr('Open SVG')}</label>
          <label
            id="save-svg"
            for="input-save-svg"
            class="btn"
          >${_tcStr('Save SVG')}</label>
          <label
            id="reset-svg"
            class="btn"
          >${_tcStr('Reset SVG')}</label>
        </div>
      </fieldset></form>`);
        // Restore values
        for (i = 0; i < n; i++) {
          $('#input' + i).val(values[i]);
        }
        $('#preview-svg').attr(
          'src',
          image ? 'data:image/svg+xml,' + image : blankImage
        );

        function registerSave() {
          // Save SVG
          var label = $('#save-svg');
          if (image) {
            label.removeClass('disabled');
            label.attr('for', 'input-save-svg');
            var chooserSave = $('#input-save-svg');
            chooserSave.unbind('change');
            chooserSave.change(function (/*evt*/) {
              if (image) {
                var filepath = $(this).val();
                if (!filepath.endsWith('.svg')) {
                  filepath += '.svg';
                }
                nodeFs.writeFile(filepath, decodeURI(image), function (err) {
                  if (err) {
                    throw err;
                  }
                });
                $(this).val('');
              }
            });
          } else {
            label.addClass('disabled');
            label.attr('for', '');
          }
        }

        // Restore onshow
        var prevOnshow = alertify.confirm().get('onshow') || function () {};

        alertify.confirm().set('onshow', function () {
          prevOnshow();

          // Open SVG
          var chooserOpen = $('#input-open-svg');
          chooserOpen.unbind('change');
          chooserOpen.change(function (/*evt*/) {
            var filepath = $(this).val();

            nodeFs.readFile(filepath, 'utf8', function (err, data) {
              if (err) {
                throw err;
              }
              SVGO.optimize(data, function (result) {
                image = encodeURI(result.data);
                registerSave();
                $('#preview-svg').attr('src', 'data:image/svg+xml,' + image);
              });
            });
            $(this).val('');
          });

          registerSave();

          // Reset SVG
          var reset = $('#reset-svg');
          reset.click(function (/*evt*/) {
            image = '';
            registerSave();
            $('#preview-svg').attr('src', blankImage);
          });
        });

        alerts.confirm({
          icon: 'tag',
          title: _tcStr('Project Information'),
          body: content.join('\n'),
          onok: function (evt) {
            var values = [];
            for (var i = 0; i < n; i++) {
              values.push($('#input' + i).val());
            }
            values.push(image);
            if (callback) {
              callback(evt, values);
            }
          },
        });
      };

      this.selectBoardPrompt = function (callback) {
        // Disable user events
        this.disableKeyEvents();
        // Hide Cancel button
        $('.ajs-cancel').addClass('hidden');

        var formSpecs = [
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
        ];

        this.renderForm(
          formSpecs,
          function (evt, values) {
            var selectedBoard = values[0];
            if (selectedBoard) {
              evt.cancel = false;
              if (callback) {
                callback(selectedBoard);
              }
              // Enable user events
              this.enableKeyEvents();
              // Restore Cancel button
              setTimeout(function () {
                $('.ajs-cancel').removeClass('hidden');
              }, 200);
            } else {
              evt.cancel = true;
            }
          }.bind(this)
        );
      };

      this.copySync = function (orig, dest) {
        if (!nodeFs.existsSync(orig)) {
          return false;
        }
        try {
          nodeFse.copySync(orig, dest);
          return true;
        } catch (e) {
          alertify.error(
            _tcStr('Error: {{error}}', {
              error: e.toString(),
            }),
            30
          );
        }
        return false;
      };

      this.findIncludedFiles = function (code) {
        var ret = [];
        var patterns = [
          /[\n|\s]\/\/\s*@include\s+([^\s]*\.(v|vh))(\n|\s)/g,
          /[\n|\s][^\/]?\"(.*\.list?)\"/g,
        ];
        for (var p in patterns) {
          var match;
          while ((match = patterns[p].exec(code))) {
            var file = match[1].replace(/ /g, '');
            if (ret.indexOf(file) === -1) {
              ret.push(file);
            }
          }
        }
        return ret;
      };

      this.openDialog = function (inputID, ext, callback) {
        var chooser = $(inputID);
        chooser.unbind('change');
        chooser.change(function () {
          if (callback) {
            callback($(this).val());
          }
          $(this).val('');
        });
        chooser.trigger('click');
      };

      this.saveDialog = function (inputID, ext, callback) {
        var chooser = $(inputID);
        chooser.unbind('change');
        chooser.change(function () {
          var filepath = $(this).val();
          if (!filepath.endsWith(ext)) {
            filepath += ext;
          }
          if (callback) {
            callback(filepath);
          }
          $(this).val('');
        });
        chooser.trigger('click');
      };

      this.updateWindowTitle = function (title) {
        window.get().title = title;
      };

      this.rootScopeSafeApply = function () {
        if (!$rootScope.$$phase) {
          $rootScope.$apply();
        }
      };

      this.parsePortLabel = function (data, pattern) {
        // e.g: name[x:y]
        var match,
          ret = {};
        var maxSize = 95;
        pattern = pattern || common.PATTERN_PORT_LABEL;
        match = pattern.exec(data);
        if (match && match[0] === match.input) {
          ret.name = match[1] ? match[1] : '';
          ret.rangestr = match[2];
          if (match[2]) {
            if (match[3] > maxSize || match[4] > maxSize) {
              alertify.warning(_tcStr('Maximum bus size: 96 bits'), 5);
              return null;
            } else {
              if (match[3] > match[4]) {
                ret.range = _.range(match[3], parseInt(match[4]) - 1, -1);
              } else {
                ret.range = _.range(match[3], parseInt(match[4]) + 1, +1);
              }
            }
          }
          return ret;
        }
        return null;
      };

      this.parseParamLabel = function (data, pattern) {
        // e.g: name
        var match,
          ret = {};
        pattern = pattern || common.PATTERN_PARAM_LABEL;
        match = pattern.exec(data);
        if (match && match[0] === match.input) {
          ret.name = match[1] ? match[1] : '';
          return ret;
        }
        return null;
      };

      const fastCopy = require('fast-copy');

      this.clone = function (data) {
        // Very slow in comparison but more stable for all types
        // of objects, if fails, rollback to JSON method or try strict
        // on fast-copy module
        //return  JSON.parse(JSON.stringify(data));
        return fastCopy(data);
      };

      const nodeSha1 = require('sha1');

      this.dependencyID = function (dependency) {
        if (dependency.package && dependency.design) {
          return nodeSha1(
            JSON.stringify(dependency.package) +
              JSON.stringify(dependency.design)
          );
        }
      };

      this.newWindow = function (filepath, local) {
        var params = false;

        if (typeof filepath !== 'undefined') {
          params = {
            filepath: filepath,
          };
        }

        if (typeof local !== 'undefined' && local === true) {
          if (params === false) {
            params = {};
          }
          params.local = 'local';
        }
        // To pass parameters to the new project window, we use de GET parameter "icestudio_argv"
        // that contains the same arguments that shell call, in this way the two calls will be
        // compatible.
        // If in the future you will add more paremeters to the new window , you should review
        // controllers/menu.js even if all parameters that arrive are automatically parse

        var url =
          'index.html' +
          (params === false
            ? ''
            : '?icestudio_argv=' + encodeURI(btoa(JSON.stringify(params))));
        // Create a new window and get it.
        // new-instance and new_instance are necesary for OS compatibility
        // to avoid crash on new window project after close parent
        // (little trick for nwjs bug).
        //url='index.html?icestudio_argv=fsdfsfa';

        gui.Window.open(url, {
          // new_instance: true,  //Deprecated for new nwjs versios
          //      'new_instance': true,  //Deprecated for new nwjs versios
          position: 'center',
          //        'toolbar': false,   //Deprecated for new nwjs versios
          width: 900,
          height: 600,
          show: true,
        });
      };

      this.coverPath = coverPath;

      function coverPath(filepath) {
        return '"' + filepath + '"';
      }

      this.mergeDependencies = function (type, block) {
        if (type in common.allDependencies) {
          return; // If the block is already in dependencies
        }
        // Merge the block's dependencies
        var deps = block.dependencies;
        for (var depType in deps) {
          if (!(depType in common.allDependencies)) {
            common.allDependencies[depType] = deps[depType];
          }
        }
        // Add the block as a dependency
        delete block.dependencies;
        common.allDependencies[type] = block;
      };

      const nodeCP = require('copy-paste');

      this.copyToClipboard = function (selection, graph) {
        var cells = selectionToCells(selection, graph);
        var clipboard = {
          icestudio: this.cellsToProject(cells, graph),
        };

        // Send the clipboard object the global clipboard as a string
        nodeCP.copy(JSON.stringify(clipboard), function () {
          // Success
        });
      };

      const nodeGetOS = require('getos');

      this.pasteFromClipboard = function (callback) {
        nodeCP.paste(function (err, text) {
          if (err) {
            if (common.LINUX) {
              // xclip installation message
              var cmd = '';
              var message = _tcStr('{{app}} is required.', {
                app: '<b>xclip</b>',
              });
              nodeGetOS(function (e, os) {
                if (!e) {
                  if (
                    os.dist.indexOf('Debian') !== -1 ||
                    os.dist.indexOf('Ubuntu Linux') !== -1 ||
                    os.dist.indexOf('Linux Mint') !== -1
                  ) {
                    cmd = 'sudo apt-get install xclip';
                  } else if (os.dist.indexOf('Fedora')) {
                    cmd = 'sudo dnf install xclip';
                  } else if (
                    os.dist.indexOf('RHEL') !== -1 ||
                    os.dist.indexOf('RHAS') !== -1 ||
                    os.dist.indexOf('Centos') !== -1 ||
                    os.dist.indexOf('Red Hat Linux') !== -1
                  ) {
                    cmd = 'sudo yum install xclip';
                  } else if (os.dist.indexOf('Arch Linux') !== -1) {
                    cmd = 'sudo pacman install xclip';
                  }
                  if (cmd) {
                    message +=
                      ' ' +
                      _tcStr('Please run: {{cmd}}', {
                        cmd: '<br><b><code>' + cmd + '</code></b>',
                      });
                  }
                }
                alertify.warning(message, 30);
              });
            }
          } else {
            // Parse the global clipboard
            var clipboard = JSON.parse(text);
            if (callback && clipboard && clipboard.icestudio) {
              callback(clipboard.icestudio);
            }
          }
        });
      };

      function selectionToCells(selection, graph) {
        var cells = [];
        var blocksMap = {};
        selection.each(function (block) {
          // Add block
          cells.push(block.attributes);
          // Map blocks
          blocksMap[block.id] = block;
          // Add connected wires
          var processedWires = {};
          var connectedWires = graph.getConnectedLinks(block);
          _.each(connectedWires, function (wire) {
            if (processedWires[wire.id]) {
              return;
            }

            var source = blocksMap[wire.get('source').id];
            var target = blocksMap[wire.get('target').id];

            if (source && target) {
              cells.push(wire.attributes);
              processedWires[wire.id] = true;
            }
          });
        });
        return cells;
      }

      this.cellsToProject = function (cells, opt) {
        // Convert a list of cells into the following sections of a project:
        // - design.graph
        // - dependencies

        var blocks = [];
        var wires = [];
        var p = {
          version: common.VERSION,
          design: {},
          dependencies: {},
        };

        opt = opt || {};

        for (var c = 0; c < cells.length; c++) {
          var cell = cells[c];

          if (
            cell.type === 'ice.Generic' ||
            cell.type === 'ice.Input' ||
            cell.type === 'ice.Output' ||
            cell.type === 'ice.Code' ||
            cell.type === 'ice.Info' ||
            cell.type === 'ice.Constant' ||
            cell.type === 'ice.Memory'
          ) {
            var block = {};
            block.id = cell.id;
            block.type = cell.blockType;
            block.data = cell.data;
            block.position = cell.position;
            if (
              cell.type === 'ice.Generic' ||
              cell.type === 'ice.Code' ||
              cell.type === 'ice.Info' ||
              cell.type === 'ice.Memory'
            ) {
              block.size = cell.size;
            }
            blocks.push(block);
          } else if (cell.type === 'ice.Wire') {
            var wire = {};
            wire.source = {
              block: cell.source.id,
              port: cell.source.port,
            };
            wire.target = {
              block: cell.target.id,
              port: cell.target.port,
            };
            wire.vertices = cell.vertices;
            wire.size = cell.size > 1 ? cell.size : undefined;
            wires.push(wire);
          }
        }

        p.design.board = common.selectedBoard.name;
        p.design.graph = {
          blocks: blocks,
          wires: wires,
        };

        // Update dependencies
        if (opt.deps !== false) {
          var types = this.findSubDependencies(p, common.allDependencies);
          for (var t in types) {
            p.dependencies[types[t]] = common.allDependencies[types[t]];
          }
        }

        return p;
      };

      this.findSubDependencies = function (dependency) {
        var subDependencies = [];
        if (dependency) {
          var blocks = dependency.design.graph.blocks;
          for (var i in blocks) {
            var type = blocks[i].type;
            if (type.indexOf('basic.') === -1) {
              subDependencies.push(type);
              var newSubDependencies = this.findSubDependencies(
                common.allDependencies[type]
              );
              subDependencies = subDependencies.concat(newSubDependencies);
            }
          }
          return _.unique(subDependencies);
        }
        return subDependencies;
      };

      this.hasInputRule = function (port, apply) {
        apply = apply === undefined ? true : apply;
        var _default;
        var rules = common.selectedBoard.rules;
        if (rules) {
          var allInitPorts = rules.input;
          if (allInitPorts) {
            for (var i in allInitPorts) {
              if (port === allInitPorts[i].port) {
                _default = allInitPorts[i];
                _default.apply = apply;
                break;
              }
            }
          }
        }
        return _.clone(_default);
      };

      this.hasLeftButton = function (evt) {
        return evt.which === 1;
      };

      this.hasMiddleButton = function (evt) {
        return evt.which === 2;
      };

      this.hasRightButton = function (evt) {
        return evt.which === 3;
      };

      this.hasButtonPressed = function (evt) {
        return evt.which !== 0;
      };

      this.hasShift = function (evt) {
        return evt.shiftKey;
      };

      this.hasCtrl = function (evt) {
        return evt.ctrlKey;
      };

      const nodeLangInfo = require('node-lang-info');

      this.loadLanguage = function (common, callback) {
        var lang = common.get('language');
        if (lang) {
          this.setLocale(lang, callback);
        } else {
          // If lang is empty, use the system language
          nodeLangInfo(
            function (err, sysLang) {
              if (!err) {
                common.set('language', this.setLocale(sysLang, callback));
              }
            }.bind(this)
          );
        }
      };

      this.digestId = function (id) {
        if (id.indexOf('-') !== -1) {
          id = nodeSha1(id).toString();
        }
        return 'v' + id.substring(0, 6);
      };

      this.startWait = function () {
        angular.element('#menu').addClass('is-disabled');
        $('body').addClass('waiting');
      };

      this.endWait = function () {
        angular.element('#menu').removeClass('is-disabled');
        $('body').removeClass('waiting');
      };

      this.isFunction = function (functionToCheck) {
        return (
          functionToCheck &&
          {}.toString.call(functionToCheck) === '[object Function]'
        );
      };

      this.openUrlExternalBrowser = function (url) {
        gui.Shell.openExternal(url);
        //require('nw.gui').Shell.openExternal( url);
      };

      const DEFAULT_BOARD = 'icestick';

      this.selectBoard = _selectBoard;

      function _selectBoard(name) {
        try {
          name = name || DEFAULT_BOARD;
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
          this.rootScopeSafeApply();
        } catch (err) {
          console.error('[srv.boards._readJSONFile]', err);
        }
      }

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
    }
  );
