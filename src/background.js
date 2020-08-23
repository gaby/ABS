let searchReminderTimeout;
function updateTimeout() {
  getStorage([{
    key: 'lastSearch',
    cb: lastSearch => {
      clearTimeout(searchReminderTimeout);
      const timeSinceLastSearch = Date.now() - lastSearch;
      if (timeSinceLastSearch < constants.ONE_DAY_MILLIS) {
        clearBadge();
        searchReminderTimeout = setTimeout(fillBadge, constants.ONE_DAY_MILLIS - timeSinceLastSearch);
      } else {
        fillBadge();
      }
    }
  }])
}
updateTimeout();

// grab this once at the top of the background script so that we don't keep randomly changing mobile user agents in the middle of a search blitz
const mobileUserAgent = getRandomElement(constants.MOBILE_USER_AGENTS);
const edgeUserAgent = constants.EDGE_USER_AGENT;

let spoofUserAgent = false;
let doMobileSearches = false;

// listen for messages on a port connection from the popup
// these messages will let us know if we should spoof
// the User-Agent headers to appear on another platform
chrome.runtime.onConnect.addListener(port => {
  spoofUserAgent = true;
  port.onMessage.addListener(msg => {
    switch (msg.type) {
      case constants.MESSAGE_TYPES.ACTIVELY_SEARCHING_MOBILE: {
        doMobileSearches = msg.value;
        break;
      }
      case constants.MESSAGE_TYPES.SPOOF_USER_AGENT: {
        spoofUserAgent = msg.value;
        break;
      }
      case constants.MESSAGE_TYPES.SET_LAST_SEARCH: {
        setStorage('lastSearch', msg.value).then(() => {
          updateTimeout();
        });
        break;
      }
      default: {
        break;
      }
    }
  });
  port.onDisconnect.addListener(() => {
    spoofUserAgent = false;
    doMobileSearches = false;
  });
});

chrome.webRequest.onBeforeSendHeaders.addListener(details => {
  const { requestHeaders } = details;
  requestHeaders.forEach(header => {
    if (header.name === 'User-Agent' && spoofUserAgent) {
      if (doMobileSearches) header.value = mobileUserAgent;
      else header.value = edgeUserAgent;
    }
  });
  return { requestHeaders };
}, {
  urls: ['https://*.bing.com/*'],
}, ['blocking', 'requestHeaders']);
