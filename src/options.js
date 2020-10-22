// id is HTML id attribute
// elementKey is how to get the value of that element (depends on type of input)
// preferenceKey the is key in chrome storage and constants.DEFAULT_PREFERENCES
const preferenceBindings = [
  { id: 'random-letters-search', elementKey: 'checked', preferenceKey: 'randomLettersSearch' },
  { id: 'custom-queries', elementKey: 'value', preferenceKey: 'customQueries' },
  { id: 'search-with-custom-queries', elementKey: 'checked', preferenceKey: 'searchWithCustomQueries' },
  { id: 'search-with-daily-trends', elementKey: 'checked', preferenceKey: 'searchWithDailyTrends' },
  { id: 'search-with-templates', elementKey: 'checked', preferenceKey: 'searchWithTemplates' },
  { id: 'schedule-daily-searches', elementKey: 'checked', preferenceKey: 'scheduleSearches' },
  { id: 'scheduled-time', elementKey: 'value', preferenceKey: 'scheduledTime' },
  { id: 'scheduled-time-open-reward-tasks', elementKey: 'checked', preferenceKey: 'scheduledTimeOpensRewardTasks' },
];

// id is HTML id attribute
// eventType is the type of event to listen for
// fn is what to run when the event occurs (defaults to saveChanges)
const changeBindings = [
  { id: 'random-letters-search', eventType: 'change' },
  { id: 'custom-queries', eventType: 'input' },
  { id: 'search-with-custom-queries', eventType: 'change' },
  { id: 'search-with-daily-trends', eventType: 'change' },
  { id: 'search-with-templates', eventType: 'change' },
  { id: 'schedule-daily-searches', eventType: 'change' },
  { id: 'scheduled-time', eventType: 'change' },
  { id: 'scheduled-time-open-reward-tasks', eventType: 'change' },
];

function saveChanges() {
  const newPreferences = preferenceBindings.reduce((acc, binding) => ({
    ...acc,
    [binding.preferenceKey]: document.getElementById(binding.id)[binding.elementKey],
  }), {});
  setStorage(newPreferences);
}

getStorage(
  preferenceBindings.map(({ id, elementKey, preferenceKey }) => ({
    key: preferenceKey,
    cb: value => {
      // value could be false, in which case the shortcut || operator
      // would evaluate to the default (not intended)
      document.getElementById(id)[elementKey] = value === undefined
        ? constants.DEFAULT_PREFERENCES[preferenceKey]
        : value;
    },
  })),
);

changeBindings.forEach(({ id, eventType }) => {
  document.getElementById(id).addEventListener(eventType, saveChanges);
});

