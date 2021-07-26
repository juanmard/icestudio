angular
  .module('icestudio')
  .controller(
    'DesignCtrl',
    function (
      $log,
      $rootScope,
      $scope,
      common,
      gettextCatalog,
      graph,
      project,
      profile,
      utils
    ) {
      'use strict';

      $scope.graph = graph;
      $scope.common = common;
      $scope.profile = profile;
      $scope.information = {};
      $scope.backup = {};
      $scope.toRestore = false;
      $scope.breadcrumbsBack = _breadcrumbsBack;
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
        if (
          $scope.toRestore !== false &&
          common.submoduleId !== false &&
          dblocks.length > 0
        ) {
          for (var i = 0; i < dblocks.length; i++) {
            if (common.submoduleUID === dblocks[i].id) {
              blocks[i].type = $scope.toRestore;
            }
          }
          $scope.toRestore = false;
        }
        return blocks;
      }

      function _loadSelectedGraph() {
        const n = graph.breadcrumbs.length - 1;
        if (n === 0) {
          var dsgn = project.get('design');
          dsgn.graph.blocks = _updateDesign(dsgn, dsgn.graph.blocks);
          _resetViewAndLoadDesign(dsgn, {disabled: false});
          common.topModule = true;
        } else {
          var type = graph.breadcrumbs[n].type;
          var dependency = common.allDependencies[type];
          var dsgn = dependency.design;
          common.allDependencies[type].design.graph.blocks = _updateDesign(
            dsgn,
            common.allDependencies[type].design.graph.blocks
          );
          _resetViewAndLoadDesign(dsgn, {disabled: true});
          $scope.information = dependency.package;
        }
        utils.rootScopeSafeApply();
      }

      function _breadcrumbsJump(selectedItem) {
        if (common.isEditingSubmodule) {
          $log.error('Navigation while editing is not supported!');
          return;
        }
        var item;
        do {
          item = graph.popTitle();
        } while (selectedItem !== item);
        _loadSelectedGraph();
      }

      function _breadcrumbsBack() {
        graph.popTitle();
        _loadSelectedGraph();
      }

      function _editModeToggle() {
        var block = graph.breadcrumbs[graph.breadcrumbs.length - 1];
        var tmp = false;
        const rw = common.isEditingSubmodule;
        subModuleActive = !rw;
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
        if (submodule !== undefined) {
          common.submoduleId = submodule;
        }
        if (submoduleId !== undefined) {
          common.submoduleUID = submoduleId;
        }

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

        common.topModule = false;
        $scope.information = prj.package;
        if (common.forceBack) {
          common.forceBack = false;
          _breadcrumbsBack();
        }
      }
    }
  );
