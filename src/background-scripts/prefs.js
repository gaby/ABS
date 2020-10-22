const prefKeys = Object.keys(constants.DEFAULT_PREFERENCES);
const prefs = { ...constants.DEFAULT_PREFERENCES };
hookStorage(prefKeys, prefs);
getStorage(prefKeys, prefs);
