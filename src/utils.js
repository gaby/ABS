function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function clearBadge() {
  chrome.browserAction.setBadgeText({ text: '' });
}
