const constants = Object.freeze({
  ONE_DAY_MILLIS: 24 * 60 * 60 * 1000,
  BADGE_COLOR: '#F41A22',
  BADGE_REMINDER_TEXT: '!',
  CLICK_DELAY: 500,
  DEFAULT_PREFERENCES: Object.freeze({
    numIterations: 35,
    delay: 1000,
    autoClick: true,
    randomGuesses: false,
    randomSearch: false,
    randomSearchDelayMin: 1000,
    randomSearchDelayMax: 3500,
    randomSearchIterationsMin: 35,
    randomSearchIterationsMax: 42,
    randomLettersSearch: false,
    blitzSearch: false,
    platformSpoofing: 'desktop-and-mobile',
  }),
  MESSAGE_TYPES: Object.freeze({
    SPOOF_USER_AGENT: 0,
    ACTIVELY_SEARCHING_MOBILE: 1,
    SET_LAST_SEARCH: 2,
  }),
  CORS_PROXY_URL: 'https://cors-anywhere-mikeyaworski.herokuapp.com/',
  DAILY_TRENDS_API: 'https://trends.google.com/trends/api/dailytrends?geo=US',
  NUM_DAILY_TREND_FETCHES: 4,
  // TODO: add more user agents
  MOBILE_USER_AGENTS: Object.freeze([
    'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.85 Mobile Safari/537.36 Edg/84.0.522.35',
  ]),
  EDGE_USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.85 Safari/537.36 Edg/84.0.522.35',
});
