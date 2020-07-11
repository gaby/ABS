/**
 * Adds a listener to changed preferences. `prefs`
 * will be updated or the associated callback function (`cb`)
 * will be called whenever a change occurs to preferences.
 * The preferences change when a user interacts with the extension's popup.
 *
 * @param {Array<string | Object>} prefKeys Array of preference "keys" which are hooked. If the element is a string, it is a preference key.
 *   If the element is an object, it has a `key` field (string) and a `cb` field (function).
 *   `cb` will be called with the new preference and `prefs` will not be set for this element (that is up to the caller).
 * @param {Object} prefs Object of preferences
 */
function hookPreferences(prefKeys, prefs) {
  chrome.storage.onChanged.addListener(res => {
    if (chrome.runtime.lastError) {
      return;
    }
    prefKeys.forEach(prefKey => {
      // it's either a string or an object of the form { key, cb }
      if (typeof prefKey === 'string') {
        if (res[prefKey] !== undefined) prefs[prefKey] = res[prefKey].newValue;
      } else {
        const { key, cb } = prefKey;
        if (res[key] !== undefined) cb(res[key].newValue);
      }
    });
  });
}

/**
 * Similar to hookPreferences, except the preferences are retrieved immediately and only once.
 * Also returns a Promise for convenience.
 *
 * @param {Array<string | Object>} prefKeys
 * @param {Object} prefs?
 *
 * @returns Promise<Array> - Promise which resolves to an array with the order corresponding to the prefKeys order.
 */
async function getPreferences(prefKeys, prefs) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(prefKeys.map(key => (typeof key === 'string' ? key : key.key)), res => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(prefKeys.map(prefKey => {
        // it's either a string or an object of the form { key, cb }
        if (typeof prefKey === 'string') {
          if (!prefs) return res[prefKey];
          if (res[prefKey] !== undefined) prefs[prefKey] = res[prefKey];
          else prefs[prefKey] = constants.DEFAULT_PREFERENCES[prefKey];
          return res[prefKey];
        }
        const { key, cb } = prefKey;
        cb(res[key]);
        return res[key];
      }));
    });
  });
}

/**
 * Sets a local preference.
 */
async function setPreference(key, val) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: val }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}
