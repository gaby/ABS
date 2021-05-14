let dailyTrendQueries = [];
// the is the set of available queries which can be used future queries
// and this set should be reset upon it becoming empty (reuse past queries)
let availableQueries = [];
// store usedQueries as a JSON hash map instead of Set or Array for efficiency
// and because chrome.storage will not serialize a Set object
let usedQueries = {};

function addToAvailableQueries(queries) {
  availableQueries = removeDuplicates(availableQueries.concat(queries));
}

function getCustomQueriesArray(queries) {
  return queries.trim().split('\n').filter(q => q);
}

async function updateQueries() {
  await prefsLoaded;

  availableQueries = [];
  if (prefs.searchWithCustomQueries) {
    addToAvailableQueries(getCustomQueriesArray(prefs.customQueries));
  }
  if (prefs.searchWithDailyTrends) {
    addToAvailableQueries(dailyTrendQueries);
  }

  remove(availableQueries, q => usedQueries[q]);
}

async function fetchDailyTrendQueries() {
  try {
    function handleResult(result) {
      // 6 is to remove the malformed `)]}', ` at the beginning of the response
      const json = JSON.parse(result.substring(6));
      return json.default.trendingSearchesDays.map(day => {
        return day.trendingSearches.map(search => search.title.query.toLowerCase());
      }).flat().filter(q => q);
    }

    // fetch the last X days to get a fair number of queries to pull from
    const results = await Promise.all(
      new Array(constants.NUM_DAILY_TREND_FETCHES).fill().map((_, i) => {
        // don't worry about timezone shifts here. shouldn't matter if we're off by a day on the API calls.
        let date = new Date(Date.now() - i * constants.ONE_DAY_MILLIS);
        date = date.toISOString();
        date = date.substring(0, date.indexOf('T')).replace(/-/g, '');
        return fetch(`${constants.DAILY_TRENDS_API}&ed=${date}`)
          .then(r => {
            if (!r.ok) throw new Error('Fetching daily queries failed');
            return r.text();
          })
      }),
    );
    dailyTrendQueries = results.map(handleResult).flat();
    setStorage('lastDailyTrendFetch', Date.now());
    setStorage('dailyTrendQueries', dailyTrendQueries);
    // fetch again in 1 day
    chrome.alarms.create(constants.ALARMS.FETCH_DAILY_TRENDS, {
      periodInMinutes: constants.ONE_DAY_MINS,
    });
  } catch (err) {
    // log the error, but do nothing and default to the hardcoded queries
    console.error(err);
  }
}

const queriesAreAvailable = getStorage(['lastDailyTrendFetch', 'dailyTrendQueries', 'usedQueries']).then(async res => {
  usedQueries = res.usedQueries || {};
  if (!res.lastDailyTrendFetch || Date.now() - res.lastDailyTrendFetch > constants.ONE_DAY_MILLIS) {
    await fetchDailyTrendQueries();
  } else {
    dailyTrendQueries = res.dailyTrendQueries;
  }
  await updateQueries();
});

async function addUsedQuery(query) {
  await queriesAreAvailable;

  usedQueries[query] = true;
  setStorage('usedQueries', usedQueries);

  remove(availableQueries, q => q === query);
  // reset the available queries when empty
  if (availableQueries.length === 0) {
    usedQueries = {};
    setStorage('usedQueries', usedQueries);
    updateQueries();
  }
}

function isQueryUsed(query) {
  return usedQueries && usedQueries[query];
}

function getRandomLetters() {
  return Math.random().toString(36).substr(2);
}

async function getSearchQuery() {
  await prefsLoaded;

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

hookStorage(['customQueries', 'searchWithCustomQueries', 'searchWithDailyTrends', 'searchWithTemplates'].map(key => ({
  key,
  cb: updateQueries,
})));

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name === constants.ALARMS.FETCH_DAILY_TRENDS) {
    await fetchDailyTrendQueries();
    updateQueries();
  }
});
