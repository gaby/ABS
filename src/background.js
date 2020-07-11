// grab this once at the top of the background script so that we don't keep randomly changing mobile user agents in the middle of a search blitz
const mobileUserAgent = getRandomElement(constants.MOBILE_USER_AGENTS);
const edgeUserAgent = constants.EDGE_USER_AGENT;

// default to false, and hook preferences, but do not get the intial ones (it will most likely be true from the last time we did searches)
const prefs = {
  activelySearchingMobile: false,
};
hookPreferences(['activelySearchingMobile'], prefs);

chrome.webRequest.onBeforeSendHeaders.addListener(details => {
  for (let i = 0; i < details.requestHeaders.length; i++) {
    if (details.requestHeaders[i].name === 'User-Agent') {
      if (prefs.activelySearchingMobile) {
        details.requestHeaders[i].value = mobileUserAgent;
      } else {
        details.requestHeaders[i].value = edgeUserAgent;
      }
    }
  }
  return { requestHeaders: details.requestHeaders };
}, {
  urls: ['https://www.bing.com/*'],
}, ['blocking', 'requestHeaders']);
