const AccessControl = require('accesscontrol');
const HttpStatus = require('http-status-codes');
const fs = require('fs');

const User = require('../models/user');
const {filterResourceData} = require('../helpers/controllerHelpers');
let { resources, userTypes, adminTypes} = require('../configuration');
let fieldAccess = require('../configuration/fieldAccess');

const accessControlFileName = 'accessControl.json'
let accessControl;


const grantDefaultAdminAccess = () => {
    Object.keys(resources).forEach(resourceType => {
        accessControl.grant(adminTypes.superAdmin)
            .readAny(resources[resourceType], fieldAccess[resources[resourceType]][adminTypes.superAdmin]['canRead'])
            .createAny(resources[resourceType], fieldAccess[resources[resourceType]][adminTypes.superAdmin]['canCreate'])
            .deleteAny(resources[resourceType], fieldAccess[resources[resourceType]][adminTypes.superAdmin]['canDelete'])
            .updateAny(resources[resourceType], fieldAccess[resources[resourceType]][adminTypes.superAdmin]['canUpdate']);
    });

    Object.keys(resources).forEach(resourceType => {
        Object.keys(adminTypes).forEach(adminType => {
            if (adminTypes[adminType] != adminTypes.superAdmin) {
                accessControl.grant(adminTypes[adminType])
                    .readOwn(resources[resourceType], fieldAccess[resources[resourceType]][adminType]['canRead'])
                    .createOwn(resources[resourceType], fieldAccess[resources[resourceType]][adminType]['canCreate'])
                    .deleteOwn(resources[resourceType], fieldAccess[resources[resourceType]][adminType]['canDelete'])
                    .updateOwn(resources[resourceType], fieldAccess[resources[resourceType]][adminType]['canUpdate']);
            }
        })
    });
};

const grantDefaultAccess = () => {
    let resourceType = resources.user;

    Object.keys(userTypes).forEach(userType => {
        accessControl.grant(userTypes[userType])
            .readOwn(resourceType, fieldAccess[resourceType][userType]['canRead'])
            .createOwn(resourceType, fieldAccess[resourceType][userType]['canCreate'])
            .updateOwn(resourceType, fieldAccess[resourceType][userType]['canUpdate']);
    });

    resourceType = resources.news;
    Object.keys(userTypes).forEach(userType => {
        accessControl.grant(userType)
            .readAny(resourceType, fieldAccess[resourceType][userType]['canRead'])
    });

    resourceType = resources.parameter;
    Object.keys(userTypes).forEach(userType => {
        accessControl.grant(userType)
            .readAny(resourceType, fieldAccess[resourceType][userType]['canRead'])
    });

    resourceType = resources.service;
    Object.keys(userTypes).forEach(userType => {
        accessControl.grant(userType)
            .readAny(resourceType, fieldAccess[resourceType][userType]['canRead'])
    });

    resourceType = resources.order;
    Object.keys(userTypes).forEach(userType => {
        accessControl.grant(userType)
            .readOwn(resourceType, fieldAccess[resourceType][userType]['canRead'])
            .createOwn(resourceType, fieldAccess[resourceType][userType]['canCreate'])
            .updateOwn(resourceType, fieldAccess[resourceType][userType]['canUpdate']);
    });

    resourceType = resources.collector;
    Object.keys(userTypes).forEach(userType => {
        accessControl.grant(userType)
            .readOwn(resourceType, fieldAccess[resourceType][userType]['canRead'])
            .createOwn(resourceType, fieldAccess[resourceType][userType]['canCreate'])
    });

    resourceType = resources.courier;
    Object.keys(userTypes).forEach(userType => {
        accessControl.grant(userType)
            .readOwn(resourceType, fieldAccess[resourceType][userType]['canRead'])
            .createOwn(resourceType, fieldAccess[resourceType][userType]['canCreate'])
    });

    resourceType = resources.notification;
    Object.keys(userTypes).forEach(userType => {
        accessControl.grant(userType)
            .readOwn(resourceType, fieldAccess[resourceType][userType]['canRead'])
            .deleteOwn(resourceType)
    });
};

