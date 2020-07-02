const iterationCount = document.getElementById('iteration-count');
const iterationCountWrapper = document.getElementById('iteration-count-wrapper');

function saveChanges() {
  chrome.storage.local.set({
    numIterations: document.getElementById('num-iterations').value,
    delay: document.getElementById('delay').value,
    autoClick: document.getElementById('auto-click').checked,
  });
}

function getSearchQuery() {
  return Math.random().toString(36).substr(2);
}

let searchInterval;
function startSearches(numIterations, delay) {
  clearInterval(searchInterval);
  const search = (() => {
    let count = 0;
    return () => {
      const query = getSearchQuery();
      chrome.tabs.update({
        url: `https://bing.com/search?q=${query}`,
      });
      return ++count;
    };
  })();

  search();
  iterationCount.innerText = numIterations - 1;
  iterationCountWrapper.style = 'display: flex;';

  searchInterval = setInterval(() => {
    const count = search();
    if (count >= numIterations) {
      clearInterval(searchInterval);
      iterationCount.innerText = '';
      iterationCountWrapper.style = 'display: none;';
    } else {
      iterationCount.innerText = numIterations - count;
    }
  }, delay);
}

function reset() {
  document.getElementById('num-iterations').value = constants.DEFAULTS.NUM_ITERATIONS;
  document.getElementById('delay').value = constants.DEFAULTS.DELAY;
  saveChanges();
}

// load the saved values from the Chrome storage API
chrome.storage.local.get(['numIterations', 'delay', 'autoClick'], result => {
  document.getElementById('num-iterations').value = result.numIterations || constants.DEFAULTS.NUM_ITERATIONS;
  document.getElementById('delay').value = result.delay || constants.DEFAULTS.DELAY;
  // value could be false, in which case the shortcut || operator would evaluate to the default (not intended)
  document.getElementById('auto-click').checked = result.autoClick === undefined ? constants.DEFAULTS.AUTO_CLICK : result.autoClick;
});

document.getElementById('num-iterations').addEventListener('input', saveChanges);
document.getElementById('delay').addEventListener('input', saveChanges);
document.getElementById('auto-click').addEventListener('change', saveChanges);

document.getElementById('search').addEventListener('click', () => {
  startSearches(
    document.getElementById('num-iterations').value,
    document.getElementById('delay').value,
  );
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
