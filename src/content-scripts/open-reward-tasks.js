function clickElement(e, checkVisibility = true) {
  if (!e) return;
  // e.offsetParent checks that the element (and its parents) do not have the style property 'display: none'
  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent
  // this will break if e has style property 'position: fixed', but that shouldn't happen
  if (!checkVisibility || e.offsetParent) e.click();
}

function clickAll(selector, parent = document) {
  const elements = [...parent.querySelectorAll(selector)];
  elements.forEach(e => clickElement(e, true));
}

// scope this in a function so we can inject this script multiple times
(() => {
  // This timeout lets us queue our clicks until after the page has had time to inject window.open.
  // This is only reproducible in Firefox as far as I'm aware.
  setTimeout(() => {
    const cards = [...document.querySelectorAll('mee-card')];
    if (cards.length) {
      cards.forEach(card => {
        if (card.querySelector('.mee-icon-AddMedium')) {
          clickAll('a.c-call-to-action', card);
        }
      });
    }
  }, 0);
})();
