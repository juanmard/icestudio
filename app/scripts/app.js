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
    profile,
    project,
    tools,
    utils,
    boards,
    collections,
    gettextCatalog
  ) {
    'use strict';

    $('html').attr('lang', profile.get('language'));
    $('body').addClass('waiting');
    boards.loadBoards();
    utils.loadProfile(profile, function () {
      collections.loadAllCollections();
      utils.loadLanguage(profile, function () {
        if (profile.get('board') === '') {
          utils.selectBoardPrompt(function (selectedBoard) {
            profile.setBoard(boards.selectBoard(selectedBoard));
            tools.checkToolchain();
          });
        } else {
          profile.set('board', boards.selectBoard(profile.get('board')).name);
          tools.checkToolchain();
        }
        collections.sort();
        project.updateTitle(gettextCatalog.getString('Untitled'));
        $('body').removeClass('waiting');
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
