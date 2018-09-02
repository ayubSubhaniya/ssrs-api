const ascendingOrder = '+';
const descendingOrder = '-';

const aggregations = ['gte', 'gt', 'lte', 'lt' ];

const filterResourceData = (resourcesData, attributes) => {

    if (resourcesData instanceof Array) {
        let filteredResourcesData = [];

        for (let i = 0; i < resourcesData.length; i++) {
            const resourceData = resourcesData[i];
            let filteredData = {};

            attributes.forEach(attribute => {
                if (resourceData[attribute]) {
                    filteredData[attribute] = resourceData[attribute];
                }
            });
            filteredResourcesData.push(filteredData);
        }

        return filteredResourcesData;
    } else if (resourcesData) {
        let filteredResourceData = {};

        attributes.forEach(attribute => {
            if (resourcesData[attribute]) {
                filteredResourceData[attribute] = resourcesData[attribute];
            }
        });

        return filteredResourceData;
    } else {
        return {};
    }
};

const extractAggregation = (query) => {
    let aggregationQuery = {};
    if (query) {
        for (let i=0;i<aggregations.length;i++){
            if (query[aggregations[i]]){
                aggregationQuery['$'+aggregations[i]]=query[aggregations[i]];
            }
        }
    }
    return aggregationQuery;
};

const parseFilterQuery = (query, allowedAttributes) => {
    let filterQuery = {};

    if (query) {
        const filteredQuery = filterResourceData(query, allowedAttributes);
        Object.keys(filteredQuery)
            .forEach(key => {
                if (typeof filteredQuery[key] === 'object') {
                    filterQuery[key] = extractAggregation(filteredQuery[key]);
                } else {
                    filterQuery[key] = filteredQuery[key];
                }
            });
    }
    return filterQuery;
};
const parseSortQuery = (query, allowedAttributes) => {
    const sortQuery = {};
    if (query) {
        const attributes = query.split(',');
        attributes.forEach(attribute => {
            let sortingOrder = 1;
            let attributeName = attribute.trim();

            if (attribute.charAt(0) === descendingOrder) {
                sortingOrder = -1;
                attributeName = attribute.substring(1).trim();
            } else if (attribute.charAt(0) === ascendingOrder) {
                sortingOrder = 1;
                attributeName = attribute.substring(1).trim();
            }

            if (!allowedAttributes.includes(attributeName)){
                throw new Error('Invalid permission');
            }

            sortQuery[attributeName] = sortingOrder;
        });
    }
    return sortQuery;
};


module.exports = {
    filterResourceData,
    parseSortQuery,
    parseFilterQuery,
};
