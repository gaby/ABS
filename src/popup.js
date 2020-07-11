const port = chrome.runtime.connect();

function spoof(value) {
  port.postMessage({ type: constants.MESSAGE_TYPES.SPOOF_USER_AGENT, value });
}

function mobileSpoof(value) {
  port.postMessage({ type: constants.MESSAGE_TYPES.ACTIVELY_SEARCHING_MOBILE, value });
}

const iterationCount1 = document.getElementById('iteration-count-1');
const iterationCount2 = document.getElementById('iteration-count-2');
const iterationCountWrapper = document.getElementById('iteration-count-wrapper');

function saveChanges() {
  chrome.storage.local.set({
    numIterations: document.getElementById('num-iterations').value,
    delay: document.getElementById('delay').value,
    autoClick: document.getElementById('auto-click').checked,
    randomGuesses: document.getElementById('random-guesses').checked,
    randomLetters: document.getElementById('random-letters-search').checked,
    platformSpoofing: document.getElementById('platform-spoofing').value,
  });
}

function getSearchQuery(randomLetters = false) {
  if (randomLetters) return Math.random().toString(36).substr(2);

  const queryTemplate = getRandomElement(queryTemplates);
  const variables = queryTemplate.template.match(/(\$\d+)/g); // variables are $1, $2, ... where the digit is the ID of the variable
  const query = variables.reduce((acc, variable, i) => {
    const type = queryTemplate.types[i];
    const value = getRandomElement(types[type]);
    return acc.replace(variable, value);
  }, queryTemplate.template);

  return query;
}

let searchInterval;

function stopSearches() {
  clearInterval(searchInterval);
  iterationCount1.innerText = '';
  iterationCount2.innerText = '';
  iterationCountWrapper.style = 'visibility: hidden;';
  spoof(false);
  mobileSpoof(false);
}

function startSearches(numIterations, delay, platformSpoofing) {
  clearInterval(searchInterval);

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
      const query = getSearchQuery(document.getElementById('random-letters-search').checked);
      chrome.tabs.update({
        url: `https://bing.com/search?q=${query}`,
      });
      if (isMobile) mobileCount++;
      else desktopCount++;
      return [++overallCount, desktopCount, mobileCount];
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

  let counts = search();
  setCountDisplayText(...counts);
  iterationCountWrapper.style = 'visibility: visible;';

  searchInterval = setInterval(async () => {  
    if (counts[0] >= numIterations) {
      stopSearches();
    } else {
      const isMobile = platformSpoofing === 'mobile-only' || (platformSpoofing === 'desktop-and-mobile' && counts[0] >= numIterations / 2);
      counts = search(isMobile);
      setCountDisplayText(...counts);
    }
  }, delay);
}

function reset() {
  document.getElementById('num-iterations').value = constants.DEFAULT_PREFERENCES.NUM_ITERATIONS;
  document.getElementById('delay').value = constants.DEFAULT_PREFERENCES.DELAY;
  saveChanges();
}

// load the saved values from the Chrome storage API
chrome.storage.local.get(['numIterations', 'delay', 'autoClick', 'randomGuesses', 'randomLetters', 'platformSpoofing'], result => {
  document.getElementById('num-iterations').value = result.numIterations || constants.DEFAULT_PREFERENCES.NUM_ITERATIONS;
  document.getElementById('delay').value = result.delay || constants.DEFAULT_PREFERENCES.DELAY;
  // value could be false, in which case the shortcut || operator would evaluate to the default (not intended)
  document.getElementById('auto-click').checked = result.autoClick === undefined ? constants.DEFAULT_PREFERENCES.AUTO_CLICK : result.autoClick;
  document.getElementById('random-guesses').checked = result.randomGuesses === undefined ? constants.DEFAULT_PREFERENCES.RANDOM_GUESSES : result.randomGuesses;
  document.getElementById('random-letters-search').checked = result.randomLetters === undefined ? constants.DEFAULT_PREFERENCES.RANDOM_LETTERS : result.randomLetters;
  document.getElementById('platform-spoofing').value = result.platformSpoofing === undefined ? constants.DEFAULT_PREFERENCES.PLATFORM_SPOOFING : result.platformSpoofing;
});

document.getElementById('num-iterations').addEventListener('input', saveChanges);
document.getElementById('delay').addEventListener('input', saveChanges);
document.getElementById('auto-click').addEventListener('change', saveChanges);
document.getElementById('random-guesses').addEventListener('change', saveChanges);
document.getElementById('random-letters-search').addEventListener('change', saveChanges);
document.getElementById('platform-spoofing').addEventListener('change', saveChanges);

document.getElementById('search').addEventListener('click', async () => {
  const numIterations = parseInt(document.getElementById('num-iterations').value, 10);
  const delay = parseInt(document.getElementById('delay').value, 10);
  const platformSpoofing = document.getElementById('platform-spoofing').value;
  startSearches(numIterations, delay, platformSpoofing);
});
document.getElementById('reset').addEventListener('click', reset);
document.getElementById('stop').addEventListener('click', stopSearches);

function openRewardTasks() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'OPEN_REWARD_TASKS' });
  });
}

document.getElementById('open-reward-tasks').addEventListener('click', () => {
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
