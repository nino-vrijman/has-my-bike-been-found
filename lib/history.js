const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const writeFileAsync = promisify(fs.writeFile);

const HISTORY_FILE_PATH = './history.json';

const EMPTY_SEARCH_QUERY_HISTORY = {
  results: []
};

const history = fs.readFileSync(path.join(__dirname, HISTORY_FILE_PATH), {
  encoding: 'utf-8'
});

/**
 * Get's the history of previously executed searches.
 */
function getHistory() {
  return require(HISTORY_FILE_PATH);
}

/**
 * Get's the history of a specific search query previously executed.
 * @param {String} query
 * @returns {Object} The history object of the previously executed search.
 */
function getHistoryByQuery(query) {
  const history = getHistory();
  return history.queries
    ? history.queries[query] || EMPTY_SEARCH_QUERY_HISTORY
    : EMPTY_SEARCH_QUERY_HISTORY;
}

/**
 *
 * @param {*} query
 * @param {*} data
 */
async function persistHistoryForQuery(query, data) {
  const history = getHistory();
  history.queries = {
    ...history.queries,
    [query]: data
  };
  await writeFileAsync(
    path.join(__dirname, HISTORY_FILE_PATH),
    JSON.stringify(history, null, 2),
    {
      flag: 'w+'
    }
  );
}

module.exports = {
  getHistory,
  getHistoryByQuery,
  persistHistoryForQuery
};
