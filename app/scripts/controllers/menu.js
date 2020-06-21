/* eslint-disable camelcase */

angular
  .module('icestudio')
  .controller('MenuCtrl', function (
    $log,
    $rootScope,
    $scope,
    $uibModal,
    _package,
    alerts,
    collections,
    common,
    gettextCatalog,
    graph,
    gui,
    profile,
    project,
    shortcuts,
    tools,
    utils,
    nodeFs,
    nodePath
  ) {
    'use strict';

    const _tcStr = function (str, args) {
      return gettextCatalog.getString(str, args);
    };

    if (!$scope.status) {
      $scope.status = {};
    }

    $scope.common = common;
    $scope.profile = profile;
    $scope.project = project;
    $scope.tools = tools;
    $scope.toolchain = tools.toolchain;
    $scope.workingdir = '';
    $scope.snapshotdir = '';

    $scope.openWindow = _openWindow;
    $scope.selectBoard = _selectBoard;
    $scope.openProjectDialog = _openProjectDialog;
    $scope.openProject = _openProject;
    $scope.addAsBlock = _addAsBlock;
    $scope.saveProject = _saveProject;
    $rootScope.saveProjectAs = _saveProjectAs;
    $scope.newProject = utils.newWindow;
    $scope.quit = _exit;
    $scope.fitContent = () => {
      graph.fitContent();
    };
    $scope.setProjectInformation = _setProjectInformation;

    $scope.setPreferences = function () {
      $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title',
        ariaDescribedBy: 'modal-body',
        templateUrl: 'views/preferences.html',
        controller: 'PrefCtrl',
        size: 'lg',
      });
    };

    // Convert the list of boards into a format suitable for 'menutree' directive
    $scope.boardMenu = common.devices.map(function (key) {
      return {
        name: key,
        children: common.boards
          .filter((x) => x.info.device === key)
          .map(function (x) {
            return {path: x.name, name: x.info.label};
          }),
      };
    });

    var zeroProject = true; // New project without changes
    var resultAlert = null;
    var winCommandOutput = null;

    var undoStack = {
      builds: [],
      changes: [],
    };

    var currentUndoStack = [];

    // Window events
    var win = gui.Window.get();
    win.on('close', function () {
      _exit();
    });
    win.on('resize', function () {
      graph.fitContent();
    });

    // Darwin fix for shortcuts
    if (process.platform === 'darwin') {
      var mb = new gui.Menu({type: 'menubar'});
      mb.createMacBuiltin('Icestudio');
      win.menu = mb;
    }

    win.focus();

    // FIXME: all the args parsing below does NOT belong in the "menu controller"!

    // Parse GET url parmeters for window instance arguments all arguments will be embeded in icestudio_argv param (stringified JSON)
    // https://developer.mozilla.org/es/docs/Web/JavaScript/Referencia/Objetos_globales/unescape
    // unescape is deprecated javascript function, should use decodeURI instead

    const loc = window.location.search;
    var queryStr =
      (loc.indexOf('?icestudio_argv=')
        ? decodeURI(loc)
        : '?icestudio_argv=' +
          atob(decodeURI(loc.replace('?icestudio_argv=', '')))) + '&';

    $log.debug('[cnt.menu] window.location.search:', window.location.search);
    $log.debug('[cnt.menu] queryStr:', queryStr);

    var argv = window.opener.opener ? [] : gui.App.argv;

    var val = queryStr.replace(/.*?[&\\?]icestudio_argv=(.*?)&.*/, '$1');
    if (val !== queryStr) {
      // If there are url params, compatibilize it with shell call
      var params = JSON.parse(decodeURI(val));
      $log.debug('[cnt.menu] params:', params);
      if (params) {
        for (var idx in params) {
          argv.push(params[idx]);
        }
      }
    }

    $log.debug('[cnt.menu] argv:', argv);

    var local = false;
    for (var arg of argv) {
      if (nodeFs.existsSync(arg)) {
        project.open(arg);
      } else {
        switch (arg) {
          case 'local':
            local = true;
            break;
          default:
            // Move window
            var data = arg.split('x');
            win.moveTo(parseInt(data[0], 10), parseInt(data[1], 10));
        }
      }
    }

    if (_isEditable(project.path) || !local) {
      updateWorkingdir(project.path);
    } else {
      project.path = '';
    }

    // Plugins
    $scope.plugins = ICEpm.plugins;

    function _isEditable(fpath) {
      const cond = [_isInDefault(fpath, false), _isInInternal(fpath, false)];
      const editable = !cond[0] && !cond[1];
      $log.debug('[cnt.menu._isEditable] fpath:', fpath);
      $log.debug(
        '[cnt.menu._isEditable] _isInDefault:',
        common.DEFAULT_COLLECTION_DIR,
        cond[0]
      );
      $log.debug(
        '[cnt.menu._isEditable] _isInInternal:',
        common.INTERNAL_COLLECTIONS_DIR,
        cond[1]
      );
      $log.debug('[cnt.menu._isEditable] editable?', editable);
      return editable;
    }

    function _isInCollection(fpath, name, cpath) {
      return name
        ? fpath.startsWith(nodePath.join(cpath, name))
        : fpath.startsWith(cpath);
    }

    function _isInDefault(fpath, name) {
      return _isInCollection(fpath, name, common.DEFAULT_COLLECTION_DIR);
    }

    function _isInInternal(fpath, name) {
      return _isInCollection(fpath, name, common.INTERNAL_COLLECTIONS_DIR);
    }

    function _isInExternal(fpath) {
      return _isInCollection(fpath, name, profile.get('externalCollections'));
    }

    //-- File

    $scope.export = _export;

    shortcuts.method('newProject', utils.newWindow);
    shortcuts.method('openProject', _openProjectDialog);
    shortcuts.method('saveProject', _saveProject);
    shortcuts.method('saveProjectAs', _saveProjectAs);
    shortcuts.method('quit', $scope.quit);

    function _openProjectDialog() {
      utils.openDialog('#input-open-project', '.ice', function (filepath) {
        // This is the first action, open the project in the same window
        if (zeroProject) {
          updateWorkingdir(filepath);
          project.open(filepath);
          return;
        }
        // If the file path is different, open the project in a new window
        if (project.changed || !equalWorkingFilepath(filepath)) {
          utils.newWindow(filepath);
          return;
        }
        // FIXME: should not fail silently, but produce a meaningful warning
      });
    }

    function _openProject(filepath) {
      if (zeroProject) {
        // This is the first action, open the project in the same window
        updateWorkingdir(_isEditable(filepath) ? filepath : '');
        project.open(filepath, true);
        return;
      }
      utils.newWindow(filepath, true);
    }

    function _saveProject() {
      if (common.isEditingSubmodule) {
        alerts.alert({
          icon: 'save',
          title: _tcStr('Saving submodules is not supported yet'),
          body: _tcStr(
            "However, you can export this submodule through 'File > Save as...'"
          ),
        });
        return;
      }
      var filepath = project.path;
      if (filepath) {
        project.save(filepath, function () {
          reloadCollectionsIfRequired(filepath);
        });
        resetChangedStack();
      } else {
        _saveProjectAs();
      }
    }

    function _saveProjectAs() {
      function _saveProjectAsDialog() {
        utils.saveDialog('#input-save-project', '.ice', function (filepath) {
          updateWorkingdir(filepath);
          project.save(filepath, function () {
            reloadCollectionsIfRequired(filepath);
          });
          resetChangedStack();
        });
      }

      if (common.isEditingSubmodule) {
        alerts.confirm({
          icon: 'hdd-o',
          title: _tcStr('Export submodule'),
          body: _tcStr(
            'You are about to export a submodule, NOT the full design. Do you want to continue?'
          ),
          onok: function () {
            _saveProjectAsDialog();
          },
          invokeOnCloseOff: false,
        });
      } else {
        _saveProjectAsDialog();
      }
    }

    function reloadCollectionsIfRequired(filepath) {
      if (_isInInternal(filepath, false)) {
        collections.loadInternalCollections();
      }
      if (_isInExternal(filepath, false)) {
        collections.loadExternalCollections();
      }
    }

    function _addAsBlock() {
      var notification = true;
      utils.openDialog('#input-add-as-block', '.ice', function (filepaths) {
        filepaths = filepaths.split(';');
        for (var i in filepaths) {
          project.addBlockFile(filepaths[i], notification);
        }
      });
    }

    function _export(etype) {
      switch (etype) {
        case 'v':
          exportFromCompiler('verilog', 'Verilog', '.v');
          break;
        case 'pcf':
          exportFromCompiler('pcf', 'PCF', '.pcf');
          break;
        case 'tb':
          exportFromCompiler('testbench', 'Testbench', '.v');
          break;
        case 'gtkw':
          exportFromCompiler('gtkwave', 'GTKWave', '.gtkw');
          break;
        case 'blif':
          exportFromBuilder('blif', 'BLIF', '.blif');
          break;
        case 'asc':
          exportFromBuilder('asc', 'ASC', '.asc');
          break;
        case 'bin':
          exportFromBuilder('bin', 'Bitstream', '.bin');
          break;
        default:
          $log.error(`Unknown export type ${etype}!`);
      }
    }

    function exportFromCompiler(id, name, ext) {
      checkGraph()
        .then(function () {
          // TODO: export list files
          utils.saveDialog('#input-export-' + id, ext, function (filepath) {
            // Save the compiler result
            var data = project.compile(id)[0].content;
            utils
              .saveFile(filepath, data)
              .then(function () {
                alertify.success(
                  _tcStr('{{name}} exported', {
                    name: name,
                  })
                );
              })
              .catch(function (error) {
                alertify.error(error, 30);
              });
            // Update the working directory
            updateWorkingdir(filepath);
          });
        })
        .catch(function () {});
    }

    function exportFromBuilder(id, name, ext) {
      checkGraph()
        .then(function () {
          return tools.buildCode();
        })
        .then(function () {
          resetBuildStack();
        })
        .then(function () {
          utils.saveDialog('#input-export-' + id, ext, function (filepath) {
            // Copy the built file
            if (
              utils.copySync(
                nodePath.join(common.BUILD_DIR, 'hardware' + ext),
                filepath
              )
            ) {
              alertify.success(
                _tcStr('{{name}} exported', {
                  name: name,
                })
              );
            }
            // Update the working directory
            updateWorkingdir(filepath);
          });
        })
        .catch(function () {});
    }

    function updateWorkingdir(filepath) {
      $scope.workingdir = utils.dirname(filepath) + utils.sep;
    }

    function equalWorkingFilepath(filepath) {
      return $scope.workingdir + project.name + '.ice' === filepath;
    }

    function _exit() {
      function __exit() {
        //win.hide();
        win.close(true);
      }

      if (!project.changed) {
        __exit();
        return;
      }
      alerts.confirm({
        icon: 'warning',
        title: _tcStr('Do you want to close the application?'),
        body: _tcStr('Your changes will be lost if you don’t save them'),
        onok: function () {
          __exit();
        },
      });
    }

    //-- Edit

    $scope.undoGraph = () => {
      graph.undo();
    };
    $scope.redoGraph = () => {
      graph.redo();
    };
    $scope.cutSelected = () => {
      graph.cutSelected();
    };
    $scope.copySelected = () => {
      graph.copySelected();
    };
    $scope.pasteSelected = _pasteSelected;
    $scope.pasteAndCloneSelected = _pasteAndCloneSelected;
    $scope.selectAll = _selectAll;

    shortcuts.method('undoGraph', $scope.undoGraph);
    shortcuts.method('redoGraph', $scope.redoGraph);
    shortcuts.method('redoGraph2', $scope.redoGraph);
    shortcuts.method('cutSelected', $scope.cutSelected);
    shortcuts.method('copySelected', $scope.copySelected);
    shortcuts.method('pasteAndCloneSelected', $scope.pasteAndCloneSelected);
    shortcuts.method('pasteSelected', $scope.pasteSelected);
    shortcuts.method('selectAll', $scope.selectAll);
    shortcuts.method('fitContent', $scope.fitContent);

    var paste = true;

    function _pasteSelected() {
      if (paste) {
        paste = false;
        graph.pasteSelected();
        setTimeout(function () {
          paste = true;
        }, 250);
      }
    }

    function _pasteAndCloneSelected() {
      if (paste) {
        graph.pasteAndCloneSelected();
      }
    }

    function _selectAll() {
      checkGraph()
        .then(function () {
          graph.selectAll();
        })
        .catch(function () {});
    }

    $(document).on('infoChanged', function (evt, newValues) {
      var values = getProjectInformation();
      if (!_.isEqual(values, newValues)) {
        graph.setInfo(values, newValues, project);
        alertify.message(
          _tcStr('Project information updated') +
            '.<br>' +
            _tcStr('Click here to view'),
          5
        ).callback = function (isClicked) {
          if (isClicked) {
            _setProjectInformation();
          }
        };
      }
    });

    function _setProjectInformation() {
      var values = getProjectInformation();
      utils.projectinfoprompt(values, function (evt, newValues) {
        if (!_.isEqual(values, newValues)) {
          if (
            common.isEditingSubmodule &&
            common.submoduleId &&
            common.allDependencies[common.submoduleId]
          ) {
            graph.setBlockInfo(values, newValues, common.submoduleId);
          } else {
            graph.setInfo(values, newValues, project);
          }
          alertify.success(_tcStr('Project information updated'));
        }
      });
    }

    function getProjectInformation() {
      var p =
        subModuleActive &&
        common.submoduleId &&
        common.allDependencies[common.submoduleId]
          ? common.allDependencies[common.submoduleId].package
          : project.get('package');
      return [p.name, p.version, p.description, p.author, p.image];
    }

    $scope.toggleBoardRules = function () {
      graph.setBoardRules(!profile.get('boardRules'));
      alertify.success(
        _tcStr(
          'Board rules ' + (profile.get('boardRules') ? 'enabled' : 'disabled')
        )
      );
    };

    $scope.setPythonEnv = function () {
      let pythonEnv = profile.get('pythonEnv');
      let formSpecs = [{
        type: 'text',
        title: gettextCatalog.getString('Enter the python version > 3.8 path'),
        value: pythonEnv.python || ''
      },{
        type: 'text',
        title: gettextCatalog.getString('Enter the pip version > 3.8 path'),
        value:  pythonEnv.pip || ''

      }
    ];
      utils.renderForm(formSpecs, function (evt, values) {

        let newPythonPath= values[0];
        let newPipPath= values[1];

        if (resultAlert) {
          resultAlert.dismiss(false);
        }
        if (newPythonPath !== pythonEnv.python || newPipPath !== pythonEnv.pip) {
          if (
            (newPythonPath === '' || nodeFs.existsSync(newPythonPath) ) &&
             (newPipPath === '' || nodeFs.existsSync(newPipPath) )
             ){

               let newPythonEnv ={python: newPythonPath, pip:newPipPath};
            profile.set('pythonEnv', newPythonEnv);

            alertify.success(gettextCatalog.getString('Python Environment updated'));
          } else {
            evt.cancel = true;
            resultAlert = alertify.error(gettextCatalog.getString('Path {{path}} does not exist', {
              path: 'of python or pip'
            }, 5));
          }
        }
      });
    };

    //-- View

    $scope.showPCF = function () {
      gui.Window.open(
        'resources/viewers/plain/pcf.html?board=' + common.selectedBoard.name,
        {
          title: common.selectedBoard.info.label + ' - PCF',
          focus: true,
          //toolbar: false,
          resizable: true,
          width: 700,
          height: 700,
          min_width: 300,
          min_height: 300,
          icon: 'resources/images/icestudio-logo.png',
        }
      );
    };

    $scope.svgPinoutAvailable = function () {
      if (common.selectedBoard) {
        return nodeFs.existsSync(
          nodePath.join(
            'resources',
            'boards',
            common.selectedBoard.name,
            'pinout.svg'
          )
        );
      }
      return false;
    };
    $scope.showSvgPinout = function () {
      var board = common.selectedBoard;
      if (this.svgPinoutAvailable()) {
        gui.Window.open(
          'resources/viewers/svg/pinout.html?board=' + board.name,
          {
            title: common.selectedBoard.info.label + ' - Pinout',
            focus: true,
            //toolbar: false,
            resizable: true,
            width: 500,
            height: 700,
            min_width: 300,
            min_height: 300,
            icon: 'resources/images/icestudio-logo.png',
          }
        );
      } else {
        alertify.warning(
          _tcStr('{{board}} pinout not defined', {
            board: utils.bold(board.info.label),
          }),
          5
        );
      }
    };

    $scope.showDatasheet = function () {
      var board = common.selectedBoard;
      if (board.info.datasheet) {
        gui.Shell.openExternal(board.info.datasheet);
      } else {
        alertify.error(
          _tcStr('{{board}} datasheet not defined', {
            board: utils.bold(board.info.label),
          }),
          5
        );
      }
    };

    $scope.showBoardRules = function () {
      var board = common.selectedBoard;
      var rules = JSON.stringify(board.rules);
      if (rules !== '{}') {
        var encRules = encodeURIComponent(rules);
        gui.Window.open(
          'resources/viewers/table/rules.html?rules=' + encRules,
          {
            title: common.selectedBoard.info.label + ' - Rules',
            focus: true,
            // toolbar: false,
            resizable: false,
            width: 500,
            height: 500,
            min_width: 300,
            min_height: 300,
            icon: 'resources/images/icestudio-logo.png',
          }
        );
      } else {
        alertify.error(
          _tcStr('{{board}} rules not defined', {
            board: utils.bold(board.info.label),
          }),
          5
        );
      }
    };

    function _openWindow(url, title) {
      $log.log(url);
      return gui.Window.open(url, {
        title: title,
        focus: true,
        //toolbar: false,
        resizable: true,
        width: 700,
        height: 400,
        min_width: 300,
        min_height: 300,
        icon: 'resources/images/icestudio-logo.png',
      });
    }

    $scope.showCommandOutput = function () {
      winCommandOutput = _openWindow(
        'resources/viewers/plain/output.html?content=' +
          encodeURIComponent(common.commandOutput),
        _tcStr('Command output')
      );
    };

    $(document).on('commandOutputChanged', function (evt, commandOutput) {
      if (winCommandOutput) {
        try {
          winCommandOutput.window.location.href =
            'resources/viewers/plain/output.html?content=' +
            encodeURIComponent(commandOutput);
        } catch (e) {
          winCommandOutput = null;
        }
      }
    });

    //-- Boards

    $(document).on('boardChanged', function (evt, board) {
      if (common.selectedBoard.name !== board.name) {
        graph.selectBoard(board);
        profile.set('board', common.selectedBoard.name);
      }
    });

    function _selectBoard(name) {
      let board = undefined;
      for (const val of common.boards) {
        if (val.name === name) {
          board = val;
          break;
        }
      }

      if (common.selectedBoard.name !== name) {
        if (!graph.isEmpty()) {
          alerts.confirm({
            icon: 'microchip',
            title: _tcStr('Do you want to change to {{name}} board?', {
              name: utils.bold(board.info.label),
            }),
            body: _tcStr('The current FPGA I/O configuration will be lost.'),
            onok: function () {
              _selectBoardNotify(board);
            },
          });
        } else {
          _selectBoardNotify(board);
        }
      }

      function _selectBoardNotify(board) {
        graph.selectBoard(board, true);
        profile.setBoard(common.selectedBoard);
      }
    }

    //-- Tools

    $scope.verifyCode = function () {
      checkGraph()
        .then(function () {
          return tools.verifyCode(
            _tcStr('Start verification'),
            _tcStr('Verification done')
          );
        })
        .catch(function () {});
    };

    var submoduleActionAlertBody = _tcStr(
      'Inside submodules, <strong><i class="fa fa-fw fa-check"></i> Verify</strong> is supported only.'
    );

    $scope.buildCode = function () {
      if (common.isEditingSubmodule) {
        alerts.alert({
          icon: 'gear',
          title: _tcStr('Building submodules is not supported yet'),
          body: submoduleActionAlertBody,
        });
        return;
      }

      checkGraph()
        .then(function () {
          return tools.buildCode(_tcStr('Start build'), _tcStr('Build done'));
        })
        .then(function () {
          resetBuildStack();
        })
        .catch(function () {});
    };

    $scope.uploadCode = function () {
      if (common.isEditingSubmodule) {
        alerts.alert({
          icon: 'rocket',
          title: _tcStr('Uploading submodules is not supported yet'),
          body: submoduleActionAlertBody,
        });
        return;
      }

      checkGraph()
        .then(function () {
          return tools.uploadCode(
            _tcStr('Start upload'),
            _tcStr('Upload done')
          );
        })
        .then(function () {
          resetBuildStack();
        })
        .catch(function () {});
    };

    function checkGraph() {
      return new Promise(function (resolve, reject) {
        if (!graph.isEmpty()) {
          resolve();
        } else {
          if (resultAlert) {
            resultAlert.dismiss(true);
          }
          resultAlert = alertify.warning(_tcStr('Add a block to start'), 5);
          reject();
        }
      });
    }

    $scope.openUrl = function (url, $event) {
      $event.preventDefault();
      utils.openUrlExternalBrowser(url);
      return false;
    };

    $scope.about = function () {
      alerts.alert({
        icon: 'heart-o',
        title: 'Icestudio, visual editor for Verilog designs',
        body: $('#about')[0],
        onok: function () {
          if (tools.canCheckVersion) {
            tools.checkForNewVersion();
          }
        },
        label: tools.canCheckVersion
          ? _tcStr('Check for updates...')
          : _tcStr('Close'),
        invokeOnCloseOff: false,
      });
    };

    // Events

    $(document).on('stackChanged', function (evt, undoStack) {
      currentUndoStack = undoStack;
      var undoStackString = JSON.stringify(undoStack);
      project.changed = JSON.stringify(undoStack.changes) !== undoStackString;
      project.updateTitle();
      zeroProject = false;
      common.hasChangesSinceBuild =
        JSON.stringify(undoStack.builds) !== undoStackString;
      utils.rootScopeSafeApply();
    });

    function resetChangedStack() {
      undoStack.changes = currentUndoStack;
      project.changed = false;
      project.updateTitle();
    }

    function resetBuildStack() {
      undoStack.builds = currentUndoStack;
      common.hasChangesSinceBuild = false;
      utils.rootScopeSafeApply();
    }

    $(document).on('keydown', function (event) {
      event.stopImmediatePropagation();
      if (
        shortcuts.execute(event, {
          prompt: false,
          disabled: !graph.isEnabled(),
        }).preventDefault
      ) {
        event.preventDefault();
      }
    });

    function takeSnapshot() {
      win.capturePage(function (img) {
        var base64Data = img.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
        saveSnapshot(base64Data);
      }, 'png');
    }

    function saveSnapshot(base64Data) {
      utils.saveDialog('#input-save-snapshot', '.png', function (filepath) {
        nodeFs.writeFile(filepath, base64Data, 'base64', function (err) {
          $scope.snapshotdir = utils.dirname(filepath) + utils.sep;
          $scope.$apply();
          if (!err) {
            alertify.success(
              _tcStr('Image {{name}} saved', {
                name: utils.bold(utils.basename(filepath)),
              })
            );
          } else {
            throw err;
          }
        });
      });
    }

    // -- Tools

    shortcuts.method('verifyCode', $scope.verifyCode);
    shortcuts.method('buildCode', $scope.buildCode);
    shortcuts.method('uploadCode', $scope.uploadCode);

    // -- Misc

    shortcuts.method('stepUp', graph.stepUp);
    shortcuts.method('stepDown', graph.stepDown);
    shortcuts.method('stepLeft', graph.stepLeft);
    shortcuts.method('stepRight', graph.stepRight);

    shortcuts.method('removeSelected', project.removeSelected);
    shortcuts.method('back', function () {
      if (graph.isEnabled()) {
        project.removeSelected();
      } else {
        $rootScope.breadcrumbsBack();
      }
    });

    shortcuts.method('takeSnapshot', takeSnapshot);
  });
