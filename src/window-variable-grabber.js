/**
 * Lightweight, similar to Lodash's _.get, but without most of the safety conditions
 *
 * @param {Object} obj
 * @param {Array} path
 */
function get(obj, path) {
  let result = obj;
  path.forEach(junction => {
    if (!result) return null;
    result = result[junction];
  });
  return result;
}

// grab the correct answer from the window object
setInterval(() => {
  document.dispatchEvent(new CustomEvent('CORRECT_ANSWER_RECEIVED', {
    detail: get(window, ['_w', 'rewardsQuizRenderInfo', 'correctAnswer']),
  }));
}, 500);