const iterationCount = document.getElementById('iteration-count');
const iterationCountWrapper = document.getElementById('iteration-count-wrapper');

function saveChanges() {
  chrome.storage.local.set({
    numIterations: document.getElementById('num-iterations').value,
    delay: document.getElementById('delay').value,
    autoClick: document.getElementById('auto-click').checked,
    randomGuesses: document.getElementById('random-guesses').checked,
    randomLetters: document.getElementById('random-letters-search').checked,
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
chrome.storage.local.get(['numIterations', 'delay', 'autoClick', 'randomGuesses', 'randomLetters'], result => {
  document.getElementById('num-iterations').value = result.numIterations || constants.DEFAULTS.NUM_ITERATIONS;
  document.getElementById('delay').value = result.delay || constants.DEFAULTS.DELAY;
  // value could be false, in which case the shortcut || operator would evaluate to the default (not intended)
  document.getElementById('auto-click').checked = result.autoClick === undefined ? constants.DEFAULTS.AUTO_CLICK : result.autoClick;
  document.getElementById('random-guesses').checked = result.randomGuesses === undefined ? constants.DEFAULTS.RANDOM_GUESSES : result.randomGuesses;
  document.getElementById('random-letters-search').checked = result.randomLetters === undefined ? constants.DEFAULTS.RANDOM_LETTERS : result.randomLetters;
});

document.getElementById('num-iterations').addEventListener('input', saveChanges);
document.getElementById('delay').addEventListener('input', saveChanges);
document.getElementById('auto-click').addEventListener('change', saveChanges);
document.getElementById('random-guesses').addEventListener('change', saveChanges);
document.getElementById('random-letters-search').addEventListener('change', saveChanges);

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
