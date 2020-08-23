function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function fillBadge() {
  chrome.browserAction.setBadgeText({ text: constants.BADGE_TEXT });
  chrome.browserAction.setBadgeBackgroundColor({ color: constants.BADGE_COLOR });
}

function clearBadge() {
  chrome.browserAction.setBadgeText({ text: '' });
}
