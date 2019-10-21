
const StringFormatter = (base_str, args) => {
    let i = 0;
    return base_str.replace(/{}/g, () => args[i++]);
}

module.exports = {
    StringFormatter
}
