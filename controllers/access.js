const AccessControl = require('accesscontrol');
const HttpStatus = require('http-status-codes');
const fs = require('fs');

const User = require('../models/user');
const { filterResourceData, constructPermissionObject } = require('../helpers/controllerHelpers');
let { resources } = require('../configuration');
let fieldAccess = require('../configuration/fieldAccess');

const accessControlFileName = 'accessControl.json';
const userTypesFileName = 'userTypes.json';
const adminTypesFileName = 'adminTypes.json';
let accessControl;
let userTypes;
let adminTypes;


const grantDefaultAdminAccess = () => {
    Object.keys(resources)
        .forEach(resourceType => {
            accessControl.grant(adminTypes.superAdmin)
                .readAny(resources[resourceType], fieldAccess[resources[resourceType]][adminTypes.superAdmin]['canRead'])
                .createAny(resources[resourceType], fieldAccess[resources[resourceType]][adminTypes.superAdmin]['canCreate'])
                .deleteAny(resources[resourceType], fieldAccess[resources[resourceType]][adminTypes.superAdmin]['canDelete'])
                .updateAny(resources[resourceType], fieldAccess[resources[resourceType]][adminTypes.superAdmin]['canUpdate']);
        });

    Object.keys(resources)
        .forEach(resourceType => {
            Object.keys(adminTypes)
                .forEach(adminType => {
                    if (adminTypes[adminType] !== adminTypes.superAdmin) {
                        accessControl.grant(adminTypes[adminType])
                            .readOwn(resources[resourceType], fieldAccess[resources[resourceType]][adminType]['canRead'])
                            .createOwn(resources[resourceType], fieldAccess[resources[resourceType]][adminType]['canCreate'])
                            .deleteOwn(resources[resourceType], fieldAccess[resources[resourceType]][adminType]['canDelete'])
                            .updateOwn(resources[resourceType], fieldAccess[resources[resourceType]][adminType]['canUpdate']);
                    }
                });
        });
};

const grantDefaultAccess = () => {
    let resourceType = resources.user;

    Object.keys(userTypes)
        .forEach(userType => {
            accessControl.grant(userTypes[userType])
                .readOwn(resourceType, fieldAccess[resourceType][userType]['canRead'])
                .createOwn(resourceType, fieldAccess[resourceType][userType]['canCreate'])
                .updateOwn(resourceType, fieldAccess[resourceType][userType]['canUpdate']);
        });

    resourceType = resources.news;
    Object.keys(userTypes)
        .forEach(userType => {
            accessControl.grant(userType)
                .readAny(resourceType, fieldAccess[resourceType][userType]['canRead']);
        });

    resourceType = resources.userInfo;
    Object.keys(userTypes)
        .forEach(userType => {
            accessControl.grant(userType)
                .readOwn(resourceType, fieldAccess[resourceType][userType]['canRead']);
        });

    resourceType = resources.parameter;
    Object.keys(userTypes)
        .forEach(userType => {
            accessControl.grant(userType)
                .readAny(resourceType, fieldAccess[resourceType][userType]['canRead']);
        });

    resourceType = resources.collectionType;
    Object.keys(userTypes)
        .forEach(userType => {
            accessControl.grant(userType)
                .readAny(resourceType, fieldAccess[resourceType][userType]['canRead']);
        });

    resourceType = resources.service;
    Object.keys(userTypes)
        .forEach(userType => {
            accessControl.grant(userType)
                .readAny(resourceType, fieldAccess[resourceType][userType]['canRead']);
        });

    resourceType = resources.order;
    Object.keys(userTypes)
        .forEach(userType => {
            accessControl.grant(userType)
                .readOwn(resourceType, fieldAccess[resourceType][userType]['canRead'])
                .createOwn(resourceType, fieldAccess[resourceType][userType]['canCreate'])
                .updateOwn(resourceType, fieldAccess[resourceType][userType]['canUpdate'])
                .deleteOwn(resourceType);
        });

    resourceType = resources.cart;
    Object.keys(userTypes)
        .forEach(userType => {
            accessControl.grant(userType)
                .readOwn(resourceType, fieldAccess[resourceType][userType]['canRead'])
                .createOwn(resourceType, fieldAccess[resourceType][userType]['canCreate'])
                .updateOwn(resourceType, fieldAccess[resourceType][userType]['canUpdate']);
        });

    resourceType = resources.collector;
    Object.keys(userTypes)
        .forEach(userType => {
            accessControl.grant(userType)
                .readOwn(resourceType, fieldAccess[resourceType][userType]['canRead'])
                .createOwn(resourceType, fieldAccess[resourceType][userType]['canCreate']);
        });

    resourceType = resources.delivery;
    Object.keys(userTypes)
        .forEach(userType => {
            accessControl.grant(userType)
                .readOwn(resourceType, fieldAccess[resourceType][userType]['canRead'])
                .createOwn(resourceType, fieldAccess[resourceType][userType]['canCreate'])
                .updateOwn(resourceType, fieldAccess[resourceType][userType]['canUpdate']);
        });

    resourceType = resources.courierInfo;
    Object.keys(userTypes)
        .forEach(userType => {
            accessControl.grant(userType)
                .readOwn(resourceType, fieldAccess[resourceType][userType]['canRead'])
                .createOwn(resourceType, fieldAccess[resourceType][userType]['canCreate'])
                .updateOwn(resourceType, fieldAccess[resourceType][userType]['canUpdate'])
                .deleteOwn(resourceType);
        });

    resourceType = resources.notification;
    Object.keys(userTypes)
        .forEach(userType => {
            accessControl.grant(userType)
                .readOwn(resourceType, fieldAccess[resourceType][userType]['canRead'])
                .deleteOwn(resourceType);
        });
};

