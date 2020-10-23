function injectScript(url) {
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL(url);
  s.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(s);
}

injectScript('constants.js');
