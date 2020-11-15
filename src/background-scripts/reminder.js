function setBadgeReminder() {
  chrome.browserAction.setBadgeText({ text: constants.BADGE_REMINDER_TEXT });
  chrome.browserAction.setBadgeBackgroundColor({ color: constants.BADGE_COLORS.REMINDER });
}

/**
 * Meant to be called after every search (hooked on lastSearch storage value).
 */
function updateReminderTimeout(lastSearch) {
  const timeSinceLastSearch = Date.now() - lastSearch;
  if (!lastSearch || timeSinceLastSearch > constants.ONE_DAY_MILLIS) {
    setBadgeReminder();
    chrome.alarms.clear(constants.ALARMS.REMINDER);
    return;
  }
  clearBadge();
  // will overwrite existing alarm
  chrome.alarms.create(constants.ALARMS.REMINDER, {
    when: lastSearch + constants.ONE_DAY_MILLIS,
  });
}

hookStorage([{
  key: 'lastSearch',
  cb: updateReminderTimeout,
}]);

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === constants.ALARMS.REMINDER) setBadgeReminder();
});

function initiateReminderScript() {
  getStorage([{
    key: 'lastSearch',
    cb: updateReminderTimeout,
  }]);
}

// don't need to fetch the storage every time the background page becomes inactive and then active again.
// just fetch it on startup, do the initial check for the reminder,
// and then hook into the storage value for subsequent reminder updates.
chrome.runtime.onInstalled.addListener(initiateReminderScript);
chrome.runtime.onStartup.addListener(initiateReminderScript);
