function setBadgeReminder() {
  chrome.browserAction.setBadgeText({ text: constants.BADGE_REMINDER_TEXT });
  chrome.browserAction.setBadgeBackgroundColor({ color: constants.BADGE_COLORS.REMINDER });
}

/**
 * Meant to be called after every search
 */
let searchReminderTimeout;
function updateReminderTimeout() {
  getStorage([{
    key: 'lastSearch',
    cb: lastSearch => {
      clearTimeout(searchReminderTimeout);
      const timeSinceLastSearch = Date.now() - lastSearch;
      if (lastSearch && timeSinceLastSearch < constants.ONE_DAY_MILLIS) {
        clearBadge();
        searchReminderTimeout = setTimeout(setBadgeReminder, constants.ONE_DAY_MILLIS - timeSinceLastSearch);
      } else {
        setBadgeReminder();
      }
    }
  }]);
}
updateReminderTimeout();
