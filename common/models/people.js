'use strict';
const msg = require('../messages/people-message.json');
const gf = require('../services/global_functions.js');
const config = require('../../server/config.json');
const path = require('path');
module.exports = function(People) {
  People.disableRemoteMethodByName('login');
  // People.disableRemoteMethodByName('logout');
  People.disableRemoteMethodByName('confirm');
  People.disableRemoteMethodByName('changePassword');
  People.disableRemoteMethodByName('resetPassword');
  People.disableRemoteMethodByName('setPassword');
  People.validatesInclusionOf('realm',
  {in: ['admin', 'customer', 'kitchen', 'deliveryboy']});
  People.validatesInclusionOf('adminVerifiedStatus',
  {in: ['pending', 'approved', 'rejected']});
  People.validatesInclusionOf('regPaid',
  {in: ['hold', 'released']});
  People.validatesLengthOf('password',
   {min: 6, message: {min: 'Password is too short'}});
  People.validatesPresenceOf('mobile', 'email', 'fullName');
  // eslint-disable-next-line max-len
  const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  People.validatesFormatOf('email',
    {with: re, message: 'Email is invalid'});
  People.validatesUniquenessOf('mobile', {message: 'Mobile already exists'});
  People.validatesLengthOf('fullName',
    {min: 1, message: {min: 'Name should be atleast 1 character long'}});
  const g = require('../../node_modules/loopback/lib/globalize');
  People.beforeRemote('signup', function(ctx, modelInstance, next) {
    console.log('> user.beforeRemote triggered');
    People.app.models.Container.imageUpload(ctx.req, ctx.res,
      {container: 'profileImages'}, function(err, success) {
        if (err) return next(err, null);
        if (success.data) {
          success.data = JSON.parse(success.data);
          const user = success.data;
          if (!user.customerId) {
            if (!user.fullName || !user.mobile ||
              !user.email || !user.password || !user.realm) {
              return next(new Error('Incomplete data is provided'));
            } else {
              ctx.req.user = success;
              next();
            }
          }
        } else {
          return next(new Error('data not found'));
        }
      }
    );
  });

  People.signup = (req, res, cb) => {
    let obj = req.user;
    console.log(obj);
    let userdata = {
      fullName: obj.data.fullName,
      mobile: obj.data.mobile,
      email: obj.data.email,
      password: obj.data.password,
      realm: obj.data.realm,
      address: obj.data.address,
      addresses: obj.data.addresses || [],
      image: (obj.files && obj.files.image) ?
      (obj.files && obj.files.image) : '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (obj.data.realm === 'customer') {
      userdata.adminVerifiedStatus = 'approved';
      userdata.regPaid = 'released';
    }
    if (obj.data.realm === 'kitchen') {
      userdata.kitchenName = obj.data.kitchenName;
      userdata.description = obj.data.description;
      userdata.startTime = {
        value: obj.data.startTime,
        valueInMinute: gf.convertToMinutes(obj.data.startTime),
      };
      userdata.endTime = {
        value: obj.data.endTime,
        valueInMinute: gf.convertToMinutes(obj.data.endTime),
      };
      userdata.workingDays = obj.data.workingDays;
      userdata.adminVerifiedStatus = 'pending';
      userdata.isAvailable = true;
      userdata.noOfDeliveryBoy = 0;
      userdata.categoryIds = obj.data.categoryIds;
      userdata.bankName = obj.data.bankName;
      userdata.firmName = obj.data.firmName;
      userdata.ifscCode = obj.data.ifscCode;
      userdata.accountNumber = obj.data.accountNumber;
      userdata.kitchenImage = (obj.files && obj.files.kitchenImage) ?
      (obj.files && obj.files.kitchenImage[0].url) : '';
      userdata.regPaid = 'hold';
    }
    // if (obj.data.realm === 'deliveryboy') {
    //   userdata.isOrderAssigned = false;
    //   userdata.ktchenId = obj.data.kitchenId;
    //   userdata.emailVerified = true;
    //   userdata.mobileVerfied = true;
    // userdata.adminVerifiedStatus = 'approved';
    // userdata.regPaid = 'released';
    // }
    console.log('data to save : ', userdata);
    if (obj.data.peopleId) {
      People.findById(obj.data.peopleId, function(err, peopleInst) {
        if (err) return cb(err, null);
        if (!peopleInst) return cb(new Error('No user found'), null);
        else {
          peopleInst.updateAttributes(userdata, {validate: true},
            function(error, success) {
              if (error) return cb(error, null);
              else {
                cb(null, {data: success, msg: msg.profileUpdated});
              }
            }
          );
        }
      });
    } else {
      People.create(userdata, function(err, userInst) {
        if (err) {
          return cb(err, null);
        }
        if (userInst) {
          cb(null, {data: userInst, msg: msg.signup});
        }
      });
    }
  };

  People.afterRemote('signup', function(ctx, instance, next) {
    console.log('> user.afterRemote triggered');
    let userInstance = instance.success.data;
    userInstance.addRole(userInstance.realm, function(err, success) {
      if (err) next(new Error(err));
      if (!userInstance.mobileVerified) {
        let mobOtp = {
          otp: gf.getOtp(),
          createdAt: new Date(),
          expiredAt: new Date(),
        };
        mobOtp.expiredAt.setMinutes(mobOtp.expiredAt.getMinutes() + 5);
        userInstance.mobOtp = mobOtp;
      }
      if (!userInstance.emailVerified) {
        const verifyLink = 'http://' +
          config.host + ':' + config.port +
          '/api' + '/People/confirm' + '?uid=' + userInstance.id + '&redirect=http://' +
          config.host + '/verified?user_id=' + userInstance.id;
        console.log('Link: ' + verifyLink);
        const options = {
          type: 'email',
          to: userInstance.email,
          from: 'dollygarg.zed@gmail.com',
          subject: 'Thanks for registering.',
          template: path.resolve(__dirname, '../../server/views/verify.ejs'),
          redirect: 'http://' + config.host + '/login?verified=true',
          user: People,
          verifyLink: verifyLink,
        };
        userInstance.verify(options, function(err, response, nextUser) {
          if (err) return next();
          console.log('> verification email sent:', response);
          context.res.render('response', {
            title: 'Signed up successfully',
            content: `Please check your email and
              click on the verification link -
              'before logging in.`,
            redirectTo: '/',
            redirectToLinkText: 'Log in',
          });
          next();
        });
      } else {
        next();
      }
    });
  });

  People.afterRemoteError('signup', function(ctx, next) {
    console.log('error while signing up!', ctx.error);
    next();
  });

  People.prototype.addRole = function(role, cb) {
    const _self = this;
    People.app.models.Role.findOne({where: {name: role}},
      function(err, roleInst) {
        if (err) { return cb(err, null); }
        if (roleInst) {
          People.app.models.RoleMapping.destroyAll({principalId: _self.id},
            function(error, success) {
              if (error) return cb(error, null);
              if (success) {
                roleInst.principals.create({
                  principalType: People.app.models.RoleMapping.USER,
                  principalId: _self.id,
                }, function(err, principal) {
                  if (err) return cb(err, null);
                  cb(null, principal);
                });
              }
            }
          );
        }
      }
    );
  };

  People.remoteMethod('signup', {
    description: 'signup customers',
    accepts: [
      {arg: 'req', type: 'object', http: {source: 'req'}},
      {arg: 'res', type: 'object', http: {source: 'res'}},
    ],
    returns: {arg: 'success', type: 'object'},
    http: {verb: 'post', path: '/signup'},
  });

  People.beforeRemote('addDeliveryBoy', function(ctx, modelInstance, next) {
    console.log('>triggered before remote add delivery boy');
    People.app.models.Container.imageUpload(ctx.req, ctx.res,
      {container: 'profileImages'}, function(err, success) {
        if (err) return next(err, null);
        if (success.data) {
          success.data = JSON.parse(success.data);
          const user = success.data;
          if (!user.customerId) {
            if (!user.fullName || !user.mobile ||
              !user.email || !user.password || !user.realm) {
              return next(new Error('Incomplete data is provided'));
            } else {
              ctx.req.user = success;
              next();
            }
          }
        } else {
          return next(new Error('data not found'));
        }
      }
    );
  });

  People.addDeliveryBoy = function(req, res, cb) {
    let obj = req.user;
    const kitchenId =  req.accessToken.userId;
    console.log(obj);
    let userdata = {
      fullName: obj.data.fullName,
      mobile: obj.data.mobile,
      email: obj.data.email,
      password: obj.data.password,
      realm: obj.data.realm,
      address: obj.data.address,
      addresses: obj.data.addresses || [],
      image: (obj.files && obj.files.image) ?
      (obj.files && obj.files.image) : '',
      createdAt: new Date(),
      updatedAt: new Date(),
      isOrderAssigned: false,
      kitchenId: kitchenId,
      emailVerified: true,
      mobileVerfied: true,
      adminVerifiedStatus: 'approved',
      regPaid: 'released',
    };
    console.log('data to save : ', userdata);
    if (obj.data.peopleId) {
      People.findById(obj.data.peopleId, function(err, peopleInst) {
        if (err) return cb(err, null);
        if (!peopleInst) return cb(new Error('No user found'), null);
        else {
          peopleInst.updateAttributes(userdata, {validate: true},
            function(error, success) {
              if (error) return cb(error, null);
              else {
                cb(null, {data: success, msg: msg.profileUpdated});
              }
            }
          );
        }
      });
    } else {
      People.create(userdata, function(err, userInst) {
        if (err) {
          return cb(err, null);
        }
        if (userInst) {
          cb(null, {data: userInst, msg: msg.signup});
        }
      });
    }
  };

  People.afterRemote('addDeliveryBoy', function(ctx, instance, next) {
    console.log('> addDeliveryBoy.afterRemote triggered');
    let userInstance = instance.success.data;
    userInstance.addRole(userInstance.realm, function(err, success) {
      if (err) next(new Error(err));
      else {
        if (userInstance.kitchenId) {
          People.findById(userInstance.kitchenId, function(err, peopleInst) {
            if (err) next(new Error(err));
            else {
              peopleInst.noOfDeliveryBoy +=  1;
              peopleInst.save(function(error, success) {
                if (error) next(new Error(error));
                else {
                  next();
                }
              });
            }
          });
        }
      }
    });
  });

  People.afterRemoteError('addDeliveryBoy', function(ctx, next) {
    console.log('error while adding delivery boy!', ctx.error);
    next();
  });

  People.remoteMethod('addDeliveryBoy', {
    description: 'to add a delivery boy',
    accepts: [
      {arg: 'req', type: 'object', http: {source: 'req'}},
      {arg: 'res', type: 'object', http: {source: 'res'}},
    ],
    returns: {arg: 'success', type: 'object'},
    http: {verb: 'post', path: '/add_delivery_boy'},
  });

  People.adminApprove = function(req, peopleId, adminVerifiedStatus, cb) {
    People.findById(peopleId, function(err, peopleInst) {
      if (err) cb(err, null);
      if (!peopleInst) return cb(new Error('No user found'), null);
      else {
        if (peopleInst.adminVerifiedStatus === 'pending') {
          peopleInst.adminVerifiedStatus = adminVerifiedStatus;
          peopleInst.regPaid = 'released';
          peopleInst.save(function(err, success) {
            if (err) return cb(err, null);
            cb(null, {data: success, msg: msg.adminApprove});
          });
        } else {
          const error = new Error(g.f('Profile is already ' +
          peopleInst.adminVerifiedStatus));
          error.statusCode = 400;
          error.code = 'ALREADY_DONE';
          return cb(error);
        }
      }
    });
  };

  People.afterRemoteError('adminApprove', function(ctx, next) {
    console.log('error while setting status!', ctx.error);
    next();
  });

  People.remoteMethod('adminApprove', {
    accepts: [
      {arg: 'req', type: 'object', http: {source: 'req'}},
      {arg: 'peopleId', type: 'string', http: {source: 'form'}},
      {arg: 'adminVerifiedStatus', type: 'string', http: {source: 'form'}},
    ],
    returns: {arg: 'success', type: 'object'},
    http: {verb: 'post', description: 'to set the status of chef'},
  });

  People.getMyInfo = function(req, cb) {
    let peopleId = req.accessToken.userId;
    let filter = {};
    People.findById(peopleId, filter, function(err, success) {
      if (err) return cb(err, null);
      cb(null, {data: success, msg: msg.getMyInfo});
    });
  };

  People.remoteMethod('getMyInfo', {
    accepts: [
      {arg: 'req', type: 'object', http: {source: 'req'}},
    ],
    returns: {arg: 'success', type: 'object'},
    http: {verb: 'get', description: 'to get the profile'},
  });

  People.uploadProfilePic = function(req, res, cb) {
    let peopleId = req.accessToken.userId;
    function uploadFile() {
      People.app.models.Container.imageUpload(req, res,
        {container: 'profileImages'},
       function(err, success) {
         if (err) cb(err, null);
         else updateUser(success);
       });
    }

    function updateUser(passObj) {
      var data = {};
      if (passObj.files) {
        if (passObj.files.image)
          data.image = passObj.files.image[0].url;
      }

      if (!data.image)
        return cb(new Error('No image found'), null);

      People.findById(peopleId, function(error, peopleInst) {
        if (error) return cb(error, null);

        peopleInst.updateAttributes(data, function(err, success) {
          if (err) return cb(err, null);
          cb(null, {data: success, msg: msg.uploadProfilePic});
        });
      });
    }
    uploadFile();
  };

  People.remoteMethod('uploadProfilePic', {
    accepts: [
      {arg: 'req', type: 'object', http: {source: 'req'}},
      {arg: 'res', type: 'object', http: {source: 'res'}},
    ],
    returns: {arg: 'success', type: 'object'},
  });

  People.manageAddress = function(req, addresses, cb) {
    let peopleId = req.accessToken.userId;
    People.findById(peopleId, function(err, peopleInst) {
      if (err) return cb(err, null);
      if (!peopleInst) return cb(new Error('no user found'), null);
      else {
        const data = {
          address: addresses,
          updatedAt: new Date(),
        };
        peopleInst.updateAttributes(data, function(err, success) {
          if (err) return cb(err, null);
          cb(null, {data: success, msg: msg.updateAddress});
        });
      }
    });
  };

  People.remoteMethod('manageAddress', {
    accepts: [
      {arg: 'req', type: 'object', http: {source: 'req'}},
      {arg: 'addresses', type: 'array', required: true, http: {source: 'form'}},
    ],
    returns: {arg: 'success', type: 'object'},
    http: {verb: 'post', path: '/manage_address',
      description: 'to add, delete, update, edit addresses'},
  });

  People.addToLogin = (credentials, include, cb) => {
    return People.login(credentials, include, function(err, token) {
      if (err) return cb(err, null);
      console.log(token);
      People.findById(token.userId, function(findErr, user) {
        if (findErr) return cb(findErr, null);
        let obj = Object.assign({}, token.toObject(), {user: user});
        return cb(null, {data: obj, msg: msg.login});
      });
    });
  };

  People.remoteMethod('addToLogin', {
    description: 'Login users by passing email or mobile no.',
    accepts: [
      {
        arg: 'credentials',
        type: 'object',
        description: 'Login credentials',
        required: true,
        http: {
          source: 'body',
        },
      },
      {
        arg: 'include',
        type: 'string',
        description: `Related objects to include
        in the response. See the description of return value for more details.`,
        http: {
          source: 'query',
        },
      },
    ],
    returns: {
      arg: 'success', type: 'object',
    },
    http: {verb: 'post', path: '/add_to_login'},
  });

  // People.beforeRemote('logOut', function(ctx, modelInstance, next) {
  //   console.log(ctx.args.access_token);
  //   return People.logout(ctx.args.access_token, (err, token) => {
  //     if (err) return next(err);
  //     return next();
  //   });
  // });

  People.logOut = function(accessToken, cb) {
    return People.logout(accessToken, (err, token) => {
      if (err) return cb(err, null);
      return cb(null, {data: {}, msg: msg.logout});
    });
  };

  People.remoteMethod('logOut', {
    description: 'Logout a user with access token.',
    accepts: [
      {arg: 'access_token', type: 'string', http: function(ctx) {
        var req = ctx && ctx.req;
        var accessToken = req && req.accessToken;
        var tokenID = accessToken ? accessToken.id : undefined;
        return tokenID;
      }, description: `Do not supply this argument,
        it is automatically extracted from request headers.`,
      },
    ],
    returns: {arg: 'success', type: 'object'},
    http: {verb: 'all'},
  });

  // People.remoteMethod('logOut', {
  //   description: 'Logout a user with access token.',
  //   accepts: [
  //     {arg: 'req', type: 'object', http: {source: 'req'}},
  //     {arg: 'res', type: 'object', http: {source: 'res'}},
  //   ],
  //   returns: {arg: 'success', type: 'object'},
  //   http: {verb: 'post', path: '/log_out'},
  // });

  People.afterRemote('**', function(ctx, user, next) {
    if (ctx.result) {
      if (Array.isArray(ctx.result)) {
        ctx.result.forEach(function(result) {
          delete result.password;
        });
      } else {
        delete ctx.result.password;
      }
    }
    next();
  });
};
/* function uploadFile() {
      People.app.models.Container.imageUpload(req, res,
        {container: 'profileImages'}, (err, success) => {
          if (err) cb(err, null);
          else {
            if (success.data) {
              success.data = JSON.parse(success.data);
              createUser(success);
            } else {
              cb(new Error('please provide required data'), null);
            }
          }
        });
    }

    function createUser(obj) {
      let data = {
        realm: obj.data.realm,
        fullName: obj.data.fullName,
        mobile: obj.data.mobile,
        email: obj.data.email,
        password: obj.data.password,
        isProfileComplete: true,
      };
      if (obj.data.realm === 'customer') {
      }
      if (obj.data.realm === 'kitchen') {

      }
      if (obj.data.realm === 'vehicle') {

      } */
