const port = chrome.runtime.connect();

const iterationDesktopCount = document.getElementById('iteration-desktop-count');
const iterationMobileCount = document.getElementById('iteration-mobile-count');
const iterationCountWrapper = document.getElementById('iteration-count-wrapper');

function saveChanges() {
  chrome.storage.local.set({
    numIterations: document.getElementById('num-iterations').value,
    delay: document.getElementById('delay').value,
    autoClick: document.getElementById('auto-click').checked,
    randomGuesses: document.getElementById('random-guesses').checked,
    randomLetters: document.getElementById('random-letters-search').checked,
    mobileSearches: document.getElementById('mobile-searches').checked,
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
function startSearches(numIterations, delay) {
  clearInterval(searchInterval);

  const search = (() => {
    let count = 0;
    return () => {
      const query = getSearchQuery(document.getElementById('random-letters-search').checked);
      chrome.tabs.update({
        url: `https://bing.com/search?q=${query}`,
      });
      return ++count;
    };
  })();

  let count = search();

  function setCountDisplayText() {
    const desktopCount = Math.max(0, numIterations - count);
    const mobileCount = Math.min(numIterations, 2 * numIterations - count);
    const mobileSearches = document.getElementById('mobile-searches').checked;
    iterationDesktopCount.innerText = mobileSearches ? `${desktopCount} (desktop)` : desktopCount;
    iterationMobileCount.innerText = mobileSearches ? `${mobileCount} (mobile)` : '';
  }

  setCountDisplayText();
  iterationCountWrapper.style = 'visibility: visible;';

  searchInterval = setInterval(async () => {
    const mobileSearches = document.getElementById('mobile-searches').checked;
  
    // if the preference to do mobile searches is selected, then double the searches,
    // but first flag to the background script that we are supposed to spoof the User-Agent header on requests
    if (mobileSearches && count === numIterations) {
      port.postMessage({ type: constants.MESSAGE_TYPES.ACTIVELY_SEARCHING_MOBILE, value: true });
    }

    // either we exceeded the number of iterations for desktop and there are no mobile searches to be done,
    // or we are doing mobile searches and exceeded both desktop and mobile searches
    if (count >= numIterations && !(mobileSearches && count < 2 * numIterations)) {
      clearInterval(searchInterval);
      iterationDesktopCount.innerText = '';
      iterationMobileCount.innerText = '';
      iterationCountWrapper.style = 'visibility: hidden;';
      port.postMessage({ type: constants.MESSAGE_TYPES.SPOOF_USER_AGENT, value: false });
      port.postMessage({ type: constants.MESSAGE_TYPES.ACTIVELY_SEARCHING_MOBILE, value: false });
    } else {
      count = search();
      setCountDisplayText();
    }
  }, delay);
}

function reset() {
  document.getElementById('num-iterations').value = constants.DEFAULT_PREFERENCES.NUM_ITERATIONS;
  document.getElementById('delay').value = constants.DEFAULT_PREFERENCES.DELAY;
  saveChanges();
}

// load the saved values from the Chrome storage API
chrome.storage.local.get(['numIterations', 'delay', 'autoClick', 'randomGuesses', 'randomLetters', 'mobileSearches'], result => {
  document.getElementById('num-iterations').value = result.numIterations || constants.DEFAULT_PREFERENCES.NUM_ITERATIONS;
  document.getElementById('delay').value = result.delay || constants.DEFAULT_PREFERENCES.DELAY;
  // value could be false, in which case the shortcut || operator would evaluate to the default (not intended)
  document.getElementById('auto-click').checked = result.autoClick === undefined ? constants.DEFAULT_PREFERENCES.AUTO_CLICK : result.autoClick;
  document.getElementById('random-guesses').checked = result.randomGuesses === undefined ? constants.DEFAULT_PREFERENCES.RANDOM_GUESSES : result.randomGuesses;
  document.getElementById('random-letters-search').checked = result.randomLetters === undefined ? constants.DEFAULT_PREFERENCES.RANDOM_LETTERS : result.randomLetters;
  document.getElementById('mobile-searches').checked = result.mobileSearches === undefined ? constants.DEFAULT_PREFERENCES.MOBILE_SEARCHES : result.mobileSearches;
});

document.getElementById('num-iterations').addEventListener('input', saveChanges);
document.getElementById('delay').addEventListener('input', saveChanges);
document.getElementById('auto-click').addEventListener('change', saveChanges);
document.getElementById('random-guesses').addEventListener('change', saveChanges);
document.getElementById('random-letters-search').addEventListener('change', saveChanges);
document.getElementById('mobile-searches').addEventListener('change', saveChanges);

document.getElementById('search').addEventListener('click', async () => {
  const numIterations = parseInt(document.getElementById('num-iterations').value, 10);
  const delay = parseInt(document.getElementById('delay').value, 10);
  // always start with the desktop searches
  port.postMessage({ type: constants.MESSAGE_TYPES.SPOOF_USER_AGENT, value: true });
  port.postMessage({ type: constants.MESSAGE_TYPES.ACTIVELY_SEARCHING_MOBILE, value: false });
  startSearches(numIterations, delay);
});
document.getElementById('reset').addEventListener('click', reset);

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
