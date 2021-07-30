angular
  .module('icestudio')
  .service(
    'tools',
    function (
      alerts,
      project,
      compiler,
      collections,
      drivers,
      graph,
      utils,
      common,
      gettextCatalog,
      nodeFs,
      nodeFse,
      nodePath,
      nodeChildProcess,
      _package,
      $rootScope
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
      var toolchain = {
        apio: '-',
        installed: false,
        disabled: false,
      };

      this.toolchain = toolchain;

      this.verifyCode = function (startMessage, endMessage) {
        return apioRun(
          ['verify', '--board', common.selectedBoard.name],
          startMessage,
          endMessage
        );
      };

      this.buildCode = function (startMessage, endMessage) {
        return apioRun(
          ['build', '--board', common.selectedBoard.name],
          startMessage,
          endMessage
        );
      };

      this.uploadCode = function (startMessage, endMessage) {
        return apioRun(
          ['upload', '--board', common.selectedBoard.name],
          startMessage,
          endMessage
        );
      };

      function apioRun(commands, startMessage, endMessage) {
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
                  if (toolchain.apio != '-') {
                    resolve();
                  } else {
                    _toolchainAlert(true);
                    reject();
                  }
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
                  commands = commands.concat('--verbose-pnr');
                }
                console.log('APIO', commands);
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
          if (commands[0] === 'upload') {
            // Upload command requires drivers setup (Mac OS)
            drivers.preUpload(function () {
              _executeLocal();
            });
          } else {
            // Other !upload commands
            _executeLocal();
          }

          function _executeLocal() {
            var apio = getApioExecutable();
            var command = [apio]
              .concat(commands)
              .concat(['-p', `"${common.BUILD_DIR}"`])
              .join(' ');
            console.log('APIO COMMAND', command);
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
                maxBuffer: 5000 * 1024,
              }, // To avoid buffer overflow
              function (error, stdout, stderr) {
                if (commands[0] === 'upload') {
                  // Upload command requires to restore the drivers (Mac OS)
                  drivers.postUpload();
                }
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
          }
        });
      }

      function processResult(result, code) {
        result = result || {};
        var _error = result.error;
        var stdout = result.stdout;
        var stderr = result.stderr;

        return new Promise(function (resolve, reject) {
          if (_error || stderr) {
            // -- Process errors
            reject();
            if (stdout) {
              var boardName = common.selectedBoard.name;
              var boardLabel = common.selectedBoard.info.label;
              // - Apio errors
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
                str.indexOf('3.9') >= 0;
        } catch (e) {
          return false;
        }
      }

      this.checkToolchain = _checkToolchain;

      function getApioExecutable() {
        const apio = process.env.ICESTUDIO_APIO;
        if (nodeFs.existsSync(apio)) {
          alertify.message('Using external apio: ' + apio, 5);
          return `"${apio}"`;
        }
        return common.APIO_CMD;
      }

      function _checkToolchain(callback) {
        var apio = getApioExecutable();
        console.log('[srv.tools.checkToolchain] apio:', apio);
        nodeChildProcess.exec(`${apio} --version`, function (error, stdout) {
          console.log('[srv.tools.checkToolchain] version:', stdout);
          if (error) {
            console.log('[srv.tools.checkToolchain] version error:', error);
            toolchain.apio = '-';
            _toolchainAlert(true);
            if (callback) {
              callback();
            }
            return;
          }
          toolchain.apio = stdout.match(/apio,\sversion\s(.+)/i)[1];
          console.log(
            '[srv.tools.checkToolchain] toolchain.apio:',
            toolchain.apio
          );
          if (toolchain.apio && toolchain.apio != '') {
            _toolchainAlert(
              false,
              `${_tcStr('Apio version')} v${toolchain.apio}`
            );
            // TODO: We should run some minimal test for ensuring that apio was correctly installed.
            //  nodeChildProcess.exec(
            //    `${apio} clean -p`,
            //    (error, stdout, stderr) => {
            //      console.log('[srv.tools.checkToolchain] clean sample:', error, stdout, stderr);
            //      if (error) {
            //        toolchain.apio = '-';
            //        _toolchainAlert(false, _tcStr('Toolchain failed executing sample project!'));
            //      }
            //      if (callback) {
            //        callback();
            //      }
            //    }
            //  );
            if (callback) {
              callback();
            }
            return;
          }
          _toolchainAlert(false, _tcStr('Could not retrieve apio version!'));
          if (callback) {
            callback();
          }
        });
      }

      function executeCommand(command, callback) {
        var cmd = command.join(' ');
        nodeChildProcess.exec(cmd, (error, stdout, stderr) => {
          console.log(
            `[srv.tools.executeCommand] cmd: ${cmd}\nstdout: ${stdout}\nstderr: ${stderr}\nerror: ${error}`
          );
          common.commandOutput = `${cmd}\n\n${stdout}${stderr}`;
          $(document).trigger('commandOutputChanged', [common.commandOutput]);
          if (error) {
            alertify.error(error.message, 30);
            callback(true);
          } else {
            callback(false);
          }
        });
      }

      function _removeToolchain() {
        deleteFolderRecursive(common.ENV_DIR);
        deleteFolderRecursive(common.APIO_HOME_DIR);
      }

      $rootScope.$on('installToolchain', () => {
        _installToolchain();
      });

      this.installToolchain = _installToolchain;

      const nodeOnline = require('is-online');

      function _installToolchain() {
        if (resultAlert) {
          resultAlert.dismiss(false);
        }
        alerts.confirm({
          title: _tcStr('Toolchain installation'),
          body: _tcStr(
            'The toolchain will be downloaded. This operation requires Internet connection.'
          ),
          onok: () => {
            _removeToolchain();
            alerts.alert({
              title: _tcStr('Installing toolchain'),
              body: `<div>
              <div class="progress">
                <div id="progress-bar" class="progress-bar progress-bar-info progress-bar-striped active" role="progressbar"
                aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width:0%">
                </div>
              </div>
              <div id="progress-message" class="progress-message"></div>
            </div>`,
            });
            toolchain.apio = '-';

            const _py = getPythonExecutable();
            var _epip = null;

            async.series(
              [
                // checkInternetConnection
                (callback) => {
                  updateProgress(_tcStr('Check Internet connection...'), 0);
                  nodeOnline({timeout: 5000}, function (err, online) {
                    if (online) {
                      callback(false);
                      return;
                    }
                    resultAlert = alertify.error(
                      _tcStr('Internet connection required'),
                      30
                    );
                    callback(true);
                  });
                },
                // ensurePythonIsAvailable
                (callback) => {
                  updateProgress(_tcStr('Check Python...'), 10);
                  if (_py) {
                    callback(false);
                    return;
                  }
                  resultAlert = alertify.error(
                    _tcStr('At least Python 3.5 is required'),
                    30
                  );
                  callback(true);
                },
                // createVirtualenv
                (callback) => {
                  updateProgress(_tcStr('Create virtualenv...'), 20);
                  if (nodeFs.existsSync(common.ENV_DIR)) {
                    callback(false);
                    return;
                  }
                  if (!nodeFs.existsSync(common.ICESTUDIO_DIR)) {
                    nodeFs.mkdirSync(common.ICESTUDIO_DIR);
                  }
                  executeCommand(
                    [_py, '-m', 'venv', `"${common.ENV_DIR}"`],
                    callback
                  );
                },
                // setupVirtualenv
                // see: https://bugs.python.org/issue30628 and https://stackoverflow.com/a/61553959
                (callback) => {
                  updateProgress(_tcStr('Setup virtualenv...'), 25);
                  if (!nodeFs.existsSync(common.ENV_DIR)) {
                    callback(true);
                    return;
                  }
                  if (!nodeFs.existsSync(common.ENV_BIN_DIR)) {
                    callback(true);
                    return;
                  }
                  _epip = [
                    getPythonExecutable(common.ENV_BIN_DIR),
                    '-m',
                    'pip',
                  ];

                  if (common.MSYSTEM) {
                    callback(false);
                    return;
                  }
                  executeCommand(
                    _epip.concat([
                      'install',
                      '-U',
                      'pip',
                      'setuptools',
                      'wheel',
                    ]),
                    callback
                  );
                },
                // installOnlineApio
                (callback) => {
                  updateProgress('Install apio', 50);
                  const pkgs = '[blackiceprog,tinyfpgab,tinyprog,icefunprog]'; //icesprog,fujprog
                  executeCommand(
                    _epip.concat([
                      'install',
                      '-U',
                      `apio${pkgs}@https://github.com/${common.get(
                        'apioRepo'
                      )}/archive/${common.get('apioRef')}.zip`,
                    ]),
                    callback
                  );
                },
                // apioinstallPackages
                (callback) => {
                  const pkgs =
                    'oss-cad-suite yosys ice40 ecp5 fujprog icesprog dfu iverilog drivers scons';
                  updateProgress(`apio install ${pkgs}`, 75);
                  apioInstall(pkgs, callback);
                },
              ],
              // installationCompleted
              (err, results) => {
                console.log(
                  `[srv.tools.installationCompleted] err: ${err}\nresults: ${results}`
                );
                _checkToolchain(() => {
                  if (toolchain.apio != '-') {
                    updateProgress(_tcStr('Installation completed'), 100);
                    alertify.success(_tcStr('Toolchain installed'));
                  } else {
                    alertify.failure(_tcStr('Toolchain installation failed'));
                  }
                });
              }
            );
          },
        });
      }

      function _toolchainAlert(install, message) {
        if (resultAlert) {
          resultAlert.dismiss(false);
        }
        resultAlert = alertify.warning(
          !message
            ? `${_tcStr('Toolchain not found')}.<br>${_tcStr(
                'Click here to install it'
              )}`
            : message,
          100000,
          function (isClicked) {
            if (install && isClicked) {
              _installToolchain();
            }
          }
        );
      }

      this.removeToolchain = function () {
        if (resultAlert) {
          resultAlert.dismiss(false);
        }
        alerts.confirm({
          title: _tcStr('The toolchain will be removed'),
          body: _tcStr('Do you want to continue?'),
          onok: () => {
            _removeToolchain();
            toolchain.apio = '-';
            alertify.success(_tcStr('Toolchain removed'));
          },
        });
      };

      this.enableDrivers = () => {
        _checkToolchain(() => {
          if (toolchain.apio != '-') {
            drivers.enable();
          }
        });
      };

      this.disableDrivers = () => {
        _checkToolchain(() => {
          if (toolchain.apio != '-') {
            drivers.disable();
          }
        });
      };

      function apioInstall(pkg, callback) {
        executeCommand([common.APIO_CMD, 'install', pkg], callback);
      }

      function setupDriversAlert() {
        if (!infoAlert) {
          setTimeout(function () {
            infoAlert = alertify.message(
              _tcStr('Click here to <b>setup the drivers</b>'),
              30
            );
            infoAlert.callback = function (isClicked) {
              infoAlert = null;
              if (isClicked) {
                if (resultAlert) {
                  resultAlert.dismiss(false);
                }
                $rootScope.$broadcast('enableDrivers');
              }
            };
          }, 1000);
        }
      }

      function updateProgress(message, value) {
        var bar = $('#progress-bar');
        if (value === 100) {
          bar.removeClass('progress-bar-striped active');
        }
        bar.text(value + '%');
        bar.attr('aria-valuenow', value);
        bar.css('width', value + '%');
        $('#progress-message').text(message);
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
