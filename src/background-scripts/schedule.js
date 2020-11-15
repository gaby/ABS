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
async function attemptScheduling() {
  const {
    scheduleSearches,
    scheduledTime,
    lastSearch,
  } = await getStorage(['scheduleSearches', 'scheduledTime', 'lastSearch']);

  if (!scheduleSearches) {
    chrome.alarms.clear(constants.ALARMS.SCHEDULED_SEARCH);
    return;
  }

  const timeUntilTodaysScheduledHour = getDateFromTime(scheduledTime);
  let when = timeUntilTodaysScheduledHour.getTime();
  // there has already been a search completed today, so do the search tomorrow instead
  if (lastSearch > getMidnightDate()) {
    when += constants.ONE_DAY_MILLIS;
  }
  chrome.alarms.create(constants.ALARMS.SCHEDULED_SEARCH, {
    when,
    periodInMinutes: constants.ONE_DAY_MINS,
  });
}

// whenever any of these storage values change, clear the old schedule and attempt to schedule searches in the future
hookStorage(['scheduleSearches', 'scheduledTime'].map(key => ({
  key,
  cb: attemptScheduling,
})));

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === constants.ALARMS.SCHEDULED_SEARCH) {
    startSearchesInNewTab();
  }
});

chrome.runtime.onInstalled.addListener(attemptScheduling);
chrome.runtime.onStartup.addListener(attemptScheduling);
