'use strict';
const msg = require('../messages/menu-message.json');
module.exports = function(Menu) {
  Menu.validatesPresenceOf('image', 'name', 'amount');
  Menu.validatesInclusionOf('type', {in: ['veg', 'nonveg']});
  Menu.addFoodItem = function(req, res, cb) {
    uploadFile();
    const kitchenId = req.accessToken.userId;
    function uploadFile() {
      Menu.app.models.Container.imageUpload(req, res,
        {container: 'foodItemImages'},
        function(err, success) {
          if (err) return cb(err, null);
          if (success) {
            if (success.files && success.files.image[0].url) {
              success.data = JSON.parse(success.data);
              createFoodItem(success);
            } else {
              return cb(new Error('Image is required'), null);
            }
          }
        }
      );
    }

    function createFoodItem(obj) {
      let itemData = {
        name: obj.data.name,
        description: obj.data.description,
        discount: obj.data.discount,
        type: obj.data.type,
        amount: obj.data.amount,
        image: (obj.files && obj.files.image[0].url) ?
         obj.files.image[0].url : '',
        kitchenId: kitchenId,
        categoryId: obj.data.categoryId,
        mealTypeId: obj.data.mealTypeId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      if (obj.data.foodItemId) {
        Menu.findById(obj.data.foodItemId, function(err, menuInst) {
          if (err) return cb(err, null);
          if (!menuInst) {
            return cb(new Error('No item found'), null);
          } else {
            menuInst.updateAttributes(itemData, function(err, updatedMenu) {
              if (err) return cb(err, null);
              return cb(null, {data: updatedMenu, msg: msg.updateFoodItem});
            });
          }
        });
      } else {
        Menu.create(itemData, function(err, menuInst) {
          if (err) return cb(err, null);
          else {
            return cb(null, {data: menuInst, msg: msg.addFoodItem});
          }
        });
      }
    }
  };
  Menu.remoteMethod('addFoodItem', {
    accepts: [
      {arg: 'req', type: 'object', http: {source: 'req'}},
      {arg: 'res', type: 'object', http: {source: 'res'}},
    ],
    returns: {arg: 'success', type: 'object'},
    http: {verb: 'post', path: '/add_food_item',
      description: 'add a food item to the menu'},
  });

  Menu.uploadFoodItemPic = function(req, res, cb) {
    Menu.app.models.Container.imageUpload(req, res,
      {container: 'foodItemImages'},
      function(err, success) {
        if (err) cb(err, null);
        if (success) {
          success.data = JSON.parse(success.data);
          const foodItemId = success.data.foodItemId;
          Menu.findById(foodItemId, function(err, foodInst) {
            if (err) cb(err, null);
            if (!foodInst) cb(new Error('no food item found'), null);
            else {
              const data = {
                image: (success.files && success.files.image[0].url) ?
                success.files[0].url : '',
              };
              foodInst.updateAttributes(data, function(error, foodItem) {
                if (error) cb(error, null);
                if (foodItem) {
                  cb(null, {data: foodItem, msg: msg.imageUpload});
                }
              });
            }
          });
        }
      }
    );
  };

  Menu.remoteMethod('uploadFoodItemPic', {
    accepts: [
      {arg: 'req', type: 'object', http: {source: 'req'}},
      {arg: 'res', type: 'object', http: {source: 'res'}},
    ],
    returns: {arg: 'success', type: 'object'},
    http: {verb: 'post', path: '/add_food_pic',
      description: 'add or update the food item pic'},
  });

  Menu.foodItemById = function(req, cb) {
    const foodItemId = req.query.foodItemId;
    console.log(foodItemId);
    let filter = {};
    filter.include = [
      {
        relation: 'categories',
        scope: {
          fields: ['name'],
        },
      },
      {
        relation: 'mealType',
        scope: {
          fields: ['name'],
        },
      },
      {
        relation: 'kitchen',
        scope: {
          fields: ['kitchenName', 'addresses'],
        },
      },
    ];
    // console.log('--------------');
    // console.log(filter);
    Menu.findById(foodItemId, filter, function(err, foodItemInst) {
      if (err) cb(err, null);
      if (!foodItemInst) cb(new Error('no food item found'), null);
      else {
        cb(null, {data: foodItemInst, msg: msg.getfoodItem});
      }
    });
  };

  Menu.remoteMethod('foodItemById', {
    description: 'get a food item by id',
    accepts: [
      {arg: 'req', type: 'object', http: {source: 'req'}},
    ],
    returns: {arg: 'success', type: 'object'},
    http: {verb: 'get', path: '/get_food_item'},
  });

  Menu.getKitchenMenu = function(req, cb) {
    const kitchenId = req.query.kitchenId;
    let filter = {};
    filter.include = [
      {
        relation: 'categories',
        scope: {
          fields: ['name'],
        },
      },
      {
        relation: 'mealType',
        scope: {
          fields: ['name'],
        },
      },
      {
        relation: 'kitchen',
        scope: {
          fields: ['kitchenName', 'addresses'],
        },
      },
    ];
    Menu.find({where: {kitchenId: kitchenId}}, filter,
      function(err, kitchenMenu) {
        if (err) cb(err, null);
        if (!kitchenMenu) cb(new Error('no food item found'), null);
        else {
          cb(null, {data: kitchenMenu, msg: msg.getKitchenMenu});
        }
      }
    );
  };

  Menu.remoteMethod('getKitchenMenu', {
    description: 'get a food item by id',
    accepts: [
      {arg: 'req', type: 'object', http: {source: 'req'}},
    ],
    returns: {arg: 'success', type: 'object'},
    http: {verb: 'get', path: '/get_kitchen_menu'},
  });
};

// Menu.foodItemById = function(req, foodItemId, cb) {
  //   console.log(foodItemId);
  //   let filter = {};
  //   filter.include = [
  //     {
  //       relation: 'categories',
  //       scope: {
  //         fields: ['name'],
  //       },
  //     },
  //     {
  //       relation: 'mealType',
  //       scope: {
  //         fields: ['name'],
  //       },
  //     },
  //     {
  //       relation: 'kitchen',
  //       scope: {
  //         fields: ['kitchenName', 'addresses'],
  //       },
  //     },
  //   ];
  //   console.log('--------------');
  //   console.log(filter);
  //   Menu.findById(foodItemId, filter, function(err, foodItemInst) {
  //     if (err) cb(err, null);
  //     if (!foodItemInst) cb(new Error('no food item found'), null);
  //     else {
  //       cb(null, {data: foodItemInst, msg: msg.getfoodItem});
  //     }
  //   });
  // };

  // Menu.remoteMethod('foodItemById', {
  //   description: 'get a food item by id',
  //   accepts: [
  //     {arg: 'req', type: 'object', http: {source: 'req'}},
  //     {arg: 'foodItemId', type: 'string', required: true},
  //   ],
  //   returns: {arg: 'success', type: 'object'},
  //   http: {verb: 'get', path: '/get_food_item'},
  // });
