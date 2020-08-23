const port = chrome.runtime.connect();

function updateLastSearch() {
  port.postMessage({ type: constants.MESSAGE_TYPES.SET_LAST_SEARCH, value: Date.now() });
}

function spoof(value) {
  port.postMessage({ type: constants.MESSAGE_TYPES.SPOOF_USER_AGENT, value });
}

function mobileSpoof(value) {
  port.postMessage({ type: constants.MESSAGE_TYPES.ACTIVELY_SEARCHING_MOBILE, value });
}

const staticSearchesWrapper = document.getElementById('static-search-input-wrapper');
const randomSearchesWrapper = document.getElementById('random-search-input-wrapper');

const iterationCount1 = document.getElementById('iteration-count-1');
const iterationCount2 = document.getElementById('iteration-count-2');
const iterationCountWrapper = document.getElementById('iteration-count-wrapper');

function updateSearchInputsVisibility() {
  if (document.getElementById('random-search').checked) {
    staticSearchesWrapper.style = 'display: none;';
    randomSearchesWrapper.style = 'display: block;';
  } else {
    staticSearchesWrapper.style = 'display: block;';
    randomSearchesWrapper.style = 'display: none;';
  }
}

const dailyTrendQueries = [];
const usedDailyQueries = new Set();
(function fetchDailyTrendQueries() {
  try {
    function handleResult(result) {
      // 6 is to remove the malformed `)]}', ` at the beginning of the response
      const json = JSON.parse(result.substring(6));
      dailyTrendQueries.push(...json.default.trendingSearchesDays.map(day => {
        return day.trendingSearches.map(search => search.title.query.toLowerCase());
      }).flat().filter(q => q));
    }
    // fetch the last X days to get a fair number of queries to pull from
    for (let i = 0; i < constants.NUM_DAILY_TREND_FETCHES; i++) {
      // don't worry about timezone shifts here. shouldn't matter if we're off by a day on the API calls.
      let date = new Date(Date.now() - i * constants.ONE_DAY_MILLIS);
      date = date.toISOString();
      date = date.substring(0, date.indexOf('T')).replace(/-/g, '');
      fetch(`${constants.CORS_PROXY_URL}${constants.DAILY_TRENDS_API}&ed=${date}`).then(r => r.text()).then(handleResult);
    }
  } catch (err) {
    // log the error, but do nothing and default to the hardcoded queries
    console.error(err);
  }
})();

function getSearchQuery(randomLettersSearch = false) {
  if (randomLettersSearch) return Math.random().toString(36).substr(2);

  // try using a daily trend query. if there are none or we run into a duplicate, just fallback to the hardcoded queries
  if (dailyTrendQueries.length > 0) {
    const query = getRandomElement(dailyTrendQueries);
    if (!usedDailyQueries.has(query)) {
      usedDailyQueries.add(query);
      return query;
    }
  }

  const queryTemplate = getRandomElement(queryTemplates);
  const variables = queryTemplate.template.match(/(\$\d+)/g); // variables are $1, $2, ... where the digit is the ID of the variable
  const query = variables.reduce((acc, variable, i) => {
    const type = queryTemplate.types[i];
    const value = getRandomElement(types[type]);
    return acc.replace(variable, value);
  }, queryTemplate.template);

  return query;
}

let searchTimeout;

function stopSearches() {
  clearTimeout(searchTimeout);
  iterationCount1.innerText = '';
  iterationCount2.innerText = '';
  iterationCountWrapper.style = 'display: none;';
  spoof(false);
  mobileSpoof(false);
}

