document.addEventListener(constants.MESSAGE_TYPES.OPEN_URL_IN_BACKGROUND, e => {
  chrome.runtime.sendMessage({
    type: constants.MESSAGE_TYPES.OPEN_URL_IN_BACKGROUND,
    url: e.detail,
  });
});

injectScript('/content-scripts/window-open-injection/main.js');
