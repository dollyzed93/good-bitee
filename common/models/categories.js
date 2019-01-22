/* eslint-disable indent */
'use strict';

var msg = require('../messages/category-message.json');
module.exports = function(Categories) {
  Categories.disableRemoteMethodByName('find');
  Categories.addCategory = function(req, res, cb) {
    uploadFile();
    function uploadFile() {
      Categories.app.models.Container.imageUpload(req, res,
          {container: 'categoryImages'},
        function(err, success) {
          if (err) {
            cb(err, null);
          } else {
            if (success.data) {
              success.data = JSON.parse(success.data);
              createCategory(success);
            } else {
              cb(new Error('data not found'), null);
            }
          }
        }
      );
    }

    function createCategory(obj) {
      var data = {
        name: obj.data.name,
      };
      data.createdAt = new Date();
      data.updatedAt = new Date();
      if (obj.files && obj.files.image) {
        data.image = obj.files.image[0].url;
      }
      if (req.query && req.query.categoryId) {
        let categoryId = req.query.categoryId;
        Categories.findById(categoryId, function(err, categoryInst) {
          if (err) return cb(err, null);
          data.updatedAt = new Date();
          categoryInst.updateAttributes(data, function(err, success) {
            if (err)
              cb(err, null);
            else
            cb(null, {data: success, msg: msg.editCategory});
          });
        });
      } else {
        Categories.create(data, function(err, success) {
          if (err) {
            cb(err, null);
          }
          cb(null, {data: success, msg: msg.addCategory});
        });
      }
    }
  };

  Categories.remoteMethod('addCategory', {
    description: 'adding categories',
    accepts: [
     {arg: 'req', type: 'object', http: {source: 'req'}},
     {arg: 'res', type: 'object', http: {source: 'res'}},
    ],
    returns: {arg: 'success', type: 'object'},
    http: {verb: 'post', path: '/add_category'},
  });

  Categories.getAllCategories = (filter, cb) => {
    Categories.find(filter, (err, categories) => {
      if (err) cb(err, null);
      cb(null, {data: categories, msg: msg.getCategories});
    });
  };

  Categories.remoteMethod('getAllCategories', {
    accepts: [
      {arg: 'filter', type: 'object'},
    ],
    returns: {'arg': 'success', 'type': 'object'},
    http: {'verb': 'get'},
  });

  Categories.edit = function(req, res, cb) {
    console.log(req.query);
    if (!req.query.categoryId)
      return cb(new Error('Category is not defined'), null);
    else        {
      Categories.addCategory(req, res, cb);
    }
  };

  Categories.remoteMethod('edit', {
    accepts: [
    {arg: 'res', type: 'object', http: {source: 'req'}},
    {arg: 'req', type: 'object', http: {source: 'res'}},
    ],
    returns: {arg: 'success', type: 'object'},
    http: {verb: 'post', path: '/edit_category'},
  });

  Categories.getCategory = function(categoryId, cb) {
    Categories.findById(categoryId, function(err, categoryInst) {
      if (err) {
        cb(err, null);
      }
      cb(null, {data: categoryInst, msg: msg.getCategory});
    });
  };

  Categories.remoteMethod('getCategory', {
    accepts: [
      {arg: 'categoryId', type: 'string', required: true},
    ],
    returns: {arg: 'success', type: 'object'},
    http: {verb: 'get', path: '/getCategoryById'},
  });

  Categories.delete = function(categoryId, req, cb) {
    Categories.findById(categoryId, function(error, categoryInst) {
      if (error) {
        cb(error, null);
      } else {
        if (categoryInst) {
          cb(null, {data: categoryInst, msg: msg.categoryDelete});
        } else {
          cb(new Error('No instance found'), null);
        }
      }
    });
  };

  Categories.remoteMethod('delete', {
    accepts: [
      {arg: 'categoryId', type: 'string', require: true},
      {arg: 'req', type: 'object', http: {source: 'req'}},
    ],
    returns: {arg: 'success', type: 'object'},
  });
};
