let correctAnswer;
document.addEventListener('CORRECT_ANSWER_RECEIVED', e => {
  correctAnswer = e.detail;
});

function clickOption(selector) {
  const e = document.querySelector(selector);
  if (e && e.getAttribute('data-serpquery')) e.click();
}

function click(selector) {
  const e = document.querySelector(selector);
  if (e) e.click();
}

function clickLoop() {
  click('#rqStartQuiz');
  // TODO: this only works if at least one option has already been clicked. need to figure out why.
  clickOption('#currentQuestionContainer .b_cards[iscorrectoption=True]:not(.btsel)');
  // TODO: this doesn't work anymore for "this or that" because the window variable doesn't have the same value as the data-option
  clickOption(`#currentQuestionContainer .btOptionCard[data-option="${correctAnswer}"]`);
  clickOption(`#currentQuestionContainer .rqOption:not(.optionDisable)[data-option="${correctAnswer}"]`);
  clickOption('.bt_poll .btOption');
  click('#OptionBackground00.b_hide');

  // for some reason, testYourSmartsOption.onmouseup returns null
  // as a workaround, parse the search URL from the attribute and manually go to it
  const testYourSmartsOption = document.querySelector('#ListOfQuestionAndAnswerPanes div[id^=QuestionPane]:not(.wk_hideCompulsary) .wk_paddingBtm');
  if (testYourSmartsOption) {
    let smartsLink = testYourSmartsOption.getAttribute('onmouseup');
    if (smartsLink) {
      const startIndex = smartsLink.indexOf('/search');
      if (startIndex !== -1) {
        smartsLink = smartsLink.substring(startIndex, smartsLink.length - 2);
        window.location.href = `https://bing.com${smartsLink}`;
      }
    }
  }

  // this actually might not be necessary, but we can leave it in anyway
  click('#ListOfQuestionAndAnswerPanes div[id^=AnswerPane]:not(.b_hide) input[type=submit]');
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
