angular
  .module('icestudio')
  .controller('DesignCtrl', function (
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

    $rootScope.navigateProject = _navigateProject;
    $scope.editModeToggle = _editModeToggle;
    $scope.breadcrumbsBack = _breadcrumbsBack;
    $scope.breadcrumbsJump = _breadcrumbsJump;

    graph.createPaper($('.paper'));

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
          {disabled: editMode ? editMode : true},
          function () {
            graph.fitContent();
          }
        );
      }
      graph.resetView();
      !update ? _loadDesign() : project.update({deps: false}, _loadDesign);

      common.topModule = false;
      $scope.information = prj.package;
    }

    function _editModeToggle() {
      const rw = common.isEditingSubmodule;
      common.isEditingSubmodule = !rw;
      subModuleActive = !rw;
      graph.appEnable(!rw);
    }

    function _breadcrumbsBack() {
      graph.popTitle();
      _loadSelectedGraph();
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

    function _resetViewAndLoadDesign(dsgn, opt) {
      graph.resetView();
      graph.loadDesign(dsgn, opt, function () {
        graph.fitContent();
      });
    }

    function _loadSelectedGraph() {
      const n = graph.breadcrumbs.length - 1;
      if (n === 0) {
        var dsgn = project.get('design');
        _resetViewAndLoadDesign(dsgn, {disabled: false});
        common.topModule = true;
      } else {
        var type = graph.breadcrumbs[n].type;
        var dependency = common.allDependencies[type];
        var dsgn = dependency.design;
        _resetViewAndLoadDesign(dsgn, {disabled: true});
        $scope.information = dependency.package;
      }
      utils.rootScopeSafeApply();
    }
  });
