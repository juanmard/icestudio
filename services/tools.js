angular
  .module('icestudio')
  .service(
    'tools',
    function (
      alerts,
      project,
      compiler,
      collections,
      graph,
      utils,
      common,
      gettextCatalog,
      nodeFs,
      nodeFse,
      nodePath,
      nodeChildProcess,
      _package
    ) {
      'use strict';

      function _tcStr(str, args) {
        return gettextCatalog.getString(str, args);
      }

      var taskRunning = false;
      var resources = [];
      var startAlert = null;
      var infoAlert = null;
      var resultAlert = null;

      this.verifyCode = function (startMessage, endMessage) {
        return ICEToolRun(
          ['verify', '--board', common.selectedBoard.name],
          startMessage,
          endMessage
        );
      };

      this.buildCode = function (startMessage, endMessage) {
        return ICEToolRun(
          ['build', '--board', common.selectedBoard.name],
          startMessage,
          endMessage
        );
      };

      this.uploadCode = function (startMessage, endMessage) {
        return ICEToolRun(
          ['upload', '--board', common.selectedBoard.name],
          startMessage,
          endMessage
        );
      };

      function ICEToolRun(commands, startMessage, endMessage) {
        return new Promise(function (resolve) {
          var sourceCode = '';

          if (!taskRunning) {
            taskRunning = true;

            if (infoAlert) {
              infoAlert.dismiss(false);
            }

            if (resultAlert) {
              resultAlert.dismiss(false);
            }
            graph
              .resetCodeErrors()
              .then(function () {
                return new Promise(function (resolve, reject) {
                  resolve();
                });
              })
              .then(function () {
                utils.startWait();
                if (startMessage) {
                  startAlert = alertify.message(startMessage, 100000);
                }

                return generateCode(commands);
              })
              .then(function (output) {
                sourceCode = output.code;

                return syncResources(output.code, output.internalResources);
              })
              .then(function () {
                var command = commands[0];
                if (command === 'build' || command === 'upload') {
                  commands = commands.concat('--verbose');
                }
                return executeLocal(commands);
              })
              .then(function (result) {
                return processResult(result, sourceCode);
              })
              .then(function () {
                // Success
                if (endMessage) {
                  resultAlert = alertify.success(_tcStr(endMessage));
                }
                utils.endWait();
                restoreTask();
                resolve();
              })
              .catch(function (/* e */) {
                // Error
                utils.endWait();
                restoreTask();
              });
          }
        });
      }

      function restoreTask() {
        setTimeout(function () {
          // Wait 1s before run a task again
          if (startAlert) {
            startAlert.dismiss(false);
          }
          taskRunning = false;
        }, 1000);
      }

      function generateCode(cmd) {
        return new Promise(function (resolve) {
          project.snapshot();
          project.update();
          var opt = {
            datetime: false,
            boardRules: common.get('boardRules'),
          };
          if (opt.boardRules) {
            opt.initPorts = compiler.getInitPorts(project.get());
            opt.initPins = compiler.getInitPins(project.get());
          }

          // Verilog file
          var verilogFile = compiler.generate('verilog', project.get(), opt)[0];
          nodeFs.writeFileSync(
            nodePath.join(common.BUILD_DIR, verilogFile.name),
            verilogFile.content,
            'utf8'
          );

          if (
            cmd.indexOf('verify') > -1 &&
            cmd.indexOf('--board') > -1 &&
            cmd.length === 3
          ) {
            //only verification
          } else {
            var archName = common.selectedBoard.info.arch;
            if (archName === 'ecp5') {
              // LPF file
              var lpfFile = compiler.generate('lpf', project.get(), opt)[0];
              nodeFs.writeFileSync(
                nodePath.join(common.BUILD_DIR, lpfFile.name),
                lpfFile.content,
                'utf8'
              );
            } else {
              // PCF file
              var pcfFile = compiler.generate('pcf', project.get(), opt)[0];
              nodeFs.writeFileSync(
                nodePath.join(common.BUILD_DIR, pcfFile.name),
                pcfFile.content,
                'utf8'
              );
            }
          }
          // List files
          var listFiles = compiler.generate('list', project.get());
          for (var i in listFiles) {
            var listFile = listFiles[i];

            nodeFs.writeFileSync(
              nodePath.join(common.BUILD_DIR, listFile.name),
              listFile.content,
              'utf8'
            );
          }

          project.restoreSnapshot();
          resolve({
            code: verilogFile.content,
            internalResources: listFiles.map(function (res) {
              return res.name;
            }),
          });
        });
      }

      function syncResources(code, internalResources) {
        return new Promise(function (resolve, reject) {
          // Remove resources
          removeFiles(resources);
          resources = [];
          // Find included files
          resources = resources.concat(findIncludedFiles(code));
          // Find list files
          resources = resources.concat(findInlineFiles(code));
          // Sync resources
          resources = _.uniq(resources);
          // Remove internal files
          resources = _.difference(resources, internalResources);
          syncFiles(resources, reject);
          resolve();
        });
      }

      function removeFiles(files) {
        _.each(files, function (file) {
          var filepath = nodePath.join(common.BUILD_DIR, file);
          nodeFse.removeSync(filepath);
        });
      }

      function findIncludedFiles(code) {
        return findFiles(
          /[\n|\s]\/\/\s*@include\s+([^\s]*\.(v|vh|list))(\n|\s)/g,
          code
        );
      }

      function findInlineFiles(code) {
        return findFiles(/[\n|\s][^\/]?\"(.*\.list?)\"/g, code);
      }

      // TODO: duplicated: utils findIncludedFiles
      function findFiles(pattern, code) {
        var match;
        var files = [];
        while ((match = pattern.exec(code))) {
          files.push(match[1]);
        }
        return files;
      }

      function syncFiles(files, reject) {
        _.each(files, function (file) {
          var destPath = nodePath.join(common.BUILD_DIR, file);
          var origPath = nodePath.join(
            nodePath.dirname(project.filepath),
            file
          );

          // Copy file
          var copySuccess = utils.copySync(origPath, destPath);
          if (!copySuccess) {
            resultAlert = alertify.error(
              _tcStr('File {{file}} does not exist', {
                file: file,
              }),
              30
            );
            reject();
          }
        });
      }

      function executeLocal(commands) {
        return new Promise(function (resolve) {
          var command = common.ICETOOL.concat(commands)
            .concat(['-p', `"${common.BUILD_DIR}"`])
            .join(' ');
          if (
            typeof common.DEBUGMODE !== 'undefined' &&
            common.DEBUGMODE === 1
          ) {
            const fs = require('fs');
            fs.appendFileSync(
              common.LOGFILE,
              'tools._executeLocal>' + command + '\n'
            );
          }
          nodeChildProcess.exec(
            command,
            {
              shell: 'bash',
              maxBuffer: 5000 * 1024,
            }, // To avoid buffer overflow
            function (error, stdout, stderr) {
              common.commandOutput = command + '\n\n' + stdout + stderr;
              $(document).trigger('commandOutputChanged', [
                common.commandOutput,
              ]);
              resolve({
                error: error,
                stdout: stdout,
                stderr: stderr,
              });
            }
          );
        });
      }

      function processResult(result, code) {
        result = result || {};
        var _error = result.error;
        var stdout = result.stdout;
        var stderr = result.stderr;

        return new Promise(function (resolve, reject) {
          if (_error) {
            // -- Process errors
            reject();
            if (stdout) {
              var boardName = common.selectedBoard.name;
              var boardLabel = common.selectedBoard.info.label;
              if (
                stdout.indexOf(
                  'Error: board ' + boardName + ' not connected'
                ) !== -1 ||
                stdout.indexOf('USBError') !== -1 ||
                stdout.indexOf('Activate bootloader') !== -1
              ) {
                var errorMessage = _tcStr('Board {{name}} not connected', {
                  name: `<b>${boardLabel}</b>`,
                });
                if (stdout.indexOf('Activate bootloader') !== -1) {
                  if (common.selectedBoard.name.startsWith('TinyFPGA-B')) {
                    // TinyFPGA bootloader notification
                    errorMessage +=
                      '</br>(' + _tcStr('Bootloader not active') + ')';
                  }
                }
                resultAlert = alertify.error(errorMessage, 30);
              } else if (
                stdout.indexOf(
                  'Error: board ' + boardName + ' not available'
                ) !== -1
              ) {
                resultAlert = alertify.error(
                  _tcStr('Board {{name}} not available', {
                    name: `<b>${boardLabel}</b>`,
                  }),
                  30
                );
                setupDriversAlert();
              } else if (stdout.indexOf('Error: unknown board') !== -1) {
                resultAlert = alertify.error(_tcStr('Unknown board'), 30);
              } else if (stdout.indexOf('[upload] Error') !== -1) {
                switch (common.selectedBoard.name) {
                  // TinyFPGA-B2 programmer errors
                  case 'TinyFPGA-B2':
                  case 'TinyFPGA-BX':
                    var match = stdout.match(/Bootloader\snot\sactive/g);
                    if (match && match.length === 3) {
                      resultAlert = alertify.error(
                        _tcStr('Bootloader not active'),
                        30
                      );
                    } else if (
                      stdout.indexOf('Device or resource busy') !== -1
                    ) {
                      resultAlert = alertify.error(
                        _tcStr('Board {{name}} not available', {
                          name: `<b>${boardLabel}</b>`,
                        }),
                        30
                      );
                      setupDriversAlert();
                    } else if (
                      stdout.indexOf(
                        'device disconnected or multiple access on port'
                      ) !== -1
                    ) {
                      resultAlert = alertify.error(
                        _tcStr('Board {{name}} disconnected', {
                          name: `<b>${boardLabel}</b>`,
                        }),
                        30
                      );
                    } else {
                      resultAlert = alertify.error(_tcStr(stdout), 30);
                    }
                    break;
                  default:
                    resultAlert = alertify.error(_tcStr(stdout), 30);
                }
                console.warn(stdout);
              }
              // Yosys error (Mac OS)
              else if (
                stdout.indexOf('Library not loaded:') !== -1 &&
                stdout.indexOf('libffi') !== -1
              ) {
                resultAlert = alertify.error(
                  _tcStr('Configuration not completed'),
                  30
                );
                setupDriversAlert();
              }
              // - Arachne-pnr errors
              else if (
                stdout.indexOf('set_io: too few arguments') !== -1 ||
                stdout.indexOf('fatal error: unknown pin') !== -1
              ) {
                resultAlert = alertify.error(
                  _tcStr('FPGA I/O ports not defined'),
                  30
                );
              } else if (
                stdout.indexOf('fatal error: duplicate pin constraints') !== -1
              ) {
                resultAlert = alertify.error(
                  _tcStr('Duplicated FPGA I/O ports'),
                  30
                );
              } else {
                var re,
                  matchError,
                  codeErrors = [];

                // - Iverilog errors & warnings
                // main.v:#: error: ...
                // main.v:#: warning: ...
                // main.v:#: syntax error
                re = /main.v:([0-9]+):\s(error|warning):\s(.*?)[\r|\n]/g;
                while ((matchError = re.exec(stdout))) {
                  codeErrors.push({
                    line: parseInt(matchError[1]),
                    msg: matchError[3].replace(/\sin\smain\..*$/, ''),
                    type: matchError[2],
                  });
                }
                re = /main.v:([0-9]+):\ssyntax\serror[\r|\n]/g;
                while ((matchError = re.exec(stdout))) {
                  codeErrors.push({
                    line: parseInt(matchError[1]),
                    msg: 'Syntax error',
                    type: 'error',
                  });
                }
                // - Yosys errors
                // ERROR: ... main.v:#...
                // Warning: ... main.v:#...
                re = /(ERROR|Warning):\s(.*?)\smain\.v:([0-9]+)(.*?)[\r|\n]/g;
                var msg = '';
                var line = -1;
                var type = false;
                var preContent = false;
                var postContent = false;

                while ((matchError = re.exec(stdout))) {
                  msg = '';
                  line = parseInt(matchError[3]);
                  type = matchError[1].toLowerCase();
                  preContent = matchError[2];
                  postContent = matchError[4];
                  // Process error
                  if (preContent === 'Parser error in line') {
                    postContent = postContent.substring(2); // remove :\s
                    if (postContent.startsWith('syntax error')) {
                      postContent = 'Syntax error';
                    }
                    msg = postContent;
                  } else if (preContent.endsWith(' in line ')) {
                    msg =
                      preContent.replace(/\sin\sline\s$/, ' ') + postContent;
                  } else {
                    preContent = preContent.replace(/\sat\s$/, '');
                    preContent = preContent.replace(/\sin\s$/, '');
                    msg = preContent;
                  }
                  codeErrors.push({
                    line: line,
                    msg: msg,
                    type: type,
                  });
                }

                // - Yosys syntax errors
                // - main.v:31: ERROR: #...
                re = /\smain\.v:([0-9]+):\s(.*?)(ERROR):\s(.*?)[\r|\n]/g;
                while ((matchError = re.exec(stdout))) {
                  msg = '';
                  line = parseInt(matchError[1]);
                  type = matchError[3].toLowerCase();
                  preContent = matchError[4];

                  // If the error is about an unexpected token, the error is not
                  // deterministic, therefore we indicate that "the error
                  //is around this line ..."
                  if (preContent.indexOf('unexpected TOK_') >= 0) {
                    msg = 'Syntax error arround this line';
                  } else {
                    msg = preContent;
                  }
                  codeErrors.push({
                    line: line,
                    msg: msg,
                    type: type,
                  });
                }

                // Extract modules map from code
                var modules = mapCodeModules(code);
                var hasErrors = false;
                var hasWarnings = false;
                for (var i in codeErrors) {
                  var codeError = normalizeCodeError(codeErrors[i], modules);
                  if (codeError) {
                    // Launch codeError event
                    $(document).trigger('codeError', [codeError]);
                    hasErrors = hasErrors || codeError.type === 'error';
                    hasWarnings = hasWarnings || codeError.type === 'warning';
                  }
                }

                if (hasErrors) {
                  resultAlert = alertify.error(
                    _tcStr('Errors detected in the design'),
                    5
                  );
                } else {
                  if (hasWarnings) {
                    resultAlert = alertify.warning(
                      _tcStr('Warnings detected in the design'),
                      5
                    );
                  }

                  // var stdoutWarning = stdout.split('\n').filter(function (line) {
                  //   line = line.toLowerCase();
                  //   return (line.indexOf('warning: ') !== -1);
                  // });
                  var stdoutError = stdout.split('\n').filter(function (line) {
                    line = line.toLowerCase();
                    return (
                      line.indexOf('error: ') !== -1 ||
                      line.indexOf('not installed') !== -1 ||
                      line.indexOf('already declared') !== -1
                    );
                  });
                  // stdoutWarning.forEach(function (warning) {
                  //   alertify.warning(warning, 20);
                  // });
                  if (stdoutError.length > 0) {
                    // Show first error
                    var error = 'There are errors in the Design...';
                    // hardware.blif:#: fatal error: ...
                    re = /hardware\.blif:([0-9]+):\sfatal\serror:\s(.*)/g;

                    // ERROR: Cell xxx cannot be bound to ..... since it is already bound
                    var re2 =
                      /ERROR:\s(.*)\scannot\sbe\sbound\sto\s(.*)since\sit\sis\salready\sbound/g;

                    // ERROR: package does not have a pin named 'NULL' (on line 3)
                    var re3 =
                      /ERROR:\spackage\sdoes\snot\shave\sa\spin\snamed\s'NULL/g;

                    if ((matchError = re.exec(stdoutError[0]))) {
                      error = matchError[2];
                    } else if ((matchError = re2.exec(stdoutError[0]))) {
                      error = 'Duplicated pins';
                    } else if ((matchError = re3.exec(stdoutError[0]))) {
                      error = 'Pin not assigned (NULL)';
                    } else {
                      error += '\n' + stdoutError[0];
                    }
                    resultAlert = alertify.error(error, 30);
                  } else {
                    resultAlert = alertify.error(stdout, 30);
                  }
                }
              }
            } else if (stderr) {
              resultAlert = alertify.error(stderr, 30);
            }
          } else {
            //-- Process output
            resolve();

            if (stdout) {
              // Show used resources in the FPGA
              if (typeof common.FPGAResources.nextpnr === 'undefined') {
                common.FPGAResources.nextpnr = {
                  LC: {
                    used: '-',
                    total: '-',
                    percentage: '-',
                  },
                  RAM: {
                    used: '-',
                    total: '-',
                    percentage: '-',
                  },
                  IO: {
                    used: '-',
                    total: '-',
                    percentage: '-',
                  },
                  GB: {
                    used: '-',
                    total: '-',
                    percentage: '-',
                  },
                  PLL: {
                    used: '-',
                    total: '-',
                    percentage: '-',
                  },
                  WB: {
                    used: '-',
                    total: '-',
                    percentage: '-',
                  },
                  MF: {
                    value: 0,
                  },
                };
              }
              common.FPGAResources.nextpnr.LC = findValueNPNR(
                /_LC:\s{1,}(\d+)\/\s{1,}(\d+)\s{1,}(\d+)%/g,
                stdout,
                common.FPGAResources.nextpnr.LC
              );
              common.FPGAResources.nextpnr.RAM = findValueNPNR(
                /_RAM:\s{1,}(\d+)\/\s{1,}(\d+)\s{1,}(\d+)%/g,
                stdout,
                common.FPGAResources.nextpnr.RAM
              );
              common.FPGAResources.nextpnr.IO = findValueNPNR(
                /SB_IO:\s{1,}(\d+)\/\s{1,}(\d+)\s{1,}(\d+)%/g,
                stdout,
                common.FPGAResources.nextpnr.IO
              );
              common.FPGAResources.nextpnr.GB = findValueNPNR(
                /SB_GB:\s{1,}(\d+)\/\s{1,}(\d+)\s{1,}(\d+)%/g,
                stdout,
                common.FPGAResources.nextpnr.GB
              );
              common.FPGAResources.nextpnr.PLL = findValueNPNR(
                /_PLL:\s{1,}(\d+)\/\s{1,}(\d+)\s{1,}(\d+)%/g,
                stdout,
                common.FPGAResources.nextpnr.PLL
              );
              common.FPGAResources.nextpnr.WB = findValueNPNR(
                /_WARMBOOT:\s{1,}(\d+)\/\s{1,}(\d+)\s{1,}(\d+)%/g,
                stdout,
                common.FPGAResources.nextpnr.WB
              );
              common.FPGAResources.nextpnr.MF = findMaxFreq(
                /Max frequency for clock '[\w\W]+': ([\d\.]+) MHz/g,
                stdout,
                common.FPGAResources.nextpnr.MF
              );
              utils.rootScopeSafeApply();
            }
          }
        });
      }

      function findValueNPNR(pattern, output, previousValue) {
        var match = pattern.exec(output);
        if (match && match[1] && match[2] && match[3]) {
          return {
            used: match[1],
            total: match[2],
            percentage: match[3],
          };
        }
        return previousValue;
      }

      function findMaxFreq(pattern, output, previousValue) {
        var match = pattern.exec(output);
        if (match && match[1]) {
          return {
            value: match[1],
          };
        }
        return previousValue;
      }

      /*    function findValue(pattern, output, previousValue) {
          var match = pattern.exec(output);
          return (match && match[1]) ? match[1] : previousValue;
        }
    */
      function mapCodeModules(code) {
        var codelines = code.split('\n');
        var match,
          module = {
            params: [],
          },
          modules = [];
        // Find begin/end lines of the modules
        for (var i in codelines) {
          var codeline = codelines[i];
          // Get the module name
          if (!module.name) {
            match = /^module\s(.*?)[\s|;]/.exec(codeline);
            if (match) {
              module.name = match[1];
              continue;
            }
          }
          // Get the module parameters
          if (!module.begin) {
            match = /^\sparameter\s(.*?)\s/.exec(codeline);
            if (match) {
              module.params.push({
                name: match[1],
                line: parseInt(i) + 1,
              });
              continue;
            }
          }
          // Get the begin of the module code
          if (!module.begin) {
            match = /;$/.exec(codeline);
            if (match) {
              module.begin = parseInt(i) + 1;
              continue;
            }
          }
          // Get the end of the module code
          if (!module.end) {
            match = /^endmodule$/.exec(codeline);
            if (match) {
              module.end = parseInt(i) + 1;
              modules.push(module);
              module = {
                params: [],
              };
            }
          }
        }
        return modules;
      }

      function normalizeCodeError(codeError, modules) {
        var newCodeError;
        // Find the module with the error
        for (var i in modules) {
          var module = modules[i];
          if (codeError.line <= module.end) {
            newCodeError = {
              type: codeError.type,
              msg: codeError.msg,
            };
            // Find constant blocks in Yosys error:
            //  The error comes from the generated code
            //  but the origin is the constant block value
            var re = /Failed\sto\sdetect\swidth\sfor\sparameter\s\\(.*?)\sat/g;
            var matchConstant = re.exec(newCodeError.msg);

            if (codeError.line > module.begin && !matchConstant) {
              if (module.name.startsWith('main_')) {
                // Code block
                newCodeError.blockId = module.name.split('_')[1];
                newCodeError.blockType = 'code';
                newCodeError.line =
                  codeError.line -
                  module.begin -
                  (codeError.line === module.end ? 1 : 0);
              } else {
                // Generic block

                newCodeError.blockId = module.name.split('_')[0];
                newCodeError.blockType = 'generic';
              }
              break;
            } else {
              if (module.name === 'main') {
                // Constant block
                for (var j in module.params) {
                  var param = module.params[j];
                  if (
                    codeError.line === param.line ||
                    (matchConstant && param.name === matchConstant[1])
                  ) {
                    newCodeError.blockId = param.name;
                    newCodeError.blockType = 'constant';
                    break;
                  }
                }
              } else {
                // Generic block
                newCodeError.blockId = module.name;
                newCodeError.blockType = 'generic';
              }
              break;
            }
          }
        }
        return newCodeError;
      }

      function deleteFolderRecursive(path) {
        if (nodeFs.existsSync(path)) {
          nodeFs.readdirSync(path).forEach((file) => {
            var curPath = nodePath.join(path, file);
            if (nodeFs.lstatSync(curPath).isDirectory()) {
              deleteFolderRecursive(curPath);
            } else {
              nodeFs.unlinkSync(curPath);
            }
          });
          nodeFs.rmdirSync(path);
        }
      }

      // Toolchain methods

      this.PythonExecutable = getPythonExecutable();

      function getPythonExecutable(envdir) {
        const pythonEnv = common.get('pythonEnv');
        if (pythonEnv && !envdir) {
          return pythonEnv;
        }
        for (var executable of common.WIN32
          ? ['py.exe -3', 'python3.exe', 'python.exe']
          : ['python3', 'python']) {
          const _ex = envdir ? nodePath.join(envdir, executable) : executable;
          if (isPython3(_ex)) {
            return _ex;
          }
        }
      }

      function isPython3(executable) {
        const cmd = `${executable} -V`;
        try {
          const result = nodeChildProcess.execSync(cmd);
          const str = result.toString();
          console.log(`[srv.tools.isPython3] ${cmd} : ${str}`);
          return !result
            ? false
            : str.indexOf('3.5') >= 0 ||
                str.indexOf('3.6') >= 0 ||
                str.indexOf('3.7') >= 0 ||
                str.indexOf('3.8') >= 0 ||
                str.indexOf('3.9') >= 0 ||
                str.indexOf('3.10') >= 0;
        } catch (e) {
          return false;
        }
      }

      // Collections management

      this.saveCollections = () => {
        common.set(
          'collections',
          common.internalCollections.map((item) => {
            return {
              name: item.name,
              disabled: item.disabled,
            };
          })
        );
      };

      const nodeAdmZip = require('adm-zip');

      this.addCollections = function (filepaths) {
        // Load zip file
        async.eachSeries(filepaths, function (filepath, nextzip) {
          //alertify.message(_tcStr('Load {{name}} ...', { name: `<b>${common.basename(filepath)}</b>` }));
          var zipData = nodeAdmZip(filepath);
          var _collections = getCollections(zipData);

          async.eachSeries(
            _collections,
            function (collection, next) {
              setTimeout(function () {
                if (
                  collection.package &&
                  (collection.blocks || collection.examples)
                ) {
                  alertify.prompt(
                    _tcStr('Add collection'),
                    _tcStr('Enter name for the collection:'),
                    collection.origName,
                    function (evt, name) {
                      if (!name) {
                        return false;
                      }
                      collection.name = name;

                      var destPath = nodePath.join(
                        common.INTERNAL_COLLECTIONS_DIR,
                        name
                      );
                      if (nodeFs.existsSync(destPath)) {
                        alerts.confirm({
                          title: _tcStr(
                            'The collection {{name}} already exists.',
                            {name: `<b>${name}</b>`}
                          ),
                          body: _tcStr('Do you want to replace it?'),
                          onok: () => {
                            deleteFolderRecursive(destPath);
                            installCollection(collection, zipData);
                            alertify.success(
                              _tcStr('Collection {{name}} replaced', {
                                name: `<b>${name}</b>`,
                              })
                            );
                            next(name);
                          },
                          oncancel: () => {
                            alertify.warning(
                              _tcStr('Collection {{name}} not replaced', {
                                name: `<b>${name}</b>`,
                              })
                            );
                            next(name);
                          },
                        });
                      } else {
                        installCollection(collection, zipData);
                        alertify.success(
                          _tcStr('Collection {{name}} added', {
                            name: `<b>${name}</b>`,
                          })
                        );
                        next(name);
                      }
                    },
                    function () {}
                  );
                } else {
                  alertify.warning(
                    _tcStr('Invalid collection {{name}}', {
                      name: `<b>${name}</b>`,
                    })
                  );
                }
              }, 0);
            },
            function () {
              collections.loadInternalCollections();
              utils.rootScopeSafeApply();
              nextzip();
            }
          );
        });
      };

      function getCollections(zipData) {
        var data = '';
        var _collections = {};
        var zipEntries = zipData.getEntries();

        // Validate collections
        zipEntries.forEach(function (zipEntry) {
          data = zipEntry.entryName.match(/^([^\/]+)\/$/);
          if (data) {
            _collections[data[1]] = {
              origName: data[1],
              blocks: [],
              examples: [],
              locale: [],
              package: '',
            };
          }

          addCollectionItem('blocks', 'ice', _collections, zipEntry);
          addCollectionItem('blocks', 'v', _collections, zipEntry);
          addCollectionItem('blocks', 'vh', _collections, zipEntry);
          addCollectionItem('blocks', 'list', _collections, zipEntry);
          addCollectionItem('examples', 'ice', _collections, zipEntry);
          addCollectionItem('examples', 'v', _collections, zipEntry);
          addCollectionItem('examples', 'vh', _collections, zipEntry);
          addCollectionItem('examples', 'list', _collections, zipEntry);
          addCollectionItem('locale', 'po', _collections, zipEntry);

          data = zipEntry.entryName.match(/^([^\/]+)\/package\.json$/);
          if (data) {
            _collections[data[1]].package = zipEntry.entryName;
          }
          data = zipEntry.entryName.match(/^([^\/]+)\/README\.md$/);
          if (data) {
            _collections[data[1]].readme = zipEntry.entryName;
          }
        });

        return _collections;
      }

      function addCollectionItem(key, ext, collections, zipEntry) {
        var data = zipEntry.entryName.match(
          RegExp('^([^/]+)/' + key + '/.*.' + ext + '$')
        );
        if (data) {
          collections[data[1]][key].push(zipEntry.entryName);
        }
      }

      const nodeGettext = require('angular-gettext-tools');

      function installCollection(collection, zip) {
        var i,
          dest = '';
        var pattern = RegExp('^' + collection.origName);
        for (i in collection.blocks) {
          dest = collection.blocks[i].replace(pattern, collection.name);
          safeExtract(collection.blocks[i], dest, zip);
        }
        for (i in collection.examples) {
          dest = collection.examples[i].replace(pattern, collection.name);
          safeExtract(collection.examples[i], dest, zip);
        }
        for (i in collection.locale) {
          dest = collection.locale[i].replace(pattern, collection.name);
          safeExtract(collection.locale[i], dest, zip);
          // Generate locale JSON files
          var compiler = new nodeGettext.Compiler({
            format: 'json',
          });
          var sourcePath = nodePath.join(common.INTERNAL_COLLECTIONS_DIR, dest);
          var targetPath = nodePath.join(
            common.INTERNAL_COLLECTIONS_DIR,
            dest.replace(/\.po$/, '.json')
          );
          var content = nodeFs.readFileSync(sourcePath).toString();
          var json = compiler.convertPo([content]);
          nodeFs.writeFileSync(targetPath, json);
          // Add strings to gettext
          gettextCatalog.loadRemote(targetPath);
        }
        if (collection.package) {
          dest = collection.package.replace(pattern, collection.name);
          safeExtract(collection.package, dest, zip);
        }
        if (collection.readme) {
          dest = collection.readme.replace(pattern, collection.name);
          safeExtract(collection.readme, dest, zip);
        }
      }

      function safeExtract(entry, dest, zip) {
        try {
          var newPath = nodePath.join(common.INTERNAL_COLLECTIONS_DIR, dest);
          zip.extractEntryTo(
            entry,
            nodePath.dirname(newPath),
            /*maintainEntryPath*/ false
          );
        } catch (e) {}
      }

      this.initializePluginManager = function (callbackOnRun) {
        if (typeof ICEpm !== 'undefined') {
          console.log('ENV', common);
          ICEpm.setEnvironment(common);
          ICEpm.setPluginDir(common.DEFAULT_PLUGIN_DIR, function () {
            let plist = ICEpm.getAll();
            let uri = ICEpm.getBaseUri();
            let t = $('.icm-icon-list');
            t.empty();
            let html = '';
            for (let prop in plist) {
              if (
                typeof plist[prop].manifest.type === 'undefined' ||
                plist[prop].manifest.type === 'app'
              ) {
                html +=
                  '<a href="#" data-action="icm-plugin-run" data-plugin="' +
                  prop +
                  '"><img class="icm-plugin-icon" src="' +
                  uri +
                  '/' +
                  prop +
                  '/' +
                  plist[prop].manifest.icon +
                  '"><span>' +
                  plist[prop].manifest.name +
                  '</span></a>';
              }
            }
            t.append(html);

            $('[data-action="icm-plugin-run"]').off();
            $('[data-action="icm-plugin-run"]').on('click', function (e) {
              e.preventDefault();
              let ptarget = $(this).data('plugin');
              if (typeof callbackOnRun !== 'undefined') {
                callbackOnRun();
              }
              ICEpm.run(ptarget);
              return false;
            });
          });
        }
      };
    }
  );
