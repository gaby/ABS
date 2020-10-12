let activePort = null;

chrome.runtime.onConnect.addListener(port => {
  activePort = port;
  port.onMessage.addListener(async msg => {
    switch (msg.type) {
      case constants.MESSAGE_TYPES.START_SEARCH: {
        stopSearches();
        const tab = await getCurrentTab();
        updateLastSearch();
        startSearches(tab.id);
        break;
      }
      case constants.MESSAGE_TYPES.STOP_SEARCH: {
        stopSearches();
        break;
      }
      default: {
        break;
      }
    }
  });
  port.onDisconnect.addListener(() => {
    activePort = null;
  });
});

chrome.runtime.onMessage.addListener((msg, sender, cb) => {
  switch(msg.type) {
    case constants.MESSAGE_TYPES.GET_SEARCH_COUNTS: {
      if (setSearchCounts) setSearchCounts();
      break;
    }
    default: break;
  }
});
