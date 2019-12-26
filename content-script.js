
function clickOption(e) {
  if (e && e.getAttribute('data-serpquery')) e.click();
}

function click(e) {
  if (e) e.click();
}

function clickLoop() {
  // TODO: this only works if at least one option has already been clicked. need to figure out why.
  const multiSelectQuizOption = document.querySelector('.b_cards[iscorrectoption=True]:not(.btsel)');
  clickOption(multiSelectQuizOption);

  const startPlaying = document.querySelector('#rqStartQuiz');
  click(startPlaying);

  const singleSelectQuizOption = document.querySelector('#currentQuestionContainer .rqOption:not(.optionDisable)');
  clickOption(singleSelectQuizOption);

  const pollOption = document.querySelector('.bt_poll .btOption');
  clickOption(pollOption);
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
