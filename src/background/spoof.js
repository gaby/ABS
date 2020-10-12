const mobileUserAgent = getRandomElement(constants.MOBILE_USER_AGENTS);
const edgeUserAgent = constants.EDGE_USER_AGENT;

let spoofUserAgent = false;
let doMobileSearches = false;

function spoof(value) {
  spoofUserAgent = value;
}

function mobileSpoof(value) {
  doMobileSearches = value;
}

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