const saveAccessRoleInFile = () => {
    const grantObject = JSON.stringify(accessControl.getGrants());

    fs.writeFile(__dirname + '/' + accessControlFileName, grantObject, function (err) {
        if (err) {
            console.log('An error occured while writing JSON Object to File.\n' + err);
        }
        console.log('JSON file has been saved.');
    });
};

const loadAccessControl = () => {
    if (fs.existsSync(__dirname + '/' + accessControlFileName)) {
        const accessControlData = require(__dirname + '/' + accessControlFileName);
        accessControl = new AccessControl(accessControlData);
    } else {
        accessControl = new AccessControl();
        grantDefaultAccess();
        grantDefaultAdminAccess();
        saveAccessRoleInFile();
    }
};

const saveUserTypesInFile = () => {
    const userTypesData = JSON.stringify(userTypes);

    fs.writeFile(__dirname + '/' + userTypesFileName, userTypesData, function (err) {
        if (err) {
            console.log('An error occured while writing JSON Object to File.\n' + err);
        }
        console.log('JSON file has been saved.');
    });
};

const loadUserTypes = () => {
    if (fs.existsSync(__dirname + '/' + userTypesFileName)) {
        userTypes = require(__dirname + '/' + userTypesFileName);
    } else {
        userTypes = require('../configuration').userTypes;
        saveUserTypesInFile();
    }
};

const saveAdminTypesInFile = () => {
    const adminTypesData = JSON.stringify(adminTypes);

    fs.writeFile(__dirname + '/' + adminTypesFileName, adminTypesData, function (err) {
        if (err) {
            console.log('An error occured while writing JSON Object to File.\n' + err);
        }
        console.log('JSON file has been saved.');
    });
};

const loadAdminTypes = () => {
    if (fs.existsSync(__dirname + '/' + adminTypesFileName)) {
        adminTypes = require(__dirname + '/' + adminTypesFileName);
    } else {
        adminTypes = require('../configuration').adminTypes;
        saveAdminTypesInFile();
    }
};

loadUserTypes();
loadAdminTypes();
loadAccessControl();

