'use strict';
const msg = require('../messages/people-message.json');
const gf = require('../services/global_functions.js');
const config = require('../../server/config.json');
const path = require('path');
var g = require('../../node_modules/loopback/lib/globalize');
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
  // People.validatesFormatOf('email', {with: re, message: 'Email is invalid'});
  // People.validatesUniquenessOf('mobile', {message: 'Mobile already exists'});
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
    let query = {where: {or: []}};
    if (obj.data.email) {
      query.where.or.push({email: obj.data.email});
    }
    if (obj.data.mobile) {
      query.where.or.push({mobile: obj.data.mobile});
    }
    People.find(query, function(err, userInst) {
      if (err) cb(err, null);
      else {
        if (userInst) {
          if (userInst.length == 0) {
            let userdata = {
              fullName: obj.data.fullName,
              mobile: obj.data.mobile,
              email: obj.data.email,
              password: obj.data.password,
              realm: obj.data.realm,
              address: obj.data.address,
              addresses: obj.data.addresses || [],
              image: (obj.files && obj.files.image) ?
              (obj.files && obj.files.image[0].url) : '',
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
          }
          if (userInst.length == 2) {
            let err1 = new Error(g.f('Email and Mobile already exists'));
            err1.statusCode = 422;
            err1.code = 'EMAIL_MOBILE_ALREADY_EXIST';
            cb(err1, null);
          }
          if (userInst.length == 1) {
            if (userInst[0].email == obj.data.email &&
              (userInst[0].mobile == obj.data.mobile)) {
              let err1 = new Error(g.f('Email and Mobile already exists'));
              err1.statusCode = 422;
              err1.code = 'EMAIL_MOBILE_ALREADY_EXIST';
              cb(err1, null);
            } else {
              if (userInst[0].email == obj.data.email) {
                let err1 = new Error(g.f('Mobile already exists'));
                err1.statusCode = 422;
                err1.code = 'EMAIL_ALREADY_EXIST';
                cb(err1, null);
              }
              if (userInst[0].mobile == obj.data.mobile) {
                let err1 = new Error(g.f('Mobile already exists'));
                err1.statusCode = 422;
                err1.code = 'MOBILE_ALREADY_EXIST';
                cb(err1, null);
              }
            }
          }
        }
      }
    });
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
    if (ctx.req.accessToken && ctx.req.accessToken.userId) {
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
    } else {
      let err = new Error(g.f('invalid token'));
      err.statusCode =  400;
      err.code = 'INVALID_TOKEN';
      next(err, null);
    }
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
      mobileVerified: true,
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
    if (req.accessToken && req.accessToken.userId) {
      let peopleId = req.accessToken.userId;
      let filter = {};
      People.findById(peopleId, filter, function(err, success) {
        if (err) return cb(err, null);
        cb(null, {data: success, msg: msg.getMyInfo});
      });
    } else {
      let err = new Error(g.f('invalid token'));
      err.statusCode =  400;
      err.code = 'INVALID_TOKEN';
      cb(err, null);
    }
  };

  People.remoteMethod('getMyInfo', {
    accepts: [
      {arg: 'req', type: 'object', http: {source: 'req'}},
    ],
    returns: {arg: 'success', type: 'object'},
    http: {verb: 'get', description: 'to get the profile'},
  });

  People.beforeRemote('uploadProfilePic', function(ctx, modelInstance, next) {
    if (ctx.req.accessToken && ctx.req.accessToken.userId) {
      next();
    } else {
      let err = new Error(g.f('invalid token'));
      err.statusCode =  400;
      err.code = 'INVALID_TOKEN';
      next(err, null);
    }
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

  People.beforeRemote('manageAddress', function(ctx, modelInstance, next) {
    if (ctx.req.accessToken && ctx.req.accessToken.userId) {
      next();
    } else {
      let err = new Error(g.f('invalid token'));
      err.statusCode =  400;
      err.code = 'INVALID_TOKEN';
      next(err, null);
    }
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

  People.uniqueEmail = function(email, cb) {
    People.find({email: email}, function(err, userInst) {
      if (err) cb(err, null);
      else {
        if (userInst) {
          cb(null, {data: {exists: true}, msg: msg.uniqueEmail});
        } else {
          cb(null, {data: {exists: false}, msg: msg.uniqueEmail});
        }
      }
    });
  };

  People.remoteMethod('uniqueEmail', {
    description: 'to check if email is unique',
    accepts: [
      {arg: 'email', type: 'string', required: true},
    ],
    returns: {arg: 'success', type: 'object'},
    http: {path: '/unique_email', verb: 'get'},
  });

  People.uniqueMobile = function(mobile, cb) {
    People.find({mobile: mobile}, function(err, userInst) {
      if (err) cb(err, null);
      else {
        if (userInst) {
          cb(null, {data: {exists: true}, msg: msg.uniqueEmail});
        } else {
          cb(null, {data: {exists: false}, msg: msg.uniqueEmail});
        }
      }
    });
  };

  People.remoteMethod('uniqueMobile', {
    description: 'to check if mobile is unique',
    accepts: [
      {arg: 'mobile', type: 'string', required: true},
    ],
    returns: {arg: 'success', type: 'object'},
    http: {path: '/unique_mobile', verb: 'get'},
  });

  People.beforeRemote('editCustomer', function(ctx, modelInstance, next) {
    console.log(ctx.args);
    if (ctx.req.accessToken && ctx.req.accessToken.userId) {
      let query = {where: {or: []}};
      if (ctx.args.email) {
        query.where.or.push({email: ctx.args.email});
      }
      if (ctx.args.mobile) {
        query.where.or.push({mobile: ctx.args.mobile});
      }
      People.find(query, function(err, userInst) {
        if (err) next(new Error(err), null);
        else {
          if (userInst) {
            if (userInst.length == 0) {
              next();
            }
            if (userInst.length == 2) {
              let err1 = new Error(g.f('Email and Mobile already exists'));
              err1.statusCode = 422;
              err1.code = 'EMAIL_MOBILE_ALREADY_EXIST';
              next(err1, null);
            }
            if (userInst.length == 1) {
              if (userInst[0].email == ctx.args.email &&
                (userInst[0].mobile == ctx.args.mobile)) {
                let err1 = new Error(g.f('Email and Mobile already exists'));
                err1.statusCode = 422;
                err1.code = 'EMAIL_MOBILE_ALREADY_EXIST';
                next(err1, null);
              } else {
                if (userInst[0].email == ctx.args.email) {
                  let err1 = new Error(g.f('Email already exists'));
                  err1.statusCode = 422;
                  err1.code = 'EMAIL_ALREADY_EXIST';
                  next(err1, null);
                }
                if (userInst[0].mobile == ctx.args.mobile) {
                  let err1 = new Error(g.f('Mobile already exists'));
                  err1.statusCode = 422;
                  err1.code = 'MOBILE_ALREADY_EXIST';
                  next(err1, null);
                }
              }
            }
          }
        }
      });
    } else {
      let err = new Error(g.f('invalid token'));
      err.statusCode =  400;
      err.code = 'INVALID_TOKEN';
      next(err, null);
    }
  });

  People.editCustomer = function(req, fullName, mobile, email, cb) {
    const peopleId = req.accessToken.userId;
    let data = {};
    if (fullName) {
      data.fullName = fullName.trim();
    }
    if (mobile) {
      data.mobile = mobile.trim();
    }
    if (email) {
      data.email = email.trim();
    }
    People.findById(peopleId, function(err, peopleInst) {
      if (err) cb(err, null);
      else {
        if (peopleInst) {
          peopleInst.updateAttributes(data, function(error, success) {
            if (error) cb(error, null);
            if (success) {
              cb(null, {data: success, msg: msg.customerEdit});
            }
          });
        } else {
          let err1 = new Error(g.f('Account does not exist'));
          err1.statusCode = 400;
          err1.code = 'ACCOUNT_DOES_NOT_EXIST';
          cb(err1, null);
        }
      }
    });
  };

  People.afterRemote('editCustomer', function(ctx, user, next) {
    console.log('after edit customer remote');
    console.log(user.success.data);
    next();
  });

  People.remoteMethod('editCustomer', {
    description: 'edit customer',
    accepts: [
      {arg: 'req', type: 'object', http: {source: 'req'}},
      {arg: 'fullName', type: 'string', http: {source: 'form'}},
      {arg: 'mobile', type: 'string', http: {source: 'form'}},
      {arg: 'email', type: 'string', http: {source: 'form'}},
    ],
    returns: {
      arg: 'success', type: 'object',
    },
    http: {verb: 'post', path: '/edit_customer'},
  });

  People.verifyotp = function(peopleId, otp, cb) {
    People.findById(peopleId, function(err, peopleInst) {
      if (err) cb(err, null);
      if (peopleInst) {
        const dtn = new Date();
        if (peopleInst.mobOtp.otp == otp) {
          if (peopleInst.mobOtp.expiredAt > dtn) {
            let err1 = new Error(g.f('Otp got expired'));
            err1.statusCode = 400;
            err1.code = 'OTP_EXPIRED';
            cb(err1, null);
          } else {
            peopleInst.mobileVerified = true;
            peopleInst.mobOtp = {};
            peopleInst.save(function(error, success) {
              if (error) cb(error, null);
              if (success) {
                cb(null, {data: success, msg: msg.mobileVerified});
              }
            });
          }
        } else {
          let err1 = new Error(g.f('Otp does not match'));
          err1.statusCode = 400;
          err1.code = 'OTP_DOES_NOT_MATCH';
          cb(err1, null);
        }
      } else {
        let err1 = new Error(g.f('Account does not exist'));
        err1.statusCode = 400;
        err1.code = 'ACCOUNT_DOES_NOT_EXIST';
        cb(err1, null);
      }
    });
  };

  People.remoteMethod('verifyotp', {
    description: 'To verify mobile number',
    accepts: [
      {arg: 'peopleId', type: 'string', required: true, http: {source: 'form'}},
      {arg: 'otp', type: 'number', required: true, http: {source: 'form'}},
    ],
    returns: {arg: 'success', type: 'object'},
    http: {verb: 'post', path: '/verfiy_otp'},
  });

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
