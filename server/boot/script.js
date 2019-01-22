'use strict';
module.exports = (app) => {
  let People = app.models.People;
  let Role = app.models.Role;
  let RoleMapping = app.models.RoleMapping;

  RoleMapping.belongsTo(People);
  People.hasMany(RoleMapping, {foreignKey: 'principalId'});
  Role.hasMany(People, {through: RoleMapping, foreignKey: 'roleId'});
  createRoles();
  function createRoles() {
    Role.count()
      .then((count) => {
        if (count == 0) {
          Role.create([
            {name: 'admin'},
            {name: 'customer'},
            {name: 'kitchen'},
            {name: 'deliveryboy'},
          ], function(err, roles) {
            if (err) throw Error(err);
            createAdmin();
          });
        } else if (count > 0) {
          createAdmin();
        }
      }, (error) => {
        throw Error(error);
      });
  }

  function createAdmin() {
    People.count({realm: 'admin'}, function(err, count) {
      if (err) {
        throw Error(err);
      } else {
        if (count == 0) {
          People.create({
            fullName: 'Dolly Garg',
            mobile: '2323232323',
            realm: 'admin',
            isProfilecomplete: true,
            address: 'zed technosolutions jaipur',
            email: 'dollygarg.zed@gmail.com',
            emailverified: true,
            mobileVerified: true,
            password: '123456789',
            workingHours: [],
            adminVerifiedStatus: 'approved',
            regPaid: 'released',
            createdAt: new Date(),
            updatedAt: new Date(),
          }, function(err, peopleInst) {
            if (err) throw Error(err);
            Role.findOne({where: {name: 'admin'}}, function(err, role) {
              if (err) throw Error(err);
              console.log(role);
              role.principals.create({
                principalType: RoleMapping.USER,
                principalId: peopleInst.id,
              }, function(err, principal) {
                if (err) throw Error(err);
                console.log('pricipal: ', principal);
              });
            });
          });
        }
      }
    });
  }
};