module.exports = {
    accessControl,

    /*not working*/
    getAllAccessLevel: async (req, res, next) => {
        const { user } = req;

        if (accessControl.can(user.userType)
            .readAny(resources.accessLevel)) {
            const result = accessControl.getGrants();
            const permissionObject = {};

            Object.keys(userTypes)
                .forEach(user => {
                    permissionObject[user] = constructPermissionObject(result, user);
                });

            Object.keys(adminTypes)
                .forEach(admin => {
                    permissionObject[admin] = constructPermissionObject(result, admin);
                });

            res.status(HttpStatus.OK)
                .json({ permissions: permissionObject });
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    getAccessLevel: async (req, res, next) => {
        const { user } = req;
        const { role } = req.params;
        if (accessControl.can(user.userType)
            .readAny(resources.accessLevel) && role !== adminTypes.superAdmin) {
            const result = accessControl.getGrants();
            const permissionObject = constructPermissionObject(result, role);

            res.status(HttpStatus.OK)
                .json({ permissions: permissionObject });
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    addAccessLevel: async (req, res, next) => {
        const { user } = req;
        const { role } = req.params;

        if (accessControl.can(user.userType)
            .createAny(resources.accessLevel) && role !== adminTypes.superAdmin) {
            const { roleType, permissions } = req.body;
            if (roleType === 'admin') {
                if (adminTypes[role] !== undefined) {
                    accessControl.deny(role);

                    Object.keys(permissions)
                        .forEach(resource => {

                            Object.keys(permissions[resource])
                                .forEach(permission => {

                                    if (permissions[resource][permission]) {

                                        let attributes;
                                        let type = adminTypes.superAdmin;

                                        switch (permission) {
                                            case 'read':
                                                attributes = fieldAccess[resource][type]['canRead'];
                                                if (attributes === undefined || attributes.length === 0) {
                                                    attributes = ['*'];
                                                }

                                                if (permissions[resource][permission] === 'own') {
                                                    accessControl.grant(role)
                                                        .readOwn(resource, attributes);
                                                } else if (permissions[resource][permission] === 'any') {
                                                    accessControl.grant(role)
                                                        .readAny(resource, attributes);
                                                }

                                                break;
                                            case 'create':
                                                attributes = fieldAccess[resource][type]['canCreate'];
                                                if (attributes === undefined || attributes.length === 0) {
                                                    attributes = ['*'];
                                                }
                                                if (permissions[resource][permission] === 'own') {
                                                    accessControl.grant(role)
                                                        .createOwn(resource, attributes);
                                                } else if (permissions[resource][permission] === 'any') {
                                                    accessControl.grant(role)
                                                        .createAny(resource, attributes);
                                                }
                                                break;
                                            case 'update':
                                                attributes = fieldAccess[resource][type]['canUpdate'];
                                                if (attributes === undefined || attributes.length === 0) {
                                                    attributes = ['*'];
                                                }
                                                if (permissions[resource][permission] === 'own') {
                                                    accessControl.grant(role)
                                                        .updateOwn(resource, attributes);
                                                } else if (permissions[resource][permission] === 'any') {
                                                    accessControl.grant(role)
                                                        .updateAny(resource, attributes);
                                                }
                                                break;
                                            case 'delete':
                                                attributes = fieldAccess[resource][type]['canDelete'];
                                                if (attributes === undefined || attributes.length === 0) {
                                                    attributes = ['*'];
                                                }
                                                if (permissions[resource][permission] === 'own') {
                                                    accessControl.grant(role)
                                                        .deleteOwn(resource, attributes);
                                                } else if (permissions[resource][permission] === 'any') {
                                                    accessControl.grant(role)
                                                        .deleteAny(resource, attributes);
                                                }
                                                break;
                                        }
                                    }
                                });
                        });
                } else {
                    return res.sendStatus(HttpStatus.NOT_FOUND);
                }
                saveAccessRoleInFile();
            } else if (roleType === 'user') {

                if (userTypes[role] !== undefined) {
                    accessControl.removeRoles(role);
                    accessControl.grant(role);

                    Object.keys(permissions)
                        .forEach(resource => {

                            Object.keys(permissions[resource])
                                .forEach(permission => {

                                    if (permissions[resource][permission]) {
                                        let attributes;
                                        let type = userTypes.student;

                                        switch (permission) {
                                            case 'read':
                                                attributes = fieldAccess[resource][type]['canRead'];
                                                if (attributes === undefined || attributes.length === 0) {
                                                    attributes = ['*'];
                                                }

                                                if (permissions[resource][permission] === 'own') {
                                                    accessControl.grant(role)
                                                        .readOwn(resource, attributes);
                                                } else if (permissions[resource][permission] === 'any') {
                                                    accessControl.grant(role)
                                                        .readAny(resource, attributes);
                                                }

                                                break;
                                            case 'create':
                                                attributes = fieldAccess[resource][type]['canCreate'];
                                                if (attributes === undefined || attributes.length === 0) {
                                                    attributes = ['*'];
                                                }
                                                if (permissions[resource][permission] === 'own') {
                                                    accessControl.grant(role)
                                                        .createOwn(resource, attributes);
                                                } else if (permissions[resource][permission] === 'any') {
                                                    accessControl.grant(role)
                                                        .createAny(resource, attributes);
                                                }
                                                break;
                                            case 'update':
                                                attributes = fieldAccess[resource][type]['canUpdate'];
                                                if (attributes === undefined || attributes.length === 0) {
                                                    attributes = ['*'];
                                                }
                                                if (permissions[resource][permission] === 'own') {
                                                    accessControl.grant(role)
                                                        .updateOwn(resource, attributes);
                                                } else if (permissions[resource][permission] === 'any') {
                                                    accessControl.grant(role)
                                                        .updateAny(resource, attributes);
                                                }
                                                break;
                                            case 'delete':
                                                attributes = fieldAccess[resource][type]['canDelete'];
                                                if (attributes === undefined || attributes.length === 0) {
                                                    attributes = ['*'];
                                                }
                                                if (permissions[resource][permission] === 'own') {
                                                    accessControl.grant(role)
                                                        .deleteOwn(resource, attributes);
                                                } else if (permissions[resource][permission] === 'any') {
                                                    accessControl.grant(role)
                                                        .deleteAny(resource, attributes);
                                                }
                                                break;
                                        }

                                    }
                                });
                        });
                } else {
                    return res.sendStatus(HttpStatus.NOT_FOUND);
                }
                saveAccessRoleInFile();
            } else {
                return res.sendStatus(HttpStatus.NOT_FOUND);
            }
            res.sendStatus(HttpStatus.OK);
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    getRoles: async (req, res, next) => {
        const { user } = req;

        if (accessControl.can(user.userType)
            .readAny(resources.role)) {
            const users = Object.keys(userTypes);
            const admins = Object.keys(adminTypes);
            const index = admins.indexOf(adminTypes.superAdmin);

            if (index >= 0) {
                admins.splice(index, 1);
            }

            res.status(HttpStatus.OK)
                .json({
                    userTypes: users,
                    adminTypes: admins,
                });
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    addRole: async (req, res, next) => {
        const { user } = req;

        if (accessControl.can(user.userType)
            .createAny(resources.role)) {
            const { role, roleType } = req.body;

            if (roleType === 'admin') {
                if (adminTypes[role] === undefined) {
                    adminTypes[role] = role;
                    accessControl.grant(role);
                    saveAccessRoleInFile();
                    saveAdminTypesInFile();
                    res.sendStatus(HttpStatus.OK);
                } else {
                    res.sendStatus(HttpStatus.BAD_REQUEST);
                }
            } else {
                if (userTypes[role] === undefined) {
                    userTypes[role] = role;
                    accessControl.grant(role);
                    saveAccessRoleInFile();
                    saveUserTypesInFile();
                    res.sendStatus(HttpStatus.OK);
                } else {
                    res.sendStatus(HttpStatus.BAD_REQUEST);
                }
            }

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    deleteRoles: async (req, res, next) => {
        const { user } = req;

        if (accessControl.can(user.userType)
            .deleteAny(resources.role)) {

            const { role, roleType } = req.body;

            if (roleType === 'admin') {
                adminTypes[role] = undefined;
                accessControl.removeRoles(role);

                saveAccessRoleInFile();
                saveAdminTypesInFile();
            } else {
                userTypes[role] = undefined;
                accessControl.removeRoles(role);

                saveAccessRoleInFile();
                saveUserTypesInFile();
            }

            res.sendStatus(HttpStatus.OK);
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

};

