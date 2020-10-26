const prefKeys = Object.keys(constants.DEFAULT_PREFERENCES);
const prefs = { ...constants.DEFAULT_PREFERENCES };
hookStorage(prefKeys, prefs);
// other scripts which depends on the global prefs object can use
// "await prefsLoaded" so that the prefs are guaranteed to be loaded before use
const prefsLoaded = getStorage(prefKeys, prefs);
