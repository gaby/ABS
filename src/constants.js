const constants = Object.freeze({
  ONE_DAY_MILLIS: 24 * 60 * 60 * 1000,
  BADGE_COLOR: '#F41A22',
  BADGE_TEXT: '!',
  CLICK_DELAY: 500,
  DEFAULT_PREFERENCES: Object.freeze({
    NUM_ITERATIONS: 35,
    DELAY: 1000,
    AUTO_CLICK: true,
    RANDOM_GUESSES: false,
    RANDOM_SEARCH: false,
    RANDOM_SEARCH_DELAY_MINIMUM: 1000,
    RANDOM_SEARCH_DELAY_MAXIMUM: 3500,
    RANDOM_SEARCH_ITERATIONS_MINIMUM: 35,
    RANDOM_SEARCH_ITERATIONS_MAXIMUM: 42,
    RANDOM_LETTERS_SEARCH: false,
    BLITZ_SEARCH: false,
    PLATFORM_SPOOFING: 'desktop-and-mobile',
  }),
  MESSAGE_TYPES: Object.freeze({
    SPOOF_USER_AGENT: 0,
    ACTIVELY_SEARCHING_MOBILE: 1,
    SET_LAST_SEARCH: 2,
  }),
  CORS_PROXY_URL: 'https://cors-anywhere.herokuapp.com/',
  DAILY_TRENDS_API: 'https://trends.google.com/trends/api/dailytrends?geo=US',
  NUM_DAILY_TREND_FETCHES: 4,
  // TODO: add more user agents
  MOBILE_USER_AGENTS: [
    'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.85 Mobile Safari/537.36 Edg/84.0.522.35',
  ],
  EDGE_USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.85 Safari/537.36 Edg/84.0.522.35',
});
