/* eslint-disable no-unused-vars */

var ICEpm = new IcePlugManager();

angular
  .module('icestudio', ['ui.bootstrap', 'ngRoute', 'gettext'])
  .config([
    '$routeProvider',
    function ($routeProvider) {
      'use strict';
      $routeProvider
        .when('/', {
          templateUrl: 'views/main.html',
          controller: 'MainCtrl',
        })
        .otherwise({
          redirectTo: '/',
        });
    },
  ])
  .run(function (
    boards,
    collections,
    common,
    gettextCatalog,
    profile,
    project,
    tools,
    utils
  ) {
    'use strict';

    $('html').attr('lang', profile.get('language'));
    utils.startWait();
    boards.loadBoards();
    utils.loadProfile(profile, function () {
      collections.loadAllCollections();
      utils.loadLanguage(profile, function () {
        if (profile.get('board') === '') {
          utils.selectBoardPrompt(function (selectedBoard) {
            boards.selectBoard(selectedBoard);
            profile.set('board', common.selectedBoard.name);
            tools.checkToolchain();
          });
        } else {
          boards.selectBoard(profile.get('board'));
          profile.set('board', common.selectedBoard.name);
          tools.checkToolchain();
        }
        collections.sort();
        project.updateTitle(gettextCatalog.getString('Untitled'));
        utils.endWait();
      });
    });
  })
  .config([
    '$compileProvider',
    function ($compileProvider) {
      'use strict';
      $compileProvider.aHrefSanitizationWhitelist(
        /^\s*(https?|local|data|chrome-extension):/
      );
      $compileProvider.imgSrcSanitizationWhitelist(
        /^\s*(https?|local|data|chrome-extension):/
      );
    },
  ]);
