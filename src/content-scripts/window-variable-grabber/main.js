/**
 * Lightweight, similar to Lodash's _.get, but without most of the safety conditions
 *
 * @param {Object} obj
 * @param {Array} path
 */
function get(obj, path) {
  let result = obj;
  path.forEach(junction => {
    if (!result) return;
    result = result[junction];
  });
  return result;
}

// grab the correct answer from the window object
setInterval(() => {
  document.dispatchEvent(new CustomEvent(constants.MESSAGE_TYPES.CORRECT_ANSWER_RECEIVED, {
    detail: {
      correctAnswer: get(window, ['rewardsQuizRenderInfo', 'correctAnswer']),
      answerHashIV: get(window, ['_G', 'IG']),
    },
  }));
}, 500);
