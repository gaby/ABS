const port = chrome.runtime.connect();

const staticSearchesWrapper = document.getElementById('static-search-input-wrapper');
const randomSearchesWrapper = document.getElementById('random-search-input-wrapper');

const iterationCount1 = document.getElementById('iteration-count-1');
const iterationCount2 = document.getElementById('iteration-count-2');
const iterationCountWrapper = document.getElementById('iteration-count-wrapper');

// if we are spoofing desktop searches, show a count labelled 'desktop'. same for mobile.
// if we are not spoofing anything, then just display an unlabelled count.
function setCountDisplayText({
  numIterations,
  overallCount,
  containsDesktop,
  containsMobile,
  desktopRemaining,
  mobileRemaining,
}) {
  if (numIterations === overallCount) {
    clearCountDisplayText();
    return;
  }
  iterationCountWrapper.style = 'display: block;';

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

function clearCountDisplayText() {
  iterationCount1.innerText = '';
  iterationCount2.innerText = '';
  iterationCountWrapper.style = 'display: none;';
}

port.onMessage.addListener(msg => {
  switch(msg.type) {
    case constants.MESSAGE_TYPES.UPDATE_SEARCH_COUNTS: {
      setCountDisplayText(msg);
      break;
    }
    case constants.MESSAGE_TYPES.CLEAR_SEARCH_COUNTS: {
      clearCountDisplayText();
      break;
    }
    default: break;
  }
});
chrome.runtime.sendMessage({
  type: constants.MESSAGE_TYPES.GET_SEARCH_COUNTS,
});

function updateSearchInputsVisibility() {
  if (document.getElementById('random-search').checked) {
    staticSearchesWrapper.style = 'display: none;';
    randomSearchesWrapper.style = 'display: block;';
  } else {
    staticSearchesWrapper.style = 'display: block;';
    randomSearchesWrapper.style = 'display: none;';
  }
}

// id is HTML id attribute
// elementKey is how to get the value of that element (depends on type of input)
// preferenceKey the is key in chrome storage and constants.DEFAULT_PREFERENCES
const preferenceBindings = [
  { id: 'desktop-iterations', elementKey: 'value', preferenceKey: 'desktopIterations' },
  { id: 'mobile-iterations', elementKey: 'value', preferenceKey: 'mobileIterations' },
  { id: 'delay', elementKey: 'value', preferenceKey: 'delay' },
  { id: 'random-search-iterations-min', elementKey: 'value', preferenceKey: 'randomSearchIterationsMin' },
  { id: 'random-search-iterations-max', elementKey: 'value', preferenceKey: 'randomSearchIterationsMax' },
  { id: 'random-search-delay-min', elementKey: 'value', preferenceKey: 'randomSearchDelayMin' },
  { id: 'random-search-delay-max', elementKey: 'value', preferenceKey: 'randomSearchDelayMax' },
  { id: 'auto-click', elementKey: 'checked', preferenceKey: 'autoClick' },
  { id: 'random-guesses', elementKey: 'checked', preferenceKey: 'randomGuesses' },
  { id: 'platform-spoofing', elementKey: 'value', preferenceKey: 'platformSpoofing' },
  { id: 'random-search', elementKey: 'checked', preferenceKey: 'randomSearch' },
  { id: 'blitz-search', elementKey: 'checked', preferenceKey: 'blitzSearch' },
];

getStorage(
  preferenceBindings.map(({ id, elementKey, preferenceKey }) => ({
    key: preferenceKey,
    cb: value => {
      // value could be false, in which case the shortcut || operator
      // would evaluate to the default (not intended)
      document.getElementById(id)[elementKey] = value === undefined
        ? constants.DEFAULT_PREFERENCES[preferenceKey]
        : value;
    },
  })),
).then(updateSearchInputsVisibility);

function saveChanges() {
  updateSearchInputsVisibility();
  const newPreferences = preferenceBindings.reduce((acc, binding) => ({
    ...acc,
    [binding.preferenceKey]: document.getElementById(binding.id)[binding.elementKey],
  }), {});
  setStorage(newPreferences);
}

function reset(e) {
  e.preventDefault(); // the reset button is actually a link, so we don't want it to redirect
  if (document.getElementById('random-search').checked) {
    document.getElementById('random-search-iterations-min').value = constants.DEFAULT_PREFERENCES.randomSearchIterationsMin;
    document.getElementById('random-search-iterations-max').value = constants.DEFAULT_PREFERENCES.randomSearchIterationsMax;
    document.getElementById('random-search-delay-min').value = constants.DEFAULT_PREFERENCES.randomSearchDelayMin;
    document.getElementById('random-search-delay-max').value = constants.DEFAULT_PREFERENCES.randomSearchDelayMax;
  } else {
    document.getElementById('desktop-iterations').value = constants.DEFAULT_PREFERENCES.desktopIterations;
    document.getElementById('mobile-iterations').value = constants.DEFAULT_PREFERENCES.mobileIterations;
    document.getElementById('delay').value = constants.DEFAULT_PREFERENCES.delay;
  }
  saveChanges();
}

function openOptions(e) {
  e.preventDefault(); // the open-options button is actually a link, so we don't want it to redirect
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  }
}

// id is HTML id attribute
// eventType is the type of event to listen for
// fn is what to run when the event occurs (defaults to saveChanges)
const changeBindings = [
  { id: 'desktop-iterations', eventType: 'input' },
  { id: 'mobile-iterations', eventType: 'input' },
  { id: 'delay', eventType: 'input' },
  { id: 'random-search', eventType: 'change' },
  { id: 'random-search-iterations-min', eventType: 'input' },
  { id: 'random-search-iterations-max', eventType: 'input' },
  { id: 'random-search-delay-min', eventType: 'input' },
  { id: 'random-search-delay-max', eventType: 'input' },
  { id: 'auto-click', eventType: 'change' },
  { id: 'random-guesses', eventType: 'change' },
  { id: 'platform-spoofing', eventType: 'change' },
  { id: 'blitz-search', eventType: 'change' },
  { id: 'reset', eventType: 'click', fn: reset },
  { id: 'open-options', eventType: 'click', fn: openOptions },
  { id: 'stop', eventType: 'click', fn: stopSearches },
];

changeBindings.forEach(({ id, eventType, fn = saveChanges }) => {
  document.getElementById(id).addEventListener(eventType, fn);
});

function startSearches() {
  port.postMessage({ type: constants.MESSAGE_TYPES.START_SEARCH });
}

function stopSearches() {
  port.postMessage({ type: constants.MESSAGE_TYPES.STOP_SEARCH });
}

chrome.commands.onCommand.addListener(command => {
  if (command === 'start-searches') startSearches();
});
document.getElementById('search').addEventListener('click', startSearches);

document.getElementById('open-reward-tasks').addEventListener('click', async () => {
  function openRewardTasks() {
    return new Promise(resolve => {
      chrome.tabs.executeScript({
        file: '/content-scripts/open-reward-tasks.js',
      }, resolve);
    });
  }

  const tab = await getCurrentTab();
  if (tab && tab.url.includes(constants.REWARDS_URL)) {
    openRewardTasks();
  } else {
    chrome.tabs.update({
      url: constants.REWARDS_URL,
    }, () => {
      async function listener(updatedTabId, info, updatedTab) {
        if (tab.id === updatedTabId && info.status === 'complete' && updatedTab.url.includes(constants.REWARDS_URL)) {
          await openRewardTasks();
          chrome.tabs.onUpdated.removeListener(listener);
        }
      }
      chrome.tabs.onUpdated.addListener(listener);
    });
  }
});
