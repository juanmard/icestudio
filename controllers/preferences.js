// Please note that $uibModalInstance represents a modal window (instance) dependency.
// It is not the same as the $uibModal service.

/* eslint-disable camelcase */

angular
  .module('icestudio')
  .controller(
    'PrefCtrl',
    (
      $log,
      $scope,
      $uibModalInstance,
      alerts,
      collections,
      common,
      gettextCatalog,
      graph,
      gui,
      nodeFs,
      project,
      tools,
      utils
    ) => {
      'use strict';

      const _tcStr = (str, args) => {
        return gettextCatalog.getString(str, args);
      };

      $scope.tabs = {
        collections: {icon: 'cubes', title: 'Collections'},
        plugins: {icon: 'exchange', title: 'Plugins', headonly: true},
        language: {
          icon: 'language',
          title: 'Language',
        },
        theme: {
          icon: 'snowflake-o',
          title: 'UI Theme',
        },
        toolchain: {
          icon: 'gear',
          title: 'Toolchain',
        },
      };

      $scope.done = () => {
        $uibModalInstance.close();
      };

      //---

      var resultAlert = null;

      $scope.common = common;
      $scope.tools = tools;

      $scope.externalPath = common.get('externalCollections');

      $scope.languages = {
        ca_ES: 'Catalan',
        cs_CZ: 'Czech',
        de_DE: 'German',
        el_GR: 'Greek',
        en: 'English',
        es_ES: 'Spanish',
        eu_ES: 'Basque',
        fr_FR: 'French',
        gl_ES: 'Galician',
        it_IT: 'Italian',
        ko_KR: 'Korean',
        nl_NL: 'Dutch',
        ru_RU: 'Russian',
        zh_CN: 'Chinese',
      };

      $scope.themes = [
        ['dark', 'Dark'],
        ['juanma', "Juanma's"],
        ['highcontrast', 'High Contrast'],
        ['light', 'Light'],
      ];

      $scope.saveCollectionsToProfile = tools.saveCollections;

      $scope.addCollections = () => {
        utils.openDialog('#input-add-collection', '.zip', (filepaths) => {
          filepaths = filepaths.split(';');
          tools.addCollections(filepaths);
        });
      };

      $scope.reloadCollections = () => {
        collections.loadAllCollections();
      };

      $scope.removeCollection = (collection) => {
        alerts.confirm({
          title: _tcStr('Do you want to remove the {{name}} collection?', {
            name: `<b>${collection.name}</b>`,
          }),
          body: _tcStr(
            'All the (modified) projects in the collection will be deleted.'
          ),
          onok: () => {
            tools.deleteFolderRecursive(collection.path);
            collections.loadInternalCollections();
            alertify.success(
              _tcStr('Collection {{name}} removed', {
                name: `<b>${collection.name}</b>`,
              })
            );
            utils.rootScopeSafeApply();
          },
        });
      };

      $scope.removeAllCollections = () => {
        if (common.internalCollections.length > 0) {
          alerts.confirm({
            title: _tcStr('Do you want to remove all the collections?'),
            body: _tcStr(
              'All the (modified) projects stored in them will be deleted.'
            ),
            onok: () => {
              tools.deleteFolderRecursive(common.INTERNAL_COLLECTIONS_DIR);
              collections.loadInternalCollections();
              alertify.success(_tcStr('All collections removed'));
              utils.rootScopeSafeApply();
            },
          });
        } else {
          alertify.warning(_tcStr('No collections stored'), 5);
        }
      };

      $scope.setExternalCollections = () => {
        var externalCollections = common.get('externalCollections');
        utils.renderForm(
          [
            {
              type: 'text',
              icon: 'cubes',
              title: _tcStr('Enter the external collections path'),
              value: externalCollections || '',
            },
          ],
          (evt, values) => {
            var newExternalCollections = values[0];
            if (resultAlert) {
              resultAlert.dismiss(false);
            }
            if (newExternalCollections !== externalCollections) {
              if (
                newExternalCollections === null ||
                newExternalCollections === '' ||
                nodeFs.existsSync(newExternalCollections)
              ) {
                common.set('externalCollections', newExternalCollections);
                collections.loadExternalCollections();
                utils.rootScopeSafeApply();
                alertify.success(_tcStr('External collections updated'));
              } else {
                evt.cancel = true;
                resultAlert = alertify.error(
                  _tcStr(
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

      $scope.showCollectionData = (collection) => {
        const cname = collection.name;
        $log.debug('[menu.showCollectionData] cname:', cname);
        var readme = collection.content.readme;
        $log.debug('[menu.showCollectionData] content:', collection.content);
        if (!readme) {
          alertify.error(
            _tcStr('Info of collection &lt;{{collection}}&gt; is undefined', {
              collection: cname,
            }),
            5
          );
          return;
        }
        if (!nodeFs.existsSync(readme)) {
          alertify.error(
            _tcStr(
              'README of collection &lt;{{collection}}&gt; does not exist',
              {
                collection: cname,
              }
            ),
            5
          );
          return;
        }
        _openWindow(
          'viewers/markdown/readme.html?readme=' + escape(readme),
          'Collection: ' + cname
        );
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
          icon: 'images/icestudio-logo.png',
        });
      }

      $scope.setExternalPlugins = () => {
        var externalPlugins = common.get('externalPlugins');
        utils.renderForm(
          [
            {
              type: 'text',
              icon: 'exchange',
              title: _tcStr('Enter the external plugins path'),
              value: externalPlugins || '',
            },
          ],
          (evt, values) => {
            var newExternalPlugins = values[0];
            if (resultAlert) {
              resultAlert.dismiss(false);
            }
            if (newExternalPlugins !== externalPlugins) {
              if (
                newExternalPlugins === null ||
                newExternalPlugins === '' ||
                nodeFs.existsSync(newExternalPlugins)
              ) {
                common.set('externalPlugins', newExternalPlugins);
                alertify.success(_tcStr('External plugins updated'));
              } else {
                evt.cancel = true;
                resultAlert = alertify.error(
                  _tcStr(
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

      $(document).on('langChanged', (evt, lang) => {
        $scope.selectLanguage(lang);
      });

      $scope.selectLanguage = (language) => {
        if (common.get('language') !== language) {
          common.set('language', graph.selectLanguage(language));
          // Reload the project
          project.update(
            {
              deps: false,
            },
            () => {
              graph.loadDesign(project.get('design'), {
                disabled: false,
              });
            }
          );
          // Rearrange the collections content
          collections.sort();
        }
      };

      // Theme support
      $scope.selectTheme = (theme) => {
        if (common.get('theme') !== theme) {
          common.set('theme', theme);
        }
      };

      // Apio repository and reference
      $scope.setApioRepo = () => {
        var apioRepo = common.get('apioRepo');
        var apioRef = common.get('apioRef');
        utils.renderForm(
          [
            {
              type: 'text',
              icon: 'gear',
              title: _tcStr('Source for installing the toolchain'),
              label: _tcStr('Repository'),
              value: apioRepo || 'juanmard/icestudio',
            },
            {
              type: 'text',
              label: _tcStr('Reference'),
              value: apioRef || 'apio-dev',
            },
          ],
          (evt, values) => {
            const apioRepo = values[0];
            const apioRef = values[1];
            var updated = false;
            if (apioRepo != common.get('apioRepo')) {
              common.set('apioRepo', apioRepo);
              updated = true;
            }
            if (apioRef != common.get('apioRef')) {
              common.set('apioRef', apioRef);
              updated = true;
            }
            if (updated) {
              alertify.success(
                _tcStr('Toolchain source repository/reference updated')
              );
            }
          }
        );
      };

      // Custom Python environment
      $scope.setPythonEnv = function () {
        let pythonEnv = common.get('pythonEnv');
        let formSpecs = [
          {
            type: 'text',
            icon: 'terminal',
            title: 'Python environment',
            label: _tcStr('Python executable'),
            value: pythonEnv || '',
          },
        ];
        utils.renderForm(formSpecs, function (evt, values) {
          let newPythonPath = values[0];

          if (resultAlert) {
            resultAlert.dismiss(false);
          }
          if (newPythonPath !== pythonEnv) {
            if (!nodeFs.existsSync(newPythonPath)) {
              evt.cancel = true;
              resultAlert = alertify.error(
                _tcStr(
                  'Custom Python path {{path}} does not exist',
                  {
                    path: newPythonPath,
                  },
                  5
                )
              );
              return;
            }
            let newPythonEnv = newPythonPath;
            common.set('pythonEnv', newPythonEnv);
            alertify.success(_tcStr('Python environment updated'));
          }
        });
      };
    }
  );
