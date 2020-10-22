const schedulePrefs = {};

function startSearchesInNewTab() {
  chrome.tabs.create({ active: false }, tab => {
    startSearches(tab.id);
  });
  getStorage(['scheduledTimeOpensRewardTasks']).then(({ scheduledTimeOpensRewardTasks }) => {
    if (!scheduledTimeOpensRewardTasks) return;
    chrome.tabs.create({ url: constants.REWARDS_URL, active: false }, newTab => {
      function listener(updatedTabId, info, updatedTab) {
        if (newTab.id === updatedTabId && info.status === 'complete' && updatedTab.url.includes(constants.REWARDS_URL)) {
          chrome.tabs.executeScript(newTab.id, {
            file: '/content-scripts/open-reward-tasks.js',
          }, () => {
            chrome.tabs.onUpdated.removeListener(listener);
          });
        }
      }
      chrome.tabs.onUpdated.addListener(listener);
    });
  })
}

/**
 * Find the next scheduled search and then from then on, schedule every 24 hours.
 */
let nextSearchTimeout;
let searchScheduleInterval;
function attemptScheduling() {
  clearTimeout(nextSearchTimeout);
  clearInterval(searchScheduleInterval);

  if (!schedulePrefs.scheduleSearches) return;

  // find the next scheduled search (some time within 24 hours)
  // and then once that scheduled search executes, schedule searches on a 24 hour interval
  const timeUntilTodaysScheduledHour = getDateFromTime(schedulePrefs.scheduledTime) - new Date();
  const timeoutToScheduledHour = timeUntilTodaysScheduledHour < 0 ? constants.ONE_DAY_MILLIS + timeUntilTodaysScheduledHour : timeUntilTodaysScheduledHour;
  nextSearchTimeout = setTimeout(() => {
    startSearchesInNewTab();
    searchScheduleInterval = setInterval(startSearchesInNewTab, constants.ONE_DAY_MILLIS);
  }, timeoutToScheduledHour);

  // scheduled time has passed and there wasn't already a search done today
  // (e.g. they opened their browser for the day AFTER the scheduled time),
  // so just do a search right now
  const lastSearchWasToday = schedulePrefs.lastSearch - getMidnightDate() > 0;
  if (!lastSearchWasToday && timeUntilTodaysScheduledHour < 0) {
    // update lastSearch manually since we don't hook into the storage value, but
    // we don't want to keep invoking new searches every time we change schedule prefs
    schedulePrefs.lastSearch = Date.now();
    startSearchesInNewTab();
  }
}

// whenever any of these storage values change, clear the old schedule and attempt to schedule searches in the future
getStorage(['scheduleSearches', 'scheduledTime', 'lastSearch'], schedulePrefs).then(attemptScheduling);
// don't hook into lastSearch since we don't care when it changes (we only care when it mounts)
hookStorage(['scheduleSearches', 'scheduledTime'].map(key => ({
  key,
  cb: value => {
    schedulePrefs[key] = value;
    attemptScheduling();
  },
})), schedulePrefs);
