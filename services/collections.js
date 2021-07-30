angular
  .module('icestudio')
  .service(
    'collections',
    function (utils, common, gettextCatalog, nodeFs, nodePath) {
      'use strict';

      const DEFAULT = 'Basic';
      const MAX_LEVEL_SEARCH = 20;

      this.loadAllCollections = function () {
        this.loadDefaultCollection();
        this.loadInternalCollections();
        this.loadExternalCollections();
      };

      function _getFilesRecursive(folder, level) {
        var fileTree = [];
        try {
          level--;
          nodeFs.readdirSync(folder).forEach((name) => {
            var path = nodePath.join(folder, name);
            if (_isDirectory(path)) {
              fileTree.push({
                name: name,
                path: path,
                children: level >= 0 ? _getFilesRecursive(path, level) : [],
              });
            } else if (/.*\.(ice|json|md)$/.test(name)) {
              fileTree.push({
                name: common.basename(name),
                path: path,
              });
            }
          });
        } catch (e) {
          console.warn(e);
        }
        return fileTree;
      }

      this.loadDefaultCollection = function () {
        common.defaultCollection = _newCollection(
          DEFAULT,
          common.DEFAULT_COLLECTION_DIR,
          _getFilesRecursive(common.DEFAULT_COLLECTION_DIR, MAX_LEVEL_SEARCH)
        );
      };

      function _isDirectory(path) {
        return nodeFs.lstatSync(path).isDirectory();
      }

      function _contains(array, item) {
        return array.indexOf(item) !== -1;
      }

      function isCollectionPath(path) {
        var result = false;
        try {
          var content = nodeFs.readdirSync(path);
          result =
            content &&
            _contains(content, 'package.json') &&
            nodeFs.lstatSync(nodePath.join(path, 'package.json')).isFile() &&
            ((_contains(content, 'blocks') &&
              _isDirectory(nodePath.join(path, 'blocks'))) ||
              (_contains(content, 'examples') &&
                _isDirectory(nodePath.join(path, 'examples'))));
        } catch (e) {
          // console.warn(e);
        }
        return result;
      }

      function _findCollections(folder) {
        var collectionsPaths = [];
        try {
          if (folder) {
            collectionsPaths = nodeFs
              .readdirSync(folder)
              .map(function (name) {
                return nodePath.join(folder, name);
              })
              .filter(function (path) {
                return (
                  (_isDirectory(path) ||
                    nodeFs.lstatSync(path).isSymbolicLink()) &&
                  isCollectionPath(path)
                );
              });
          }
        } catch (e) {
          // console.warn(e);
        }
        return collectionsPaths;
      }

      this.loadInternalCollections = function () {
        common.internalCollections = loadCollections(
          _findCollections(common.INTERNAL_COLLECTIONS_DIR)
        );
        const data = common.get('collections');
        if (data) {
          data.forEach(function (item) {
            common.internalCollections.forEach((x) => {
              if (x.name === item.name) {
                x.disabled = item.disabled;
              }
            });
          });
        }
      };

      this.loadExternalCollections = function () {
        var edir = common.get('externalCollections');
        if (edir === common.INTERNAL_COLLECTIONS_DIR) {
          return;
        }
        common.externalCollections = loadCollections(_findCollections(edir));
      };

      function loadCollections(paths) {
        var collections = [];
        paths.forEach(function (path) {
          collections.push(
            _newCollection(
              nodePath.basename(path),
              path,
              _getFilesRecursive(path, MAX_LEVEL_SEARCH)
            )
          );
        });
        return collections;
      }

      function _newEmptyCollection(name, path) {
        return {
          name: name,
          path: path,
          content: {
            blocks: [],
            examples: [],
            package: {},
            readme: '',
          },
        };
      }

      function _newCollection(name, path, children) {
        var collection = _newEmptyCollection(name, path);
        console.debug('[collections._newCollection] collection:', collection);
        for (var child of children) {
          console.debug(
            '[collections._newCollection] child:',
            child.name,
            !child.children
          );
          if (!child.children) {
            if (child.name === 'README') {
              collection.content.readme = child.path;
            }
            continue;
          }
          switch (child.name) {
            case 'blocks':
              collection.content.blocks = child.children;
              break;
            case 'examples':
              collection.content.examples = child.children;
              break;
            case 'package':
              try {
                collection.content.package = require(child.path);
              } catch (e) {}
              break;
          }
        }
        return collection;
      }

      this.sort = function () {
        function sortCollections(collections) {
          if (!collections) {
            return;
          } // FIXME: should no fail silently
          function sortContent(items) {
            if (!items) {
              return;
            } // FIXME: should no fail silently
            items.sort(byNameAlphaNum);
            for (var i in items) {
              sortContent(items[i].children);
            }
          }
          for (var collection of collections) {
            if (!collection.content) {
              continue;
            }
            sortContent(collection.content.blocks);
            sortContent(collection.content.examples);
          }
        }
        sortCollections([common.defaultCollection]);
        sortCollections(common.internalCollections);
        sortCollections(common.externalCollection);
      };

      function byNameAlphaNum(a, b) {
        a = gettextCatalog.getString(a.name);
        b = gettextCatalog.getString(b.name);
        return alphaNumSort(a, b);
      }

      // Thanks: Gideon, https://ux.stackexchange.com/a/134765
      function alphaNumSort(a, b) {
        var regex = /[^\d]+|\d+/g;

        // Split each name into alphabetical and numeric parts
        var ar = a.match(regex);
        var br = b.match(regex);
        var localeCompare;

        // For each part in the two split names, perform the following comparison:
        for (let ia in ar) {
          for (let ib in br) {
            var ari = ar[ia];
            if (ari === undefined) {
              ari = '';
            }
            var bri = br[ib];
            if (bri === undefined) {
              bri = '';
            }

            // If both parts are strictly numeric, compare them as numbers
            if (!isNaN(ari) && !isNaN(bri)) {
              localeCompare = ari.localeCompare(
                bri,
                {},
                {
                  numeric: true,
                }
              );
            } else {
              localeCompare = ari.localeCompare(
                bri,
                {},
                {
                  ignorePunctuation: true,
                  sensitivity: 'base',
                }
              );
            }
            if (localeCompare !== 0) {
              // If you run out of parts, the name with the fewest parts comes first
              return localeCompare;
            }

            // If they're the same, move on to the next part
          }
        }
        return localeCompare;
      }
    }
  );
