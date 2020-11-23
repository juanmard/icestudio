angular
  .module('icestudio')
  .service(
    'project',
    function (
      $rootScope,
      alerts,
      common,
      compiler,
      gettextCatalog,
      graph,
      gui,
      nodeFs,
      nodePath,
      profile,
      utils
    ) {
      'use strict';

      const _tcStr = function (str, args) {
        return gettextCatalog.getString(str, args);
      };

      this.name = ''; // Used in File dialogs
      this.path = ''; // Used in Save / Save as
      this.filepath = ''; // Used to find external resources (.v, .vh, .list)
      this.changed = false;
      this.backup = false;
      var project = _default();

      function _default() {
        return {
          version: common.VERSION,
          package: {
            name: '',
            version: '',
            description: '',
            author: '',
            image: '',
          },
          design: {
            board: '',
            graph: {blocks: [], wires: []},
          },
          dependencies: {},
        };
      }

      this.get = function (key) {
        return key in project ? project[key] : project;
      };

      this.set = function (key, obj) {
        if (key in project) {
          project[key] = obj;
        }
      };

      this.open = function (filepath, emptyPath) {
        console.debug('[srv.project.open] filepath:', filepath);
        console.debug('[srv.project.open] emptyPath:', emptyPath);
        var self = this;
        this.path = emptyPath ? '' : filepath;
        this.filepath = filepath;
        utils
          .readFile(filepath)
          .then(function (data) {
            var name = utils.basename(filepath);
            self.filename = name;
            self.dirname = utils.dirname(filepath);
            self.load(name, data);
          })
          .catch(function () {
            alertify.error(_tcStr('Invalid project format'), 30);
          });
      };

      this.load = function (name, data) {
        var self = this;
        if (!checkVersion(data.version)) {
          return;
        }
        project = _safeLoad(data, name);
        console.debug(
          '[srv.project.load] common.selectedBoard',
          common.selectedBoard
        );
        // FIXME: when opening an example in a new window, sometimes (frequently) common.selectedBoard is 'null' here
        if (
          common.selectedBoard &&
          project.design.board !== common.selectedBoard.name
        ) {
          var projectBoard = common.boardLabel(project.design.board);
          alerts.confirm({
            icon: 'microchip',
            title: _tcStr('This project is designed for &lt;{{name}}&gt;', {
              name: projectBoard,
            }),
            body: _tcStr(
              'You can convert it for the &lt;{{name}}&gt; board or change the selected board.',
              {name: common.selectedBoard.info.label}
            ),
            onok: () => {
              project.design.board = common.selectedBoard.name;
              _load(
                true,
                boardMigration(projectBoard, common.selectedBoard.name)
              );
            },
            oncancel: _load,
            labels: {
              ok: _tcStr('Convert'),
              cancel: _tcStr('Change board'),
            },
          });
        } else {
          _load();
        }

        function _load(reset, originalBoard) {
          common.allDependencies = project.dependencies;
          var opt = {reset: reset || false, disabled: false};
          if (originalBoard !== undefined && originalBoard !== false) {
            for (var i = 0; i < common.boards.length; i++) {
              if (String(common.boards[i].name) === String(originalBoard)) {
                opt.originalPinout = common.boards[i].info['pinout'];
              }
              if (
                String(common.boards[i].name) === String(project.design.board)
              ) {
                opt.designPinout = common.boards[i].info['pinout'];
              }
            }
          }
          var ret = graph.loadDesign(project.design, opt, function () {
            graph.resetCommandStack();
            graph.fitContent();
            alertify.success(
              _tcStr('Project {{name}} loaded', {
                name: utils.bold(name),
              })
            );
            common.hasChangesSinceBuild = true;
          });
          if (ret) {
            utils.selectBoard(project.design.board);
            profile.set('board', common.selectedBoard.name);
            self.updateTitle(name);
            let bdir = utils.filepath2buildpath(self.filepath);
            common.setBuildDir(bdir);
          } else {
            alertify.error(
              _tcStr('Wrong project format: {{name}}', {
                name: utils.bold(name),
              }),
              30
            );
          }
        }
      };

      function boardMigration(oldBoard, newBoard) {
        var pboard = false;
        switch (oldBoard.toLowerCase()) {
          case 'icezum alhambra':
          case 'icezum':
            switch (newBoard.toLowerCase()) {
              case 'alhambra-ii':
                pboard = 'icezum';
                break;
              default:
                pboard = 'icezum';
            }
            break;
        }
        return pboard;
      }

      function checkVersion(version) {
        if (version > common.VERSION) {
          var errorAlert = alertify.error(
            _tcStr('Unsupported project format {{version}}', {
              version: version,
            }),
            30
          );
          alertify.message(
            _tcStr(
              'Click here to <b>download a newer version</b> of Icestudio'
            ),
            30
          ).callback = function (isClicked) {
            if (isClicked) {
              errorAlert.dismiss(false);
              gui.Shell.openExternal(
                'https://github.com/FPGAwars/icestudio/releases'
              );
            }
          };
          return false;
        }
        return true;
      }

      function _safeLoad(data, name) {
        // Backwards compatibility
        var project = {};
        switch (data.version) {
          case common.VERSION:
          case '1.1':
            project = data;
            break;
          case '1.0':
            project = convert10To12(data);
            break;
          default:
            project = convertTo10(data, name);
            project = convert10To12(project);
            break;
        }
        project.version = common.VERSION;
        return project;
      }

      function convert10To12(data) {
        var project = _default();
        project.package = data.package;
        project.design.board = data.design.board;
        project.design.graph = data.design.graph;

        var depsInfo = findSubDependencies10(data.design.deps);
        replaceType10(project, depsInfo);
        for (var d in depsInfo) {
          var dep = depsInfo[d];
          replaceType10(dep.content, depsInfo);
          project.dependencies[dep.id] = dep.content;
        }

        return project;
      }

      function findSubDependencies10(deps) {
        var depsInfo = {};
        for (var key in deps) {
          var block = utils.clone(deps[key]);
          // Go recursive
          var subDepsInfo = findSubDependencies10(block.design.deps);
          for (var name in subDepsInfo) {
            if (!(name in depsInfo)) {
              depsInfo[name] = subDepsInfo[name];
            }
          }
          // Add current dependency
          block = pruneBlock(block);
          delete block.design.deps;
          block.package.name = block.package.name || key;
          block.package.description = block.package.description || key;
          if (!(key in depsInfo)) {
            depsInfo[key] = {
              id: utils.dependencyID(block),
              content: block,
            };
          }
        }
        return depsInfo;
      }

      function replaceType10(project, depsInfo) {
        for (var i in project.design.graph.blocks) {
          var type = project.design.graph.blocks[i].type;
          if (type.indexOf('basic.') === -1) {
            project.design.graph.blocks[i].type = depsInfo[type].id;
          }
        }
      }

      function convertTo10(data, name) {
        var project = {
          version: '1.0',
          package: {
            name: name || '',
            version: '',
            description: name || '',
            author: '',
            image: '',
          },
          design: {
            board: '',
            graph: {},
            deps: {},
          },
        };
        for (var b in data.graph.blocks) {
          var block = data.graph.blocks[b];
          switch (block.type) {
            case 'basic.input':
            case 'basic.output':
            case 'basic.outputLabel':
            case 'basic.inputLabel':
              block.data = {
                name: block.data.label,
                pins: [
                  {
                    index: '0',
                    name: block.data.pin ? block.data.pin.name : '',
                    value: block.data.pin ? block.data.pin.value : '0',
                  },
                ],
                virtual: false,
              };
              break;
            case 'basic.constant':
              block.data = {
                name: block.data.label,
                value: block.data.value,
                local: false,
              };
              break;
            case 'basic.code':
              var params = [];
              for (var p in block.data.params) {
                params.push({
                  name: block.data.params[p],
                });
              }
              var inPorts = [];
              for (var i in block.data.ports.in) {
                inPorts.push({
                  name: block.data.ports.in[i],
                });
              }

              var outPorts = [];
              for (var o in block.data.ports.out) {
                outPorts.push({
                  name: block.data.ports.out[o],
                });
              }
              block.data = {
                code: block.data.code,
                params: params,
                ports: {
                  in: inPorts,
                  out: outPorts,
                },
              };
              break;
          }
        }
        project.design.board = data.board;
        project.design.graph = data.graph;
        // Safe load all dependencies recursively
        for (var key in data.deps) {
          project.design.deps[key] = convertTo10(data.deps[key], key);
        }

        return project;
      }

      this.save = function (filepath, callback) {
        var backupProject = false;
        var name = utils.basename(filepath);
        if (common.isEditingSubmodule) {
          backupProject = utils.clone(project);
        } else {
          this.updateTitle(name);
        }

        sortGraph();
        this.update();

        // Copy included files if the previous filepath
        // is different from the new filepath
        if (this.filepath !== filepath) {
          var origPath = utils.dirname(this.filepath);
          var destPath = utils.dirname(filepath);
          // 1. Parse and find included files
          var code = compiler.generate('verilog', project)[0].content;
          var listFiles = compiler.generate('list', project);
          var internalFiles = listFiles.map(function (res) {
            return res.name;
          });
          var files = utils.findIncludedFiles(code);
          files = _.difference(files, internalFiles);
          // Are there included files?
          if (files.length > 0) {
            // 2. Check project's directory
            if (filepath) {
              // 3. Copy the included files
              copyIncludedFiles(files, origPath, destPath, function (success) {
                if (success) {
                  // 4. Success: save project
                  doSaveProject();
                }
              });
            }
          } else {
            // No included files to copy
            // 4. Save project
            doSaveProject();
          }
        } else {
          // Same filepath
          // 4. Save project
          doSaveProject();
        }
        if (common.isEditingSubmodule) {
          project = utils.clone(backupProject);
          //        sortGraph();
          //        this.update();
        } else {
          this.path = filepath;
          this.filepath = filepath;
        }
        let self = this;
        function doSaveProject() {
          utils
            .saveFile(filepath, pruneProject(project))
            .then(function () {
              if (callback) {
                callback();
              }
              let bdir = utils.filepath2buildpath(self.filepath);
              common.setBuildDir(bdir);
              alertify.success(
                _tcStr('Project {{name}} saved', {
                  name: utils.bold(name),
                })
              );
            })
            .catch(function (error) {
              alertify.error(error, 30);
            });
        }
      };

      function sortGraph() {
        var cells = graph.getCells();

        // Sort Constant/Memory cells by x-coordinate
        cells = _.sortBy(cells, function (cell) {
          if (
            cell.get('type') === 'ice.Constant' ||
            cell.get('type') === 'ice.Memory'
          ) {
            return cell.get('position').x;
          }
        });

        // Sort I/O cells by y-coordinate
        cells = _.sortBy(cells, function (cell) {
          if (
            cell.get('type') === 'ice.Input' ||
            cell.get('type') === 'ice.Output'
          ) {
            return cell.get('position').y;
          }
        });

        graph.setCells(cells);
      }

      function _addBlockFile(self, orig, name, data, notify) {
        function _importBlock() {
          self.addBlock(block);
          if (notify) {
            alertify.success(
              _tcStr('Block {{name}} imported', {
                name: utils.bold(block.package.name),
              })
            );
          }
        }

        var block = _safeLoad(data, name);
        if (!block) {
          return;
        } // FIXME: should produce a meaningful error

        // 1. Parse and find included files
        var code = compiler.generate('verilog', block)[0].content;
        var internalFiles = compiler
          .generate('list', block)
          .map(function (res) {
            return res.name;
          });
        var files = _.difference(utils.findIncludedFiles(code), internalFiles);

        function _importBlockWithFiles() {
          copyIncludedFiles(
            files,
            orig,
            utils.dirname(self.path),
            function (success) {
              if (success) {
                _importBlock();
              } // FIXME: should notify if something went wrong, instead of failing silently...
            }
          );
        }

        if (!files.length) {
          _importBlock();
          return;
        }
        if (self.path) {
          _importBlockWithFiles();
          return;
        }

        alerts.confirm({
          title: _tcStr('This import operation requires a project path'),
          body: _tcStr(
            'You need to save the current project. Do you want to continue?'
          ),
          onok: () => {
            $rootScope.saveProjectAs();
            _importBlockWithFiles();
          },
          labels: {
            ok: _tcStr('Save'),
            cancel: _tcStr('Cancel'),
          },
        });
      }

      this.addBlockFile = function (filepath, notify) {
        var self = this;
        utils
          .readFile(filepath)
          .then(function (data) {
            if (!checkVersion(data.version)) {
              return;
            } // FIXME: should produce a meaningful error
            _addBlockFile(
              self,
              utils.dirname(filepath),
              utils.basename(filepath),
              data,
              notify
            );
          })
          .catch(function (e) {
            console.log(e);
            alertify.error(_tcStr('Invalid project format'), 30); // FIXME: other reasons might produce an error
          });
      };

      function copyIncludedFiles(files, origPath, destPath, callback) {
        var success = true;
        async.eachSeries(
          files,
          function (filename, next) {
            setTimeout(function () {
              if (origPath !== destPath) {
                function _ok() {
                  if (!(success && doCopySync(origPath, destPath, filename))) {
                    return next();
                  } // break
                  next();
                }
                if (nodeFs.existsSync(nodePath.join(destPath, filename))) {
                  alerts.confirm({
                    icon: 'question',
                    title: _tcStr(
                      'File {{file}} already exists in the project path',
                      {
                        file: utils.bold(filename),
                      }
                    ),
                    body: _tcStr('Do you want to replace it?'),
                    onok: _ok,
                    oncancel: next,
                  });
                } else {
                  _ok();
                }
              } else {
                return next(); // break
              }
            }, 0);
          },
          function (/*result*/) {
            return callback(success);
          }
        );
      }

      function doCopySync(origPath, destPath, filename) {
        var orig = nodePath.join(origPath, filename);
        var dest = nodePath.join(destPath, filename);
        var success = utils.copySync(orig, dest);
        if (success) {
          alertify.message(
            _tcStr('File {{file}} imported', {
              file: utils.bold(filename),
            }),
            5
          );
        } else {
          alertify.error(
            _tcStr('Original file {{file}} does not exist', {
              file: utils.bold(filename),
            }),
            30
          );
        }
        return success;
      }

      function pruneProject(project) {
        var _project = utils.clone(project);

        _prune(_project);
        for (var d in _project.dependencies) {
          _prune(_project.dependencies[d]);
        }

        function _prune(_project) {
          delete _project.design.state;
          for (var i in _project.design.graph.blocks) {
            var block = _project.design.graph.blocks[i];
            switch (block.type) {
              case 'basic.input':
              case 'basic.output':
              case 'basic.outputLabel':
              case 'basic.inputLabel':
              case 'basic.constant':
              case 'basic.memory':
                break;
              case 'basic.code':
                for (var j in block.data.ports.in) {
                  delete block.data.ports.in[j].default;
                }
                break;
              case 'basic.info':
                delete block.data.text;
                break;
              default:
                // Generic block
                delete block.data;
                break;
            }
          }
        }

        return _project;
      }

      this.snapshot = function () {
        this.backup = utils.clone(project);
      };

      this.restoreSnapshot = function () {
        project = utils.clone(this.backup);
      };

      this.update = function (opt, callback) {
        var graphData = graph.toJSON();
        var p = utils.cellsToProject(graphData.cells, opt);
        project.design.board = p.design.board;
        project.design.graph = p.design.graph;
        project.dependencies = p.dependencies;
        if (
          common.isEditingSubmodule &&
          common.submoduleId &&
          common.allDependencies[common.submoduleId]
        ) {
          project.package = common.allDependencies[common.submoduleId].package;
        }
        var state = graph.getState();
        project.design.state = {
          pan: {
            x: parseFloat(state.pan.x.toFixed(4)),
            y: parseFloat(state.pan.y.toFixed(4)),
          },
          zoom: parseFloat(state.zoom.toFixed(4)),
        };

        if (callback) {
          callback();
        }
      };

      this.updateTitle = function (name) {
        if (name) {
          this.name = name;
          graph.resetTitle(name);
        }
        var title = (this.changed ? '*' : '') + this.name + ' ─ Icestudio';
        utils.updateWindowTitle(title);
      };

      this.compile = function (target) {
        this.update();
        var opt = {boardRules: profile.get('boardRules')};
        return compiler.generate(target, project, opt);
      };

      this.addBasicBlock = function (type) {
        graph.createBasicBlock(type);
      };

      this.addBlock = function (block) {
        if (block) {
          block = _safeLoad(block);
          block = pruneBlock(block);
          if (block.package.name.toLowerCase().indexOf('generic-') === 0) {
            var dat = new Date();
            var seq = dat.getTime();
            block.package.otid = seq;
          }
          var type = utils.dependencyID(block);
          utils.mergeDependencies(type, block);
          graph.createBlock(type, block);
        }
      };

      function pruneBlock(block) {
        // Remove all unnecessary information for a dependency:
        // - version, board, FPGA I/O pins (->size if >1), virtual flag
        delete block.version;
        delete block.design.board;
        var i, pins;
        for (i in block.design.graph.blocks) {
          if (
            block.design.graph.blocks[i].type === 'basic.input' ||
            block.design.graph.blocks[i].type === 'basic.output' ||
            block.design.graph.blocks[i].type === 'basic.outputLabel' ||
            block.design.graph.blocks[i].type === 'inputLabel'
          ) {
            if (block.design.graph.blocks[i].data.size === undefined) {
              pins = block.design.graph.blocks[i].data.pins;
              block.design.graph.blocks[i].data.size =
                pins && pins.length > 1 ? pins.length : undefined;
            }
            delete block.design.graph.blocks[i].data.pins;
            delete block.design.graph.blocks[i].data.virtual;
          }
        }
        return block;
      }

      this.removeSelected = function () {
        graph.removeSelected();
      };

      this.clear = function () {
        project = _default();
        graph.clearAll();
        graph.resetTitle();
        graph.resetCommandStack();
      };
    }
  );
