// the is the set of available queries which can be used future queries
// and this set should be reset upon it becoming empty (reuse past queries)
let availableQueries = [];

let customQueries = [];
let dailyTrendQueries = [];

function addToAvailableQueries(queries) {
  availableQueries = removeDuplicates(availableQueries.concat(queries));
}

function getCustomQueriesArray(queries) {
  return queries.trim().split('\n').filter(q => q);
}

function updateQueries() {
  availableQueries = [];
  if (prefs.searchWithCustomQueries) {
    addToAvailableQueries(getCustomQueriesArray(prefs.customQueries));
  }
  if (prefs.searchWithDailyTrends) {
    addToAvailableQueries(dailyTrendQueries);
  }
}

function fetchDailyTrendQueries() {
  dailyTrendQueries = [];
  try {
    function handleResult(result) {
      // 6 is to remove the malformed `)]}', ` at the beginning of the response
      const json = JSON.parse(result.substring(6));
      dailyTrendQueries.push(...json.default.trendingSearchesDays.map(day => {
        return day.trendingSearches.map(search => search.title.query.toLowerCase());
      }).flat().filter(q => q));
      addToAvailableQueries(dailyTrendQueries);
    }
    // fetch the last X days to get a fair number of queries to pull from
    for (let i = 0; i < constants.NUM_DAILY_TREND_FETCHES; i++) {
      // don't worry about timezone shifts here. shouldn't matter if we're off by a day on the API calls.
      let date = new Date(Date.now() - i * constants.ONE_DAY_MILLIS);
      date = date.toISOString();
      date = date.substring(0, date.indexOf('T')).replace(/-/g, '');
      fetch(`${constants.CORS_PROXY_URL}${constants.DAILY_TRENDS_API}&ed=${date}`)
        .then(r => r.text())
        .then(handleResult)
        .then(updateQueries);
    }
  } catch (err) {
    // log the error, but do nothing and default to the hardcoded queries
    console.error(err);
  }
}
// re-fetch the daily trend queries every day
fetchDailyTrendQueries();
setInterval(fetchDailyTrendQueries, constants.ONE_DAY_MILLIS);

const queryPrefKeys = ['customQueries', 'searchWithCustomQueries', 'searchWithDailyTrends', 'searchWithTemplates'];
getStorage(queryPrefKeys).then(updateQueries);
hookStorage(queryPrefKeys.map(key => ({
  key,
  cb: updateQueries,
})));

// a redundant set of used queries (for performance) which contain the queries removed from availableQueries
const usedQueries = new Set();
function addUsedQuery(query) {
  usedQueries.add(query);
  remove(availableQueries, q => q === query);
  // reset the available queries when empty
  if (availableQueries.length === 0) updateQueries();
}
function isQueryUsed(query) {
  return usedQueries.has(query);
}

function getRandomLetters() {
  return Math.random().toString(36).substr(2);
}

function getSearchQuery() {
  if (prefs.randomLettersSearch) return getRandomLetters();

  // try using an available query. if there are none, just fallback to the hardcoded queries
  if (availableQueries.length) {
    const query = getRandomElement(availableQueries);
    addUsedQuery(query);
    return query;
  }

  if (!prefs.searchWithTemplates) return getRandomLetters();

  const queryTemplate = getRandomElement(queryTemplates);
  const variables = queryTemplate.template.match(/(\$\d+)/g); // variables are $1, $2, ... where the digit is the ID of the variable
  const query = variables.reduce((acc, variable, i) => {
    const type = queryTemplate.types[i];
    const value = getRandomElement(types[type]);
    return acc.replace(variable, value);
  }, queryTemplate.template);

  return query;
}