function startSearches(numIterations, platformSpoofing) {
  clearTimeout(searchTimeout);

  // send messages over the port to initiate spoofing based on the preference
  if (platformSpoofing === 'none' || !platformSpoofing) {
    spoof(false);
    mobileSpoof(false);
  } else if (platformSpoofing === 'desktop-and-mobile') {
    numIterations *= 2;
    spoof(true);
    mobileSpoof(false);
  } else if (platformSpoofing === 'desktop-only') {
    spoof(true);
    mobileSpoof(false);
  } else if (platformSpoofing === 'mobile-only') {
    spoof(true);
    mobileSpoof(true);
  }

  // - redirects to Bing search with a query
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

      return new Promise(resolve => {
        const query = getSearchQuery(document.getElementById('random-letters-search').checked);
        chrome.tabs.update({
          url: `https://bing.com/search?q=${query}`,
        });

        if (document.getElementById('blitz-search').checked) {
          // arbitrarily wait 500ms on the last mobile search before resolving
          // so that there is a delay before disabling the mobile spoofing
          // (otherwise the last search will occur after the spoofing is disabled)
          const delay = mobileCount === desktopCount ? 500 : 0;
          setTimeout(() => {
            resolve([overallCount, desktopCount, mobileCount]);
          }, delay)
          return;
        }

        // an unfortunate solution, but we need to wait until the tab is loaded before resolving
        // so that we don't kill the spoofing before the tab is loaded
        // and for some reason, this listener is triggered multiple times with the same 'completed' status, so we need a flag
        let resolved = false;
        chrome.tabs.onUpdated.addListener((tabId, info) => {
          if (info.status === 'complete' && !resolved) {
            resolved = true;
            resolve([overallCount, desktopCount, mobileCount]);
          }
        });
      });
    };
  })();

  // if we are spoofing desktop searches, show a count labelled 'desktop'. same for mobile.
  // if we are doing mobile and desktop searches, get the remaining count from half of the numIterations, since the numIterations includes both
  // if we are not spoofing anything, then just display an unlabelled count.
  function setCountDisplayText(overallCount, desktopCount, mobileCount) {
    const containsDesktop = platformSpoofing.includes('desktop');
    const containsMobile = platformSpoofing.includes('mobile');
    const desktopRemaining = (platformSpoofing === 'desktop-and-mobile' ? numIterations / 2 : numIterations) - desktopCount;
    const mobileRemaining = (platformSpoofing === 'desktop-and-mobile' ? numIterations / 2 : numIterations) - mobileCount;

    if (containsDesktop) {
      iterationCount1.innerText = `${desktopRemaining} (desktop)`;
    }
    if (containsMobile) {
      const el = containsDesktop ? iterationCount2 : iterationCount1;
      el.innerText = `${mobileRemaining} (mobile)`;
    }
    if (!containsDesktop && !containsMobile) {
      iterationCount1.innerText = numIterations - overallCount;
    }
  }

  let counts = [0, 0, 0];
  iterationCountWrapper.style = 'display: block;';
  setCountDisplayText(...counts);

  (async function searchLoop() {
    let currentDelay = Number(document.getElementById('delay').value);
    if (document.getElementById('random-search').checked) {
      const minDelay = Number(document.getElementById('random-search-delay-min').value);
      const maxDelay = Number(document.getElementById('random-search-delay-max').value);
      currentDelay = random(minDelay, maxDelay);
    }

    const isMobile = platformSpoofing === 'mobile-only' || (platformSpoofing === 'desktop-and-mobile' && counts && counts[0] >= numIterations / 2);
    counts = await search(isMobile);
    setCountDisplayText(...counts);

    if (counts[0] >= numIterations) stopSearches();
    else searchTimeout = setTimeout(searchLoop, currentDelay);
  })();
}

// id is HTML id attribute
// elementKey is how to get the value of that element (depends on type of input)
// preferenceKey the is key in chrome storage
// defaultKey is key in the constants.DEFAULT_PREFERENCES
const preferenceBindings = [
  { id: 'num-iterations', elementKey: 'value', preferenceKey: 'numIterations', defaultKey: 'NUM_ITERATIONS' },
  { id: 'delay', elementKey: 'value', preferenceKey: 'delay', defaultKey: 'DELAY' },
  { id: 'random-search-iterations-min', elementKey: 'value', preferenceKey: 'randomSearchIterationsMin', defaultKey: 'RANDOM_SEARCH_ITERATIONS_MINIMUM' },
  { id: 'random-search-iterations-max', elementKey: 'value', preferenceKey: 'randomSearchIterationsMax', defaultKey: 'RANDOM_SEARCH_ITERATIONS_MAXIMUM' },
  { id: 'random-search-delay-min', elementKey: 'value', preferenceKey: 'randomSearchDelayMin', defaultKey: 'RANDOM_SEARCH_DELAY_MINIMUM' },
  { id: 'random-search-delay-max', elementKey: 'value', preferenceKey: 'randomSearchDelayMax', defaultKey: 'RANDOM_SEARCH_DELAY_MAXIMUM' },
  { id: 'auto-click', elementKey: 'checked', preferenceKey: 'autoClick', defaultKey: 'AUTO_CLICK' },
  { id: 'random-guesses', elementKey: 'checked', preferenceKey: 'randomGuesses', defaultKey: 'RANDOM_GUESSES' },
  { id: 'random-letters-search', elementKey: 'checked', preferenceKey: 'randomLettersSearch', defaultKey: 'RANDOM_LETTERS_SEARCH' },
  { id: 'platform-spoofing', elementKey: 'value', preferenceKey: 'platformSpoofing', defaultKey: 'PLATFORM_SPOOFING' },
  { id: 'random-search', elementKey: 'checked', preferenceKey: 'randomSearch', defaultKey: 'RANDOM_SEARCH' },
  { id: 'blitz-search', elementKey: 'checked', preferenceKey: 'blitzSearch', defaultKey: 'BLITZ_SEARCH' },
];

