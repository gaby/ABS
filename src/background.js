// grab this once at the top of the background script so that we don't keep randomly changing mobile user agents in the middle of a search blitz
const mobileUserAgent = getRandomElement(constants.MOBILE_USER_AGENTS);
const edgeUserAgent = constants.EDGE_USER_AGENT;

let spoofUserAgent = false;
let doMobileSearches = false;
chrome.runtime.onConnect.addListener(port => {
  spoofUserAgent = true;
  port.onMessage.addListener(msg => {
    switch (msg.type) {
      case constants.MESSAGE_TYPES.ACTIVELY_SEARCHING_MOBILE: {
        doMobileSearches = msg.value;
        break;
      }
      case msg.type === constants.MESSAGE_TYPES.SPOOF_USER_AGENT: {
        spoofUserAgent = msg.value;
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
  for (let i = 0; i < details.requestHeaders.length; i++) {
    if (details.requestHeaders[i].name === 'User-Agent' && spoofUserAgent) {
      if (doMobileSearches) {
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
