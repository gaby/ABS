let correctAnswer;
document.addEventListener('CORRECT_ANSWER_RECEIVED', e => {
  correctAnswer = e.detail;
});

let shouldOpenRewardTasks;
chrome.runtime.onMessage.addListener((request, sender, cb) => {
  switch(request.type) {
    case 'OPEN_REWARD_TASKS': {
      shouldOpenRewardTasks = true;
      break;
    }
    default: {
      break;
    }
  }
  cb(null);
});

let randomGuesses;

function clickOption(selector, parent = document) {
  const e = parent.querySelector(selector);
  if (e && e.getAttribute('data-serpquery')) e.click();
}

function clickElement(e) {
  // e.offsetParent checks that the element (and its parents) do not have the style property 'display: none'
  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent
  // this will break if e has style property 'position: fixed', but that shouldn't happen
  if (e && e.offsetParent) e.click();
}

function click(selector, parent = document) {
  const e = parent.querySelector(selector);
  clickElement(e);
}

function clickAll(selector, parent = document) {
  const elements = [...parent.querySelectorAll(selector)];
  elements.forEach(clickElement);
}

function clickLoop() {
  if (shouldOpenRewardTasks) {
    const cards = [...document.querySelectorAll('mee-card')];
    if (cards.length) {
      // we're actually on the rewards page now, so no need to keep trying to open tasks after this attempt
      shouldOpenRewardTasks = false;
      cards.forEach(card => {
        if (card.querySelector('.mee-icon-AddMedium')) {
          clickAll('a.c-call-to-action', card);
        }
      });
    }
  }

  click('#rqStartQuiz');
  clickOption('#currentQuestionContainer .b_cards[iscorrectoption=True]:not(.btsel)');
  clickOption(`#currentQuestionContainer .rqOption:not(.optionDisable)[data-option="${correctAnswer}"]`);
  clickOption('.bt_poll .btOption');
  click('#OptionBackground00.b_hide');

  // TODO: this doesn't work anymore for "this or that" because the window variable doesn't have the same value as the data-option
  // so we are just going to arbitrarily guess the first one we see if the random guess preference is selected
  clickOption(`#currentQuestionContainer .btOptionCard[data-option="${correctAnswer}"]`);
  if (randomGuesses) clickOption('#currentQuestionContainer .btOptionCard');

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

let clickInterval;

chrome.storage.local.get(['autoClick', 'randomGuesses'], results => {
  // value could be false, in which case the shortcut || operator would evaluate to the default (not intended)
  randomGuesses = results.randomGuesses === undefined ? constants.DEFAULTS.RANDOM_GUESSES : results.randomGuesses;
  const autoClick = results.autoClick === undefined ? constants.DEFAULTS.AUTO_CLICK : results.autoClick;
  if (autoClick) {
    clickInterval = setInterval(clickLoop, constants.CLICK_DELAY);
  }
});

chrome.storage.onChanged.addListener(changes => {
  if (changes.autoClick) {
    if (changes.autoClick.newValue) {
      clickInterval = setInterval(clickLoop, constants.CLICK_DELAY);
    } else {
      clearInterval(clickInterval);
    }
  }
  if (changes.randomGuesses) {
    randomGuesses = changes.randomGuesses.newValue;
  }
});
