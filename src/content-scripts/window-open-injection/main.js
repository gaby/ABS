/**
 * This injection is useful for forcing the opened reward tasks to be in the background.
 */

function parseUrl(url) {
  if (url.startsWith('/')) {
    return `${window.location.origin}${url}`;
  }
  return url;
}

const windowOpen = window.open;
window.open = (url, windowName, windowFeatures) => {
  if (windowName === '_blank') {
    document.dispatchEvent(new CustomEvent(constants.MESSAGE_TYPES.OPEN_URL_IN_BACKGROUND, {
      detail: parseUrl(url),
    }));
  } else {
    windowOpen(url, windowName, windowFeatures);
  }
};
