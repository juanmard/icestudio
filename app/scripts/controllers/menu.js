/* eslint-disable camelcase */

angular
  .module('icestudio')
  .controller('MenuCtrl', function (
    $log,
    $rootScope,
    $scope,
    profile,
    project,
    collections,
    graph,
    tools,
    utils,
    common,
    shortcuts,
    gettextCatalog,
    gui,
    _package,
    nodeFs,
    nodePath
  ) {
    'use strict';

    $scope.common = common;
    $scope.profile = profile;
    $scope.project = project;
    $scope.tools = tools;
    $scope.toolchain = tools.toolchain;
    $scope.workingdir = '';
    $scope.snapshotdir = '';

    $scope.openProjectDialog = _openProjectDialog;
    $scope.openProject = _openProject;
    $scope.saveProject = _saveProject;
    $scope.saveProjectAs = _saveProjectAs;
    $scope.newProject = utils.newWindow;
    $scope.quit = _exit;

    // Convert the list of boards into a format suitable for 'menutree' directive
    function _getBoardsMenu(boards) {
      let boardList = [];
      for (const val of boards) {
        let exists = false;
        for (const fam of boardList) {
          if (!boardList.hasOwnProperty(fam)) {
            if (fam.name === val.type) {
              fam.children.push({path: val.name, name: val.info.label});
              exists = true;
              break;
            }
          }
        }
        if (!exists) {
          boardList.push({
            name: val.type,
            children: [{path: val.name, name: val.info.label}],
          });
        }
      }
      return boardList;
    }

    $scope.common.boardMenu = _getBoardsMenu(common.boards);

    $scope.languages = [
      ['ca_ES', 'Catalan'],
      ['cs_CZ', 'Czech'],
      ['de_DE', 'German'],
      ['el_GR', 'Greek'],
      ['en', 'English'],
      ['es_ES', 'Spanish'],
      ['eu_ES', 'Basque'],
      ['fr_FR', 'French'],
      ['gl_ES', 'Galician'],
      ['it_IT', 'Italian'],
      ['ko_KR', 'Korean'],
      ['nl_NL', 'Dutch'],
      ['ru_RU', 'Russian'],
      ['zh_CN', 'Chinese'],
    ];

    $scope.themes = [
      ['dark', 'Dark'],
      ['light', 'Light'],
    ];

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

    console.debug('[cnt.menu] window.location.search:', window.location.search);
    console.debug('[cnt.menu] queryStr:', queryStr);

    var argv = window.opener.opener ? [] : gui.App.argv;

    var val = queryStr.replace(/.*?[&\\?]icestudio_argv=(.*?)&.*/, '$1');
    if (val !== queryStr) {
      // If there are url params, compatibilize it with shell call
      var params = JSON.parse(decodeURI(val));
      console.debug('[cnt.menu] params:', params);
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
      console.debug('[cnt.menu._isEditable] fpath:', fpath);
      console.debug(
        '[cnt.menu._isEditable] _isInDefault:',
        common.DEFAULT_COLLECTION_DIR,
        cond[0]
      );
      console.debug(
        '[cnt.menu._isEditable] _isInInternal:',
        common.INTERNAL_COLLECTIONS_DIR,
        cond[1]
      );
      console.debug('[cnt.menu._isEditable] editable?', editable);
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
        alertify.alert(
          gettextCatalog.getString('Save submodule'),
          gettextCatalog.getString(
            'To save your design you need to lock the keylock and go to top level design.<br/><br/>If you want to export this submodule to a file, execute "Save as" command to do it.'
          ),
          function () {}
        );
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

    function _saveProjectAsDialog(localCallback) {
      utils.saveDialog('#input-save-project', '.ice', function (filepath) {
        updateWorkingdir(filepath);
        project.save(filepath, function () {
          reloadCollectionsIfRequired(filepath);
        });
        resetChangedStack();
        if (localCallback) {
          localCallback();
        }
      });
    }

    function _saveProjectAs(localCallback) {
      if (common.isEditingSubmodule) {
        alertify.confirm(
          gettextCatalog.getString('Export submodule'),
          gettextCatalog.getString(
            'You are editing a submodule, if you save it, you save only the submodule (in this situation "save as" works like "export module"), Do you like to continue?'
          ),
          function () {
            _saveProjectAsDialog(localCallback);
          },
          function () {}
        );
      } else {
        _saveProjectAsDialog(localCallback);
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

    $scope.addAsBlock = function () {
      var notification = true;
      utils.openDialog('#input-add-as-block', '.ice', function (filepaths) {
        filepaths = filepaths.split(';');
        for (var i in filepaths) {
          project.addBlockFile(filepaths[i], notification);
        }
      });
    };

    $scope.export = function (etype) {
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
          console.error(`Unknown export type ${etype}!`);
      }
    };

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
                  gettextCatalog.getString('{{name}} exported', {
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
                gettextCatalog.getString('{{name}} exported', {
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
      alertify
        .confirm(
          gettextCatalog.getString('Do you want to close the application?'),
          gettextCatalog.getString(
            'Your changes will be lost if you don’t save them'
          ),
          function () {
            __exit();
          },
          function () {}
        )
        .setting({
          labels: {
            ok: gettextCatalog.getString('Close'),
          },
          defaultFocus: 'cancel',
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

    shortcuts.method('undoGraph', $scope.undo);
    shortcuts.method('redoGraph', $scope.redoGraph);
    shortcuts.method('redoGraph2', $scope.redoGraph);
    shortcuts.method('cutSelected', $scope.cutSelected);
    shortcuts.method('copySelected', $scope.copySelected);
    shortcuts.method('pasteAndCloneSelected', $scope.pasteAndCloneSelected);
    shortcuts.method('pasteSelected', $scope.pasteSelected);
    shortcuts.method('selectAll', $scope.selectAll);
    shortcuts.method('fitContent', $scope.fitContent);

    var paste = true;

    $scope.pasteSelected = function () {
      if (paste) {
        paste = false;
        graph.pasteSelected();
        setTimeout(function () {
          paste = true;
        }, 250);
      }
    };

    $scope.pasteAndCloneSelected = function () {
      if (paste) {
        graph.pasteAndCloneSelected();
      }
    };

    $scope.selectAll = function () {
      checkGraph()
        .then(function () {
          graph.selectAll();
        })
        .catch(function () {});
    };

    function removeSelected() {
      project.removeSelected();
    }

    $scope.fitContent = function () {
      graph.fitContent();
    };

    $scope.setExternalCollections = function () {
      var externalCollections = profile.get('externalCollections');
      utils.renderForm(
        [
          {
            type: 'text',
            title: gettextCatalog.getString(
              'Enter the external collections path'
            ),
            value: externalCollections || '',
          },
        ],
        function (evt, values) {
          var newExternalCollections = values[0];
          if (resultAlert) {
            resultAlert.dismiss(false);
          }
          if (newExternalCollections !== externalCollections) {
            if (
              newExternalCollections === '' ||
              nodeFs.existsSync(newExternalCollections)
            ) {
              profile.set('externalCollections', newExternalCollections);
              collections.loadExternalCollections();
              utils.rootScopeSafeApply();
              alertify.success(
                gettextCatalog.getString('External collections updated')
              );
            } else {
              evt.cancel = true;
              resultAlert = alertify.error(
                gettextCatalog.getString(
                  'Path {{path}} does not exist',
                  {path: newExternalCollections},
                  5
                )
              );
            }
          }
        }
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

    $scope.setExternalPlugins = function () {
      var externalPlugins = profile.get('externalPlugins');
      utils.renderForm(
        [
          {
            type: 'text',
            title: gettextCatalog.getString('Enter the external plugins path'),
            value: externalPlugins || '',
          },
        ],
        function (evt, values) {
          var newExternalPlugins = values[0];
          if (resultAlert) {
            resultAlert.dismiss(false);
          }
          if (newExternalPlugins !== externalPlugins) {
            if (
              newExternalPlugins === '' ||
              nodeFs.existsSync(newExternalPlugins)
            ) {
              profile.set('externalPlugins', newExternalPlugins);
              alertify.success(
                gettextCatalog.getString('External plugins updated')
              );
            } else {
              evt.cancel = true;
              resultAlert = alertify.error(
                gettextCatalog.getString(
                  'Path {{path}} does not exist',
                  {path: newExternalPlugins},
                  5
                )
              );
            }
          }
        }
      );
    };

    $scope.setRemoteHostname = function () {
      var current = profile.get('remoteHostname');
      alertify.prompt(
        gettextCatalog.getString('Enter the remote hostname user@host'),
        '',
        current ? current : '',
        function (evt, remoteHostname) {
          profile.set('remoteHostname', remoteHostname);
        },
        function () {}
      );
    };

    $(document).on('infoChanged', function (evt, newValues) {
      var values = getProjectInformation();
      if (!_.isEqual(values, newValues)) {
        graph.setInfo(values, newValues, project);
        alertify.message(
          gettextCatalog.getString('Project information updated') +
            '.<br>' +
            gettextCatalog.getString('Click here to view'),
          5
        ).callback = function (isClicked) {
          if (isClicked) {
            $scope.setProjectInformation();
          }
        };
      }
    });

    $scope.setProjectInformation = function () {
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
          alertify.success(
            gettextCatalog.getString('Project information updated')
          );
        }
      });
    };

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
        gettextCatalog.getString(
          'Board rules ' + (profile.get('boardRules') ? 'enabled' : 'disabled')
        )
      );
    };

    $(document).on('langChanged', function (evt, lang) {
      $scope.selectLanguage(lang);
    });

    $scope.selectLanguage = function (language) {
      if (profile.get('language') !== language) {
        profile.set('language', graph.selectLanguage(language));
        // Reload the project
        project.update(
          {
            deps: false,
          },
          function () {
            graph.loadDesign(project.get('design'), {
              disabled: false,
            });
            //alertify.success(gettextCatalog.getString("Language {{name}} selected",  { name: utils.bold(language) }));
          }
        );
        // Rearrange the collections content
        collections.sort();
      }
    };

    // Theme support
    $scope.selectTheme = function (theme) {
      if (profile.get('uiTheme') !== theme) {
        profile.set('uiTheme', theme);
        alertify.warning(
          gettextCatalog.getString(
            'Icestudio needs to be restarted to switch the new UI Theme.'
          ),
          15
        );
      }
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

    $scope.pinoutAvailable = function () {
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
    $scope.showPinout = function () {
      var board = common.selectedBoard;
      if (this.pinoutAvailable()) {
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
          gettextCatalog.getString('{{board}} pinout not defined', {
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
          gettextCatalog.getString('{{board}} datasheet not defined', {
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
          gettextCatalog.getString('{{board}} rules not defined', {
            board: utils.bold(board.info.label),
          }),
          5
        );
      }
    };

    function _openWindow(url, title) {
      console.log(url);
      return gui.Window.open(url, {
        title: title,
        focus: true,
        // toolbar: false,
        resizable: true,
        width: 700,
        height: 400,
        min_width: 300,
        min_height: 300,
        icon: 'resources/images/icestudio-logo.png',
      });
    }

    $scope.showCollectionData = function (collection) {
      const cname = collection.name;
      console.debug('[menu.showCollectionData] cname:', cname);
      var readme = collection.content.readme;
      console.debug('[menu.showCollectionData] content:', collection.content);
      if (!readme) {
        alertify.error(
          gettextCatalog.getString(
            'Info of collection &lt;{{collection}}&gt; is undefined',
            {collection: cname}
          ),
          5
        );
        return;
      }
      if (!nodeFs.existsSync(readme)) {
        alertify.error(
          gettextCatalog.getString(
            'README of collection &lt;{{collection}}&gt; does not exist',
            {collection: cname}
          ),
          5
        );
        return;
      }
      _openWindow(
        'resources/viewers/markdown/readme.html?readme=' + escape(readme),
        'Collection: ' + cname
      );
    };

    $scope.showCommandOutput = function () {
      winCommandOutput = _openWindow(
        'resources/viewers/plain/output.html?content=' +
          encodeURIComponent(common.commandOutput),
        gettextCatalog.getString('Command output')
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
        profile.set('board', graph.selectBoard(board).name);
      }
    });

    $scope.selectBoard = _selectBoard;

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
          alertify
            .confirm(
              gettextCatalog.getString(
                'Do you want to change to {{name}} board?',
                {name: utils.bold(board.info.label)}
              ),
              gettextCatalog.getString(
                'The current FPGA I/O configuration will be lost.'
              ),
              function () {
                _boardSelected();
              },
              function () {}
            )
            .setting({
              labels: {
                ok: gettextCatalog.getString('Ok'),
                cancel: gettextCatalog.getString('Cancel'),
              },
            });
        } else {
          _boardSelected();
        }
      }

      function _boardSelected() {
        var newBoard = graph.selectBoard(board, true);
        profile.set('board', newBoard.name);
        alertify.success(
          gettextCatalog.getString('Board {{name}} selected', {
            name: utils.bold(newBoard.info.label),
          })
        );
      }
    }

    //-- Tools

    $scope.verifyCode = function () {
      checkGraph()
        .then(function () {
          return tools.verifyCode(
            gettextCatalog.getString('Start verification'),
            gettextCatalog.getString('Verification done')
          );
        })
        .catch(function () {});
    };

    $scope.buildCode = function () {
      if (common.isEditingSubmodule) {
        alertify.alert(
          gettextCatalog.getString('Build'),
          gettextCatalog.getString(
            'You can only build at top-level design. Inside submodules you only can <strong>Verify</strong>'
          ),
          function () {}
        );
        return;
      }

      checkGraph()
        .then(function () {
          return tools.buildCode(
            gettextCatalog.getString('Start build'),
            gettextCatalog.getString('Build done')
          );
        })
        .then(function () {
          resetBuildStack();
        })
        .catch(function () {});
    };

    $scope.uploadCode = function () {
      if (common.isEditingSubmodule) {
        alertify.alert(
          gettextCatalog.getString('Upload'),
          gettextCatalog.getString(
            'You can only upload  your design at top-level design. Inside submodules you only can <strong>Verify</strong>'
          ),
          function () {}
        );
        return;
      }

      checkGraph()
        .then(function () {
          return tools.uploadCode(
            gettextCatalog.getString('Start upload'),
            gettextCatalog.getString('Upload done')
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
          resultAlert = alertify.warning(
            gettextCatalog.getString('Add a block to start'),
            5
          );
          reject();
        }
      });
    }

    $scope.addCollections = function () {
      utils.openDialog('#input-add-collection', '.zip', function (filepaths) {
        filepaths = filepaths.split(';');
        tools.addCollections(filepaths);
      });
    };

    $scope.reloadCollections = function () {
      collections.loadAllCollections();
    };

    $scope.removeCollection = function (collection) {
      alertify.confirm(
        gettextCatalog.getString(
          'Do you want to remove the {{name}} collection?',
          {
            name: utils.bold(collection.name),
          }
        ),
        function () {
          tools.removeCollection(collection);
          utils.rootScopeSafeApply();
        }
      );
    };

    $scope.removeAllCollections = function () {
      if (common.internalCollections.length > 0) {
        alertify.confirm(
          gettextCatalog.getString(
            'All stored collections will be lost. Do you want to continue?'
          ),
          function () {
            tools.removeAllCollections();
            utils.rootScopeSafeApply();
          }
        );
      } else {
        alertify.warning(gettextCatalog.getString('No collections stored'), 5);
      }
    };

    //-- Help

    $scope.openUrl = function (url, $event) {
      $event.preventDefault();
      utils.openUrlExternalBrowser(url);
      return false;
    };

    $scope.about = function () {
      const ref = _package.sha !== '00000000' ? '/commit/' + _package.sha : '';
      alertify
        .alert(
          'Icestudio, visual editor for Verilog designs',
          `
<div class="row" style="margin-top:15px;">
  <div class="col-sm-12">
    <p>Version: <a class="action-open-url-external-browser" href="https://github.com/juanmard/icestudio${ref}">${_package.version}-g${_package.sha}</a></p>
    <p>License: <a class="action-open-url-external-browser" href="https://www.gnu.org/licenses/old-licenses/gpl-2.0.html">GPL-2.0</a></p>
    <p>Documentation: <a class="action-open-url-external-browser" href="http://juanmard.github.io/icestudio">juanmard.github.io/icestudio</a></p>
  </div>
</div>
<div class="row" style="margin-top:15px;">
  <div class="col-sm-12">
    <p>Thanks to all the <a class="action-open-url-external-browser" href="https://github.com/juanmard/icestudio/contributors">contributors</a>!</p>
  </div>
</div>
`,
          function () {
            if (tools.canCheckVersion) {
              tools.checkForNewVersion();
            }
          }
        )
        .setting({
          closable: true,
          modal: true,
          label: tools.canCheckVersion ? 'Check for Updates...' : 'Close',
          invokeOnCloseOff: true,
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
      var ret = shortcuts.execute(event, {
        prompt: false,
        disabled: !graph.isEnabled(),
      });
      if (ret.preventDefault) {
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
              gettextCatalog.getString('Image {{name}} saved', {
                name: utils.bold(utils.basename(filepath)),
              })
            );
          } else {
            throw err;
          }
        });
      });
    }

    // Show/Hide menu management

    var menu;

    // mousedown event
    var mousedown = false;
    $(document).on('mouseup', function () {
      mousedown = false;
    });

    $(document).on('mousedown', '.paper', function () {
      mousedown = true;
      // Close current menu
      if ($scope.status && $scope.status[menu]) {
        $scope.status[menu] = false;
      }
      utils.rootScopeSafeApply();
    });

    $scope.showMenu = function (newMenu) {
      if (
        !mousedown &&
        !graph.addingDraggableBlock &&
        (!$scope.status || !$scope.status[newMenu])
      ) {
        _fixMenu(newMenu);
      }
    };

    $scope.hideMenu = function () {
      if (!$scope.status) {
        $scope.status = {};
      }
      $scope.status[menu] = false;
    };

    $scope.fixMenu = _fixMenu;

    function _fixMenu(newMenu) {
      menu = newMenu;
      if (!$scope.status) {
        $scope.status = {};
      }
      $scope.status[menu] = true;
    }

    // Disable click in submenus
    $(document).click('.dropdown-submenu', function (event) {
      if ($(event.target).hasClass('dropdown-toggle')) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    });

    // -- Tools

    shortcuts.method('verifyCode', $scope.verifyCode);
    shortcuts.method('buildCode', $scope.buildCode);
    shortcuts.method('uploadCode', $scope.uploadCode);

    // -- Misc

    shortcuts.method('stepUp', graph.stepUp);
    shortcuts.method('stepDown', graph.stepDown);
    shortcuts.method('stepLeft', graph.stepLeft);
    shortcuts.method('stepRight', graph.stepRight);

    shortcuts.method('removeSelected', removeSelected);
    shortcuts.method('back', function () {
      if (graph.isEnabled()) {
        removeSelected();
      } else {
        $rootScope.breadcrumbsBack();
      }
    });

    shortcuts.method('takeSnapshot', takeSnapshot);
  });
