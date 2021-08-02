angular
  .module('icestudio')
  .controller(
    'DesignCtrl',
    function ($log, $rootScope, $scope, common, graph, project, utils) {
      'use strict';

      $scope.graph = graph;
      $scope.common = common;
      $scope.information = {};
      $scope.backup = {};
      $scope.toRestore = false;
      $scope.breadcrumbsJump = _breadcrumbsJump;
      $scope.editModeToggle = _editModeToggle;

      $rootScope.navigateProject = _navigateProject;

      graph.createPaper($('.paper'));

      function _resetViewAndLoadDesign(dsgn, opt) {
        graph.resetView();
        graph.loadDesign(dsgn, opt, function () {
          graph.fitContent();
        });
      }

      function _updateDesign(dsgn, blocks) {
        const dblocks = dsgn.graph.blocks;
        if ($scope.toRestore && common.submoduleId && dblocks.length > 0) {
          for (var i = 0; i < dblocks.length; i++) {
            if (common.submoduleUID === dblocks[i].id) {
              blocks[i].type = $scope.toRestore;
            }
          }
          $scope.toRestore = false;
        }
        return blocks;
      }

      function _breadcrumbsJump(selectedItem) {
        if (common.isEditingSubmodule) {
          $log.error('Navigation while editing is not supported!');
          return;
        }
        if (!selectedItem) {
          graph.popTitle();
        } else {
          while (selectedItem !== graph.popTitle()) {}
        }
        const n = graph.breadcrumbs.length - 1;
        if (n === 0) {
          var dsgn = project.get('design');
          dsgn.graph.blocks = _updateDesign(dsgn, dsgn.graph.blocks);
          _resetViewAndLoadDesign(dsgn, {disabled: false});
          common.submoduleId = undefined;
          common.submoduleUID = undefined;
        } else {
          const item = graph.breadcrumbs[n];
          var dependency = common.allDependencies[item.type];
          const dsgn = dependency.design;
          dependency.design.graph.blocks = _updateDesign(
            dsgn,
            dependency.design.graph.blocks
          );
          _resetViewAndLoadDesign(dsgn, {disabled: true});
          $scope.information = dependency.package;
          common.submoduleId = item.type;
          common.submoduleUID = item.id;
        }
        utils.rootScopeSafeApply();
      }

      function _editModeToggle() {
        var block = graph.breadcrumbs[graph.breadcrumbs.length - 1];
        var tmp = false;
        const rw = common.isEditingSubmodule;
        common.isEditingSubmodule = !rw;

        if (rw) {
          var cells = $scope.graph.getCells();
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
          $scope.graph.setCells(cells);

          tmp = utils.clone(common.allDependencies[block.type]);
          tmp.design.graph = utils.cellsToProject(
            $scope.graph.toJSON().cells
          ).design.graph;
          /*var hId = utils.dependencyID(tmp);*/
          var hId = block.type;
          common.allDependencies[hId] = tmp;
          common.forceBack = false;
          $scope.toRestore = hId;
        } else {
          tmp = common.allDependencies[block.type];
          $scope.toRestore = false;
        }

        _navigateProject(false, tmp, undefined, undefined, rw);
        utils.rootScopeSafeApply();
      }

      function _navigateProject(update, prj, submodule, submoduleId, editMode) {
        common.submoduleId = submodule || common.submoduleId;
        common.submoduleUID = submoduleId || common.submoduleUID;
        function _loadDesign() {
          graph.loadDesign(
            prj.design,
            {disabled: editMode !== undefined ? editMode : true},
            function () {
              graph.fitContent();
            }
          );
        }
        graph.resetView();
        !update ? _loadDesign() : project.update({deps: false}, _loadDesign);

        $scope.information = prj.package;
        if (common.forceBack) {
          common.forceBack = false;
          _breadcrumbsJump();
        }
      }
    }
  );