// load the saved values from the Chrome storage API
chrome.storage.local.get(preferenceBindings.map(({ preferenceKey }) => preferenceKey), result => {
  preferenceBindings.forEach(({ id, elementKey, preferenceKey, defaultKey }) => {
    // value could be false, in which case the shortcut || operator would evaluate to the default (not intended)
    document.getElementById(id)[elementKey] = result[preferenceKey] === undefined ? constants.DEFAULT_PREFERENCES[defaultKey] : result[preferenceKey];
  });
  updateSearchInputsVisibility();
});

function saveChanges() {
  updateSearchInputsVisibility();
  const newPreferences = {};
  preferenceBindings.forEach(({ id, elementKey, preferenceKey }) => {
    newPreferences[preferenceKey] = document.getElementById(id)[elementKey];
  });
  chrome.storage.local.set(newPreferences);
}

function reset(e) {
  e.preventDefault(); // the reset button is actually a link, so we don't want it to redirect
  if (document.getElementById('random-search').checked) {
    document.getElementById('random-search-iterations-min').value = constants.DEFAULT_PREFERENCES.RANDOM_SEARCH_ITERATIONS_MINIMUM;
    document.getElementById('random-search-iterations-max').value = constants.DEFAULT_PREFERENCES.RANDOM_SEARCH_ITERATIONS_MAXIMUM;
    document.getElementById('random-search-delay-min').value = constants.DEFAULT_PREFERENCES.RANDOM_SEARCH_DELAY_MINIMUM;
    document.getElementById('random-search-delay-max').value = constants.DEFAULT_PREFERENCES.RANDOM_SEARCH_DELAY_MAXIMUM;
  } else {
    document.getElementById('num-iterations').value = constants.DEFAULT_PREFERENCES.NUM_ITERATIONS;
    document.getElementById('delay').value = constants.DEFAULT_PREFERENCES.DELAY;
  }
  saveChanges();
}

// id is HTML id attribute
// eventType is the type of event to listen for
// fn is what to run when the event occurs (defaults to saveChanges)
const changeBindings = [
  { id: 'num-iterations', eventType: 'input' },
  { id: 'delay', eventType: 'input' },
  { id: 'random-search', eventType: 'change' },
  { id: 'random-search-iterations-min', eventType: 'input' },
  { id: 'random-search-iterations-max', eventType: 'input' },
  { id: 'random-search-delay-min', eventType: 'input' },
  { id: 'random-search-delay-max', eventType: 'input' },
  { id: 'auto-click', eventType: 'change' },
  { id: 'random-guesses', eventType: 'change' },
  { id: 'random-letters-search', eventType: 'change' },
  { id: 'blitz-search', eventType: 'change' },
  { id: 'platform-spoofing', eventType: 'change' },
  { id: 'reset', eventType: 'click', fn: reset },
  { id: 'stop', eventType: 'click', fn: stopSearches },
];

changeBindings.forEach(({ id, eventType, fn = saveChanges }) => {
  document.getElementById(id).addEventListener(eventType, fn);
});

function handleSearchClicked() {
  updateLastSearch();

  let numIterations = Number(document.getElementById('num-iterations').value);
  if (document.getElementById('random-search').checked) {
    const minInterations = Number(document.getElementById('random-search-iterations-min').value);
    const maxIterations = Number(document.getElementById('random-search-iterations-max').value);
    numIterations = random(minInterations, maxIterations);
  }
  const platformSpoofing = document.getElementById('platform-spoofing').value;
  startSearches(numIterations, platformSpoofing);
}

chrome.commands.onCommand.addListener(command => {
  if (command === 'start-searches') handleSearchClicked();
});
document.getElementById('search').addEventListener('click', handleSearchClicked);

document.getElementById('open-reward-tasks').addEventListener('click', () => {
  function openRewardTasks() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'OPEN_REWARD_TASKS' });
    });
  }

  stopSearches();
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    if (tab && tab.url.includes('https://account.microsoft.com/rewards')) {
        openRewardTasks();
    } else {
      chrome.tabs.update({
        url: 'https://account.microsoft.com/rewards',
      }, () => {
        // this 5s timeout is hack, but it works for the most part (unless your internet or browser speed is very slow)
        // and even if it doesn't work, you just have to click the button again
        setTimeout(() => {
          openRewardTasks();
        }, 5000);
      });
    }
  });
});
