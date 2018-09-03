const filterResourceData = (resourcesData, attributes) => {

    if (resourcesData instanceof Array) {
        let filteredResourcesData = [];

        for (let i = 0; i < resourcesData.length; i++) {
            const resourceData = resourcesData[i];
            let filteredData = {};

            attributes.forEach(attribute => {
                if (resourceData[attribute]!=undefined){
                    filteredData[attribute] = resourceData[attribute];
                }
            });
            filteredResourcesData.push(filteredData);
        }

        return filteredResourcesData;
    } else {
        let filteredResourceData = {};

        attributes.forEach(attribute => {
            if (resourcesData[attribute]!=undefined){
                filteredResourceData[attribute] = resourcesData[attribute];
            }
        });

        return filteredResourceData;
    }
};

module.exports = {
    filterResourceData,
};
