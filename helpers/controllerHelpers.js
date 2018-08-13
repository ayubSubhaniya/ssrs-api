const filterResourceData = (resourcesData, attributes) => {

    if (resourcesData instanceof Array) {
        let filteredResourcesData = [];

        for (let i = 0; i < resourcesData.length; i++) {
            const resourceData = resourcesData[i];
            let filteredData = {};

            attributes.forEach(attribute => {
                filteredData[attribute] = resourceData[attribute];
            });
            filteredResourcesData.push(filteredData);
        }

        return filteredResourcesData;
    } else {
        let filteredResourceData = {};

        attributes.forEach(attribute => {
            filteredResourceData[attribute] = resourcesData[attribute];
        });

        return filteredResourceData;
    }
};

const getDeniedAttributes = (attribute) => {

    let deniedAttribute = [];
    for (let i = 0; i < attribute.length; i++) {
        if (attribute[i].startsWith('!')) {
            deniedAttribute.push(attribute[i].substring(1));
        }
    }
    return deniedAttribute;
};

module.exports = {
    filterResourceData,
};
