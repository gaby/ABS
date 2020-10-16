const mobileUserAgent = getRandomElement(constants.MOBILE_USER_AGENTS);
const edgeUserAgent = constants.EDGE_USER_AGENT;

let spoofUserAgent = false;
let doMobileSearches = false;

// TODO: have these functions set storage values, instead of local variables, once we
// rewrite this to be a non-persisted script (currently persisted due to blocking web requests)
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
