const HttpStatus = require('http-status-codes');
const fs = require('fs');
const path = './configuration/mailTemplates.json';

module.exports = {

    getAllEmailTemplates: async (req, res, next) => {
        const { user } = req;

        if (user.userType.toLowerCase() === 'superadmin') {
            fs.readFile(path, (err, data) => {
                if (err) {
                    console.log(err)
                    res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
                }
                else {
                    data = JSON.parse(data);
                    res.status(HttpStatus.OK)
                        .json({ template: data });
                }
            });
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    editEmailTemplate: async (req, res, next) => {
        const { user } = req;
        const { templateKey } = req.params;
        const newTemplate = req.value.body;

        if (user.userType.toLowerCase() === 'superadmin') {

            let fileData = fs.readFileSync(path);
            fileData = JSON.parse(fileData);
            
            if (fileData.hasOwnProperty(templateKey)) {

                newTemplate['templateId'] = fileData[templateKey].templateId;
                newTemplate['templateName'] = fileData[templateKey].templateName;
                fileData[templateKey] = newTemplate;

                fs.writeFileSync(path, JSON.stringify(fileData));
                res.status(HttpStatus.OK).json({});
            } else {
                res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
            }

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    }
}