const saveAccessRoleInFile = () => {
    const grantObject = JSON.stringify(accessControl.getGrants());

    fs.writeFile(__dirname + "/" + accessControlFileName, grantObject, function (err) {
        if (err) {
            console.log("An error occured while writing JSON Object to File.\n" + err);
        }
        console.log("Access control JSON file has been saved.");
    });
}

const loadAccessControl = () => {
    if (fs.existsSync(__dirname + "/" + accessControlFileName)) {
        const accessControlData = require(__dirname + "/" + accessControlFileName);
        accessControl = new AccessControl(accessControlData);
    } else {
        accessControl = new AccessControl();
        grantDefaultAccess();
        grantDefaultAdminAccess();
        saveAccessRoleInFile();
    }
}

loadAccessControl();

module.exports = {
    accessControl,

    getAccessLevel: async (req, res, next) => {
        const {user} = req;

        if (accessControl.can(user.userType).readAny(resources.accessLevel)) {
            const result = accessControl.getGrants()
            res.status(HttpStatus.ACCEPTED).json(result)
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    addAccessLevel: async (req, res, next) => {
        const {user} = req;

        if (accessControl.can(user.userType).createAny(resources.accessLevel)) {
            const { userType, resource, permissionsGranted, permissionsDenied } = req.body

            if (permissionsGranted) {
                if (permissionsGranted instanceof Array) {
                    permissionsGranted.forEach(permission => {
                        const { action, possession, attributes } = permission

                        if (!possession) {
                            possession = 'own'
                        }

                        if (!attributes) {
                            attributes = ['*']
                        }

                        accessControl.grant({
                            role: userType,
                            resource: resource,
                            action,
                            possession,
                            attributes
                        });
                    });
                } else {
                    const { action, possession, attributes } = permissionsGranted
                    accessControl.grant({
                        role: userType,
                        resource: resource,
                        action,
                        possession,
                        attributes
                    });
                }
            }

            if (permissionsDenied) {
                if (permissionsDenied instanceof Array) {
                    permissionsDenied.forEach(permission => {
                        const { action, possession, attributes } = permission

                        if (!possession) {
                            possession = 'own'
                        }

                        if (!attribute) {
                            attributes = ['*']
                        }

                        accessControl.deny({
                            role: userType,
                            resource: resource,
                            action,
                            possession,
                            attributes
                        });
                    });
                } else {
                    const { action, possession, attributes } = permissionsGranted

                    accessControl.deny({
                        role: userType,
                        resource: resource,
                        action,
                        possession,
                        attriattributesbute
                    });
                }
            }
            saveAccessRoleInFile();
            res.sendStatus(HttpStatus.ACCEPTED);
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    getRoles: async (req, res, next) => {
        const {user} = req;

        if (accessControl.can(user.userType).readAny(resources.role)) {
            res.status(HttpStatus.ACCEPTED).json({ userTypes, adminTypes })
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    addRoles: async (req, res, next) => {
        const {user} = req;

        if (accessControl.can(user.userType).createAny(resources.role)) {
            const newRoles = req.body
            Object.keys(newRoles).forEach(role => {
                userTypes[role] = newRoles[role]
                accessControl.grant(newRoles[role])
            });
            saveAccessRoleInFile();
            res.sendStatus(HttpStatus.ACCEPTED);
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    deleteRoles: async (req, res, next) => {
        const {user} = req;

        if (accessControl.can(user.userType).deleteAny(resources.role)) {
            const rolesToRemove = req.body
            Object.keys(rolesToRemove).forEach(role => {
                delete userTypes[role]
                accessControl.removeRoles([rolesToRemove[role]])
            });
            saveAccessRoleInFile();
            res.sendStatus(HttpStatus.ACCEPTED);
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

};

