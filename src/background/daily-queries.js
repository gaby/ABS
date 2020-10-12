const dailyTrendQueries = [];
const usedDailyQueries = new Set();
(() => {
  try {
    function handleResult(result) {
      // 6 is to remove the malformed `)]}', ` at the beginning of the response
      const json = JSON.parse(result.substring(6));
      dailyTrendQueries.push(...json.default.trendingSearchesDays.map(day => {
        return day.trendingSearches.map(search => search.title.query.toLowerCase());
      }).flat().filter(q => q));
    }
    // fetch the last X days to get a fair number of queries to pull from
    for (let i = 0; i < constants.NUM_DAILY_TREND_FETCHES; i++) {
      // don't worry about timezone shifts here. shouldn't matter if we're off by a day on the API calls.
      let date = new Date(Date.now() - i * constants.ONE_DAY_MILLIS);
      date = date.toISOString();
      date = date.substring(0, date.indexOf('T')).replace(/-/g, '');
      fetch(`${constants.CORS_PROXY_URL}${constants.DAILY_TRENDS_API}&ed=${date}`)
        .then(r => r.text())
        .then(handleResult);
    }
  } catch (err) {
    // log the error, but do nothing and default to the hardcoded queries
    console.error(err);
  }
})();
