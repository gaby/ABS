const DEFAULT_NUM_ITERATIONS = 30;
const DEFAULT_DELAY = 600;

function saveChanges() {
  chrome.storage.sync.set({
    numIterations: document.getElementById('numIterations').value,
    delay: document.getElementById('delay').value,
  });
}

function startSearches(numIterations, delay) {
  const search = (() => {
    let count = 0;
    return () => {
      chrome.tabs.update({
        url: `https://bing.com?q=${Math.random().toString(36).substr(2)}`,
      });
      return ++count;
    };
  })();

  search();
  const interval = setInterval(() => {
    if (search() >= numIterations) clearInterval(interval);
  }, delay);
}

function reset() {
  document.getElementById('numIterations').value = DEFAULT_NUM_ITERATIONS;
  document.getElementById('delay').value = DEFAULT_DELAY;
  saveChanges();
}

// load the saved values from the Chrome extension storage API
chrome.storage.sync.get(['numIterations', 'delay'], function(result) {
  const numIterations = result['numIterations'] || DEFAULT_NUM_ITERATIONS;
  const delay = result['delay'] || DEFAULT_DELAY;
  document.getElementById('numIterations').value = numIterations;
  document.getElementById('delay').value = delay;
});

document.getElementById('numIterations').addEventListener('input', saveChanges);
document.getElementById('delay').addEventListener('input', saveChanges);
document.getElementById('go').addEventListener('click', () => {
  startSearches(
    document.getElementById('numIterations').value,
    document.getElementById('delay').value,
  );
});
document.getElementById('reset').addEventListener('click', reset);
