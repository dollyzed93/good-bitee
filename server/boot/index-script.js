'use strict';
global.Promise = require('bluebird');
module.exports = function(server) {
  Promise.each(server.models(), (model) => {
    if (model.datasource) {
      var autoUpdate = Promise.promisify(model.datasource.autoUpdate);
      if (autoUpdate) {
        console.log(autoUpdate);
        return autoUpdate.call(model.datasource, model.modelName);
      }
    }
  });
};

