function sendMessage(msg) {
  if (activePort) {
    activePort.postMessage(msg);
  }
}

function setBadgeReminderWithCount(count) {
  chrome.browserAction.setBadgeText({ text: count.toString() }); // must be a string type
  chrome.browserAction.setBadgeBackgroundColor({ color: constants.BADGE_COLOR });
}

function updateLastSearch() {
  setStorage('lastSearch', Date.now()).then(updateReminderTimeout);
}


// scoped globally so that we can return it when fetching from popup
let counts = [0, 0, 0];
let setSearchCounts;
let searchTimeout;
let currentSearchingTabId;

function stopSearches() {
  clearTimeout(searchTimeout);
  currentSearchingTabId = null;
  clearBadge();
  sendMessage({ type: constants.MESSAGE_TYPES.CLEAR_SEARCH_COUNTS });
  setSearchCounts = null;
  spoof(false);
  mobileSpoof(false);
}

function startSearches(tabId) {
  currentSearchingTabId = tabId;

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

  const numIterations = desktopIterations + mobileIterations;

  // - redirects to search with a query
  // - sends message over the port to switch to mobile spoofing once required
  // - returns an array of overall search counts, desktop counts and mobile counts 
  const search = (() => {
    let overallCount = 0;
    let desktopCount = 0;
    let mobileCount = 0;
    return isMobile => {
      if (isMobile && mobileCount === 0) mobileSpoof(true);

      if (isMobile) mobileCount++;
      else desktopCount++;
      overallCount++;

      return new Promise((resolve, reject) => {
        const query = getSearchQuery();
        chrome.tabs.update(tabId, {
          url: `https://bing.com/search?q=${query}`,
        }, () => {
          // we expect an error if there is the tab is closed, for example
          if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);

          if (prefs.blitzSearch) {
            // arbitrarily wait 500ms on the last mobile search before resolving
            // so that there is a delay before disabling the mobile spoofing
            // (otherwise the last search will occur after the spoofing is disabled)
            const delay = mobileCount === desktopCount ? 500 : 0;
            setTimeout(() => resolve([overallCount, desktopCount, mobileCount]), delay);
            return;
          }
  
          // an unfortunate solution, but we need to wait until the tab is loaded before resolving
          // so that we don't kill the spoofing before the tab is loaded
          // and for some reason, this listener is triggered multiple times with the same 'completed' status, so we need a flag
          let resolved = false;
          chrome.tabs.onUpdated.addListener((updatedTabId, info) => {
            if (tabId === updatedTabId && info.status === 'complete' && !resolved) {
              resolved = true;
              resolve([overallCount, desktopCount, mobileCount]);
            }
          });
        });
      });
    };
  })();

  setSearchCounts = () => {
    const [overallCount, desktopCount, mobileCount] = counts;
    const containsDesktop = platformSpoofing.includes('desktop');
    const containsMobile = platformSpoofing.includes('mobile');
    const desktopRemaining = desktopIterations - desktopCount;
    const mobileRemaining = mobileIterations - mobileCount;
    sendMessage({
      type: constants.MESSAGE_TYPES.UPDATE_SEARCH_COUNTS,
      numIterations,
      overallCount,
      containsDesktop,
      containsMobile,
      desktopRemaining,
      mobileRemaining,
    });
  }

  counts = [0, 0, 0];
  setSearchCounts(...counts);

  (async function searchLoop() {
    let currentDelay = Number(prefs.delay);
    if (prefs.randomSearch) {
      const minDelay = Number(prefs.randomSearchDelayMin);
      const maxDelay = Number(prefs.randomSearchDelayMax);
      currentDelay = random(minDelay, maxDelay);
    }

    try {
      const isMobile = platformSpoofing === 'mobile-only' || (platformSpoofing === 'desktop-and-mobile' && counts && counts[0] >= desktopIterations);
      counts = await search(isMobile);

      // This is to address the issue where you stop the searches while the page is loading (or start searches in another tab)
      // and we are awaiting the search to complete. The timeout function is async, so even
      // if the timeout has been cleared, once the promise finishes, it will invoke another search.
      // So, we check after done waiting for if the search has completed.
      if (currentSearchingTabId !== tabId) return;
  
      setSearchCounts(...counts);
      setBadgeReminderWithCount(numIterations - counts[0]);
  
      if (counts[0] >= numIterations) stopSearches();
      else searchTimeout = setTimeout(searchLoop, currentDelay);
    } catch (err) {
      console.error(err.message);
      stopSearches();
    }
  })();
}
