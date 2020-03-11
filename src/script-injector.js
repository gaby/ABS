const s = document.createElement('script');
s.src = chrome.runtime.getURL('window-variable-grabber.js');
s.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);
