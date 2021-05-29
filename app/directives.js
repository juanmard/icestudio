angular
  .module('icestudio')

  .directive('menutree', function () {
    'use strict';
    /*
    Draws a data structure such as the following, as a dropdown menu with two levels:

    data = [
      {name: "groupname",
      children: [
        { path: "apath", name: "aname" },
        { path: "anotherpath", name: "anothername" },
      ]}
    ]
  */
    return {
      restrict: 'E',
      replace: true,
      scope: {
        data: '=',
        right: '=',
        callback: '&',
      },
      template: `
<ul uib-dropdown-menu ng-show="data.length > 0">
  <child
    ng-repeat="item in data"
    cdata="item"
    callback="click(path)"
    right="right"
  ></child>
</ul>
`,
      link: function (scope /*, element, attrs*/) {
        scope.click = function (path) {
          scope.callback({path: path});
        };
      },
    };
  })

  .directive('child', function ($compile) {
    'use strict';
    return {
      restrict: 'E',
      replace: true,
      scope: {
        cdata: '=',
        right: '=',
        callback: '&',
      },
      template: `
<li
  ng-class="cdata.children ? (right ? \'dropdown-submenu-right\' : \'dropdown-submenu\') : \'\'"
  uib-dropdown
>
  <a href
    ng-click="click(cdata.path)"
    ng-if="!cdata.children"
  >{{ cdata.name | translate }}</a>
  <a href
    uib-dropdown-toggle
    ng-if="cdata.children"
  >{{ cdata.name | translate }}</a>
</li>
`,
      link: function (scope, element /*, attrs*/) {
        scope.click = function (path) {
          scope.callback({path: path});
        };
        if (angular.isArray(scope.cdata.children)) {
          element.append(`
<menutree
  data="cdata.children"
  callback="click(path)"
  right="right"
></menutree>
`);
          $compile(element.contents())(scope);
        }
      },
    };
  });
