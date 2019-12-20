
function click(e) {
  if (e && e.getAttribute('data-serpquery')) e.click();
}

function clickLoop() {
  // TODO: this only works if at least one option has already been clicked. need to figure out why.
  const unselectedOption = document.querySelector('.b_cards[iscorrectoption=True]:not(.btsel)');
  click(unselectedOption);

  const pollOption = document.querySelector('.bt_poll .btOption');
  click(pollOption);
}

const CLICK_DELAY = 500;
let clickInterval;

chrome.storage.sync.get(['autoClick'], ({ autoClick }) => {
  if (autoClick) {
    clickInterval = setInterval(clickLoop, CLICK_DELAY);
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.autoClick) {
    if (changes.autoClick.newValue) {
      clickInterval = setInterval(clickLoop, CLICK_DELAY);
    } else {
      clearInterval(clickInterval);
    }
  }
});
