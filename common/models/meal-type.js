'use strict';
const msg = require('../messages/meal-message.json');
module.exports = function(Mealtype) {
  Mealtype.addMealType = function(req, name, cb) {
    const peopleId = req.accessToken.userId;
    const data = {
      peopleId: peopleId,
      name: name,
    };
    Mealtype.create(data, function(err, mealInst) {
      if (err) return cb(err, null);
      cb(null, {data: mealInst, msg: msg.add});
    });
  };
  Mealtype.remoteMethod('addMealType', {
    accepts: [
      {arg: 'req', type: 'object', http: {source: 'req'}},
      {arg: 'name', type: 'string', required: true, http: {source: 'form'}},
    ],
    returns: {arg: 'success', type: 'object'},
    http: {verb: 'post', path: '/add_meal_type',
      description: 'add a meal type'},
  });

  Mealtype.getMeals = function(cb) {
    Mealtype.find({}, function(err, success) {
      if (err) return cb(err, null);
      cb(null, {data: success, msg: msg.fetchedMeals});
    });
  };

  Mealtype.remoteMethod('getMeals', {
    accepts: [],
    returns: {arg: 'success', type: 'object'},
    http: {verb: 'get', path: '/meal_types',
      description: 'get all meals available'},
  });
};
