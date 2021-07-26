/* eslint-disable no-unused-vars */
var IceTemplateSystem = function () {
  'use strict';
  this.render = function (template, view) {
    Mustache.parse(template);
    let r = Mustache.render(template, view);
    return r;
  };
};
