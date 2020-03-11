let correctAnswer;
document.addEventListener('CORRECT_ANSWER_RECEIVED', e => {
  correctAnswer = e.detail;
});

function clickOption(e) {
  if (e && e.getAttribute('data-serpquery')) e.click();
}

function click(e) {
  if (e) e.click();
}

function clickLoop() {
  const startPlaying = document.querySelector('#rqStartQuiz');
  click(startPlaying);

  // TODO: this only works if at least one option has already been clicked. need to figure out why.
  const multiSelectQuizOption = document.querySelector('#currentQuestionContainer .b_cards[iscorrectoption=True]:not(.btsel)');
  clickOption(multiSelectQuizOption);

  const whosOnTopQuizOption = document.querySelector(`#currentQuestionContainer .btOptionCard[data-option="${correctAnswer}"]`);
  clickOption(whosOnTopQuizOption);

  const singleSelectQuizOption = document.querySelector(`#currentQuestionContainer .rqOption:not(.optionDisable)[data-option="${correctAnswer}"]`);
  clickOption(singleSelectQuizOption);

  const pollOption = document.querySelector('.bt_poll .btOption');
  clickOption(pollOption);

  // for some reason, testYourSmartsOption.onmouseup returns null
  // as a workaround, parse the search URL from the attribute and manually go to it
  const testYourSmartsOption = document.querySelector('#ListOfQuestionAndAnswerPanes div[id^=QuestionPane]:not(.wk_hideCompulsary) .wk_paddingBtm');
  if (testYourSmartsOption) {
    let smartsLink = testYourSmartsOption.getAttribute('onmouseup');
    if (smartsLink) smartsLink = smartsLink.substring(smartsLink.indexOf('/search'), smartsLink.length - 2);
    window.location.href = `https://bing.com${smartsLink}`;
  }

  // this actually might not be necessary, but we can leave it in anyway
  const testYourSmartsNextQuestion = document.querySelector('#ListOfQuestionAndAnswerPanes div[id^=AnswerPane]:not(.b_hide) input[type=submit]');
  click(testYourSmartsNextQuestion);
}

const CLICK_DELAY = 500;
let clickInterval;

chrome.storage.local.get(['autoClick'], ({ autoClick }) => {
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
