/**
 * Adds a listener to changed storage values. `storage`
 * will be updated or the associated callback function (`cb`)
 * will be called whenever a change occurs to the storage values.
 * The storage values change when a user interacts with the extension's popup.
 *
 * @param {Array<string | Object>} storageKeys Array of storage "keys" which are hooked. If the element is a string, it is a storage key.
 *   If the element is an object, it has a `key` field (string) and a `cb` field (function).
 *   `cb` will be called with the new value and `storage` will not be set for this element (that is up to the caller).
 * @param {Object} storage Object of storage values
 */
function hookStorage(storageKeys, storage) {
  chrome.storage.onChanged.addListener(res => {
    if (chrome.runtime.lastError) {
      return;
    }
    storageKeys.forEach(storageKey => {
      // it's either a string or an object of the form { key, cb }
      if (typeof storageKey === 'string') {
        if (res[storageKey] !== undefined) storage[storageKey] = res[storageKey].newValue;
      } else {
        const { key, cb } = storageKey;
        if (res[key] !== undefined) cb(res[key].newValue);
      }
    });
  });
}

/**
 * Similar to hookStorage, except the storage values are retrieved immediately and only once.
 * Also returns a Promise for convenience.
 *
 * @param {Array<string | Object>} storageKeys
 * @param {Object?} storage
 *
 * @returns {Promise<Object>} Promise which resolves to a mapping of storage key to the value
 */
async function getStorage(storageKeys, storage) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(storageKeys.map(key => (typeof key === 'string' ? key : key.key)), res => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(storageKeys.reduce((acc, storageKey) => {
        // it's either a string or an object of the form { key, cb }
        if (typeof storageKey === 'string') {
          if (!storage) return { ...acc, [storageKey]: res[storageKey] };
          if (res[storageKey] !== undefined) storage[storageKey] = res[storageKey];
          else storage[storageKey] = constants.DEFAULT_PREFERENCES[storageKey];
          return { ...acc, [storageKey]: res[storageKey] };
        }
        const { key, cb } = storageKey;
        cb(res[key]);
        return { ...acc, [key]: res[key] };
      }, {}));
    });
  });
}

/**
 * Sets a local storage value or set of values.
 * @param {string | Object} keyOrMap Either a string (representing a key, in which case val must be provided)
 *   or an object with key-value-pair mappings for storing.
 * @param {any?} val The value associated with key, iff key is a string.
 */
async function setStorage(keyOrMap, val) {
  return new Promise((resolve, reject) => {
    const options = typeof keyOrMap === 'string'
      ? { [keyOrMap]: val }
      : keyOrMap;
    chrome.storage.local.set(options, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}
