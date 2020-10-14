function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Returns a new array without duplicates. Does not modify original array.
 */
function removeDuplicates(list) {
  return list.reduce((acc, element) => {
    if (element && !acc.includes(element)) return [...acc, element];
    return acc;
  }, []);
}

/**
 * Modifies the original array and whenever predicateFn returns true (given an array element),
 * it removes that element from the array
 */
function remove(array, predicateFn) {
  for (let i = array.length - 1; i > -1; i--) {
    if (predicateFn(array[i])) array.splice(i, 1);
  }
}

function clearBadge() {
  chrome.browserAction.setBadgeText({ text: '' });
}

function getCurrentTab() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      resolve(tabs[0]);
    });
  });
}

function getDateFromTime(time) {
  const date = new Date();
  const [hourStr, minStr] = time.split(':');
  date.setHours(Number(hourStr), Number(minStr), 0);
  return date;
}

function getMidnightDate() {
  const date = new Date();
  date.setHours(0, 0, 0);
  return date;
}
