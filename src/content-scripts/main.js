let correctAnswer;
let answerHashIV;
document.addEventListener(constants.MESSAGE_TYPES.CORRECT_ANSWER_RECEIVED, e => {
  correctAnswer = e.detail.correctAnswer;
  answerHashIV = e.detail.answerHashIV;
});

const prefs = { ...constants.DEFAULT_PREFERENCES };

function clickElement(e, checkVisibility = true) {
  if (!e) return;
  // e.offsetParent checks that the element (and its parents) do not have the style property 'display: none'
  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent
  // this will break if e has style property 'position: fixed', but that shouldn't happen
  if (!checkVisibility || e.offsetParent) e.click();
}

function clickOption(selector, parent = document) {
  const e = parent.querySelector(selector);
  if (e && e.getAttribute('data-serpquery')) clickElement(e, true);
}

function click(selector, parent = document) {
  const e = parent.querySelector(selector);
  clickElement(e);
}

function clickHidden(selector, parent = document) {
  const e = parent.querySelector(selector);
  clickElement(e, false);
}

function clickLoop() {
  if (prefs.autoClick) {
    click('#rqStartQuiz');
    clickOption('#currentQuestionContainer .b_cards[iscorrectoption=True]:not(.btsel)');
    clickOption(`#currentQuestionContainer .rqOption:not(.optionDisable)[data-option="${correctAnswer}"]`);
    clickOption('.bt_poll .btOption');

    // click the hidden element here since options are only available while the background is hidden.
    // once the background is not hidden, that means the results are being shown.
    clickHidden('#OptionBackground00.b_hide');
  
    // does not apply to this/that quizzes since the correct answer is hashed for that
    clickOption(`#currentQuestionContainer .btOptionCard[data-option="${correctAnswer}"]`);

    // for this/that quizzes:
    // either guess randomly or attempt the correct guess (only works on mobile view)
    // but at least give the option to guess randomly instead of forcing it to be correct
    // since this is a risky thing to get 100% correct
    if (prefs.randomGuesses) {
      // not actually random - just picks the first one
      clickOption('#currentQuestionContainer .btOptionCard');
    } else {
      // only works on mobile view
      click('.bt_correctOp');
      // for desktop view, compare the hashes of options to the hash of the correct answer we got from the window object
      const options = [...document.querySelectorAll('#currentQuestionContainer .btOptionCard')];
      const correctOption = options.find(option => correctAnswer && correctAnswer === quizAnswerHashFunction(answerHashIV, option.dataset.option));
      clickElement(correctOption);
    }

    click('#ListOfQuestionAndAnswerPanes div[id^=QuestionPane]:not(.wk_hideCompulsary) .wk_choicesInstLink');
  
    // this actually might not be necessary, but we can leave it in anyway
    click('#ListOfQuestionAndAnswerPanes div[id^=AnswerPane]:not(.b_hide) input[type=submit]');
  }
}

getStorage([
  'autoClick',
  'randomGuesses',
], prefs).then(() => {
  setInterval(clickLoop, constants.CLICK_DELAY);
});

hookStorage([
  'autoClick',
  'randomGuesses',
], prefs);
