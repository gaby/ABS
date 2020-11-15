function sendMessage(msg) {
  if (activePort) activePort.postMessage(msg);
}

function setBadgeReminderWithCount(count) {
  chrome.browserAction.setBadgeText({ text: count.toString() }); // must be a string type
  chrome.browserAction.setBadgeBackgroundColor({ color: constants.BADGE_COLORS.COUNT });
}

function updateLastSearch() {
  setStorage('lastSearch', Date.now());
}

// store it in an object because eventually, we will be storing this information in local storage
// and once that happens, it will be an object as well
let currentSearchSettings = {
  // currentSearchingTabId,
  // platformSpoofing,
  // desktopIterations,
  // mobileIterations,
  // overallCount,
  // desktopCount,
  // mobileCount,
};
let searchTimeout;

function stopSearches() {
  currentSearchSettings = {};
  clearTimeout(searchTimeout);
  clearBadge();
  sendMessage({ type: constants.MESSAGE_TYPES.CLEAR_SEARCH_COUNTS });
  spoof(false);
  mobileSpoof(false);
}

function setSearchCounts() {
  const {
    currentSearchingTabId,
    overallCount,
    desktopCount,
    mobileCount,
    desktopIterations,
    mobileIterations,
    platformSpoofing,
  } = currentSearchSettings;
  if (!currentSearchingTabId) {
    sendMessage({ type: constants.MESSAGE_TYPES.CLEAR_SEARCH_COUNTS });
    return;
  }

  const containsDesktop = platformSpoofing.includes('desktop');
  const containsMobile = platformSpoofing.includes('mobile');
  const desktopRemaining = desktopIterations - desktopCount;
  const mobileRemaining = mobileIterations - mobileCount;

  sendMessage({
    type: constants.MESSAGE_TYPES.UPDATE_SEARCH_COUNTS,
    numIterations: desktopIterations + mobileIterations,
    overallCount,
    containsDesktop,
    containsMobile,
    desktopRemaining,
    mobileRemaining,
  });
}

/**
 * Actually redirects to perform search query.
 */
async function search(isMobile) {
  await prefsLoaded;
  if (!currentSearchSettings) return;

  const {
    desktopCount,
    mobileCount,
    currentSearchingTabId,
  } = currentSearchSettings;

  if (isMobile && mobileCount === 0) mobileSpoof(true);

  return new Promise(async (resolve, reject) => {
    const query = await getSearchQuery();
    chrome.tabs.update(currentSearchingTabId, {
      url: `https://bing.com/search?q=${query}`,
    }, () => {
      // we expect an error if there is the tab is closed, for example
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);

      if (prefs.blitzSearch) {
        // arbitrarily wait 500ms on the last mobile search before resolving
        // so that there is a delay before disabling the mobile spoofing
        // (otherwise the last search will occur after the spoofing is disabled)
        const delay = (mobileCount === desktopCount && desktopCount > 0) ? 500 : 0;
        setTimeout(resolve, delay);
        return;
      }

      function listener(updatedTabId, info) {
        if (currentSearchingTabId === updatedTabId && info.status === 'complete') {
          resolve();
          chrome.tabs.onUpdated.removeListener(listener);
        }
      }
      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}

/**
 * Computes the data we need to make our searches, invokes the search function,
 * and schedules another search in the future (after some delay).
 */
async function searchLoop(currentSearchingTabId) {
  await prefsLoaded;

  let {
    platformSpoofing,
    desktopIterations,
    mobileIterations,
    overallCount,
    desktopCount,
    mobileCount,
  } = currentSearchSettings;

  let currentDelay = Number(prefs.delay);
  if (prefs.randomSearch) {
    const minDelay = Number(prefs.randomSearchDelayMin);
    const maxDelay = Number(prefs.randomSearchDelayMax);
    currentDelay = random(minDelay, maxDelay);
  }

  try {
    const isMobile = platformSpoofing === 'mobile-only' || (platformSpoofing === 'desktop-and-mobile' && overallCount >= desktopIterations);
    await search(isMobile);

    // This is to address the issue where you stop the searches while the page is loading (or start searches in another tab)
    // and we are awaiting the search to complete. The timeout function is async, so even if the timeout has been cleared,
    // once the promise finishes, it will invoke another search. So, we check after done waiting for if the search has completed.
    if (currentSearchSettings.currentSearchingTabId !== currentSearchingTabId) return;

    overallCount++;
    if (isMobile) mobileCount++;
    else desktopCount++;
    Object.assign(currentSearchSettings, {
      overallCount,
      desktopCount,
      mobileCount,
    });

    setSearchCounts();
    setBadgeReminderWithCount(desktopIterations + mobileIterations - overallCount);

    if (overallCount >= desktopIterations + mobileIterations) {
      stopSearches();
    } else {
      // cannot use chrome.alarms since an alarm will fire, at most, every one minute
      searchTimeout = setTimeout(() => searchLoop(currentSearchingTabId), currentDelay);
    }
  } catch (err) {
    console.error(err.message);
    stopSearches();
  }
}

/**
 * Computes/stores the search settings which will be used, then invokes the first search loop.
 */
async function startSearches(tabId) {
  stopSearches();

  await prefsLoaded;
  updateLastSearch();

  const { platformSpoofing } = prefs;
  const minInterations = Number(prefs.randomSearchIterationsMin);
  const maxIterations = Number(prefs.randomSearchIterationsMax);
  let desktopIterations = prefs.randomSearch ? random(minInterations, maxIterations) : Number(prefs.desktopIterations);
  let mobileIterations = prefs.randomSearch ? random(minInterations, maxIterations) : Number(prefs.mobileIterations);

  // send messages over the port to initiate spoofing based on the preference
  if (platformSpoofing === 'none' || !platformSpoofing) {
    spoof(false);
    mobileSpoof(false);
    mobileIterations = 0;
  } else if (platformSpoofing === 'desktop-and-mobile') {
    spoof(true);
    mobileSpoof(false);
  } else if (platformSpoofing === 'desktop-only') {
    spoof(true);
    mobileSpoof(false);
    mobileIterations = 0;
  } else if (platformSpoofing === 'mobile-only') {
    spoof(true);
    mobileSpoof(true);
    desktopIterations = 0;
  }

  Object.assign(currentSearchSettings, {
    currentSearchingTabId: tabId,
    platformSpoofing,
    desktopIterations,
    mobileIterations,
    overallCount: 0,
    desktopCount: 0,
    mobileCount: 0,
  });

  setSearchCounts();
  searchLoop(tabId);
}
