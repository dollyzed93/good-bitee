'use strict';

module.exports = function(Container) {
  Container.imageUpload = (req, res, containerName, cb) => {
    Container.getContainer(containerName.container, function(err, success) {
      if (err) {
        if (err.statusCode === 404) {
          Container.createContainer({name: containerName.container},
            function(err, success) {
              if (err)
                cb(err, null);
              uploadFile();
            });
        } else {
          cb(err, null);
        }
      }
      uploadFile();
    });
    function uploadFile() {
      Container.upload(req, res, {container: containerName.container,
        nameConflict: 'makeUnique'}, function(err, success) {
          if (err) {
            cb(err, null);
          } else {
            var obj = {};
            // console.log('filesupload: ', success);
            for (var file in success.files) {
              for (var i = 0; i < success.files[file].length; i++) {
                success.files[file][i].url = '/api/Containers/' +
                success.files[file][i].container + '/download/' +
                success.files[file][i].name;
              }
            }

            obj.files = success.files;
            for (var field in success.fields) {
              obj[field] = success.fields[field][0];
            }
            // console.log('obj retured after uploading a file: ', obj);
            cb(null, obj);
          }
        });
    }
  };
  Container.remoteMethod('imageUpload', {
    accepts: [
      {arg: 'req', type: 'object', http: {source: 'req'}},
      {arg: 'res', type: 'object', http: {source: 'res'}},
      {arg: 'containerName', type: 'string', require: true},
    ],
    returns: {arg: 'success', type: 'object'},
  });
};
