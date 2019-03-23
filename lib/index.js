const ora = require('ora');
const chalk = require('chalk');

const crawl = require('./crawl');
const History = require('./history');

const CITY_ID = 3974;
const BEGINNING_OF_TIME = '2014-02-05';
const searchQueries = ['Popal'];

function generateUrl({
  cityId,
  doNationWideSearch = false,
  searchQuery,
  date = BEGINNING_OF_TIME
}) {
  /**
   * Example url for given search query in city on the current date:
   * https://www.verlorenofgevonden.nl/gevonden-voorwerpen?q=&date=2019-02-05&city=3974
   */
  return `https://www.verlorenofgevonden.nl/gevonden-voorwerpen?${
    doNationWideSearch ? '' : `city=${cityId}`
  }&q=${searchQuery}&date=${date}`;
}

const searchQuery = searchQueries[0];
const queryHistoryKey = searchQuery.toLowerCase();
const previousSearch = History.getHistoryByQuery(queryHistoryKey);

console.log('HAS MY BIKE BEEN FOUND?');
(function logPreviousSearch() {
  if (previousSearch.searchDate) {
    return console.log(
      chalk.dim(
        `Last search was done on: ${new Date(
          previousSearch.searchDate
        ).toLocaleString()}\n`
      )
    );
  }
  console.log(
    chalk.dim(
      `No previous search for: ${searchQuery} has been done in the past.\n`
    )
  );
})();

const url = generateUrl({
  cityId: CITY_ID,
  doNationWideSearch: true,
  searchQuery: searchQueries[0],
  date: '2019-23-03'
});

const launchingBrowserSpinner = ora(
  `Starting search for: '${searchQueries.join("', '")}'`
);
const resultsSpinner = ora('Determining how many results to scrape');
let lazyLoadingSpinner = null;

let totalScrapeAmount = null;

const crawlerObservable = crawl(url);
launchingBrowserSpinner.start();

function onBrowserStarted() {
  launchingBrowserSpinner.succeed();
  resultsSpinner.start();
}

function onResultsAmount(amountOfResults) {
  totalScrapeAmount = amountOfResults;
  resultsSpinner.succeed();
  ora().info(`Website will be scraped for: ${amountOfResults} results`);
  lazyLoadingSpinner = ora({
    text: `Scraping website for: ${amountOfResults} results`
  }).start();
}

function onUpdateProgress(found) {
  lazyLoadingSpinner.text = `Scraping website for: ${totalScrapeAmount} results (${found}/${totalScrapeAmount})`;
}

function onScrapingCompleted(data) {
  // TODO: update with scraped and parsed results length
  const foundResults = data.length;
  if (foundResults === totalScrapeAmount) {
    lazyLoadingSpinner.succeed(
      totalScrapeAmount + ' results scraped successfully!'
    );
  }

  History.persistHistoryForQuery(queryHistoryKey, {
    ...previousSearch,
    searchDates: [...previousSearch.searchDates, new Date()]
  });
}

crawlerObservable.subscribe(
  ({ event, data }) => {
    if (event === 'browser-started') {
      onBrowserStarted();
    } else if (event === 'results-amount-scraped') {
      onResultsAmount(data);
    } else if (event === 'update-progress') {
      onUpdateProgress(data);
    } else if (event === 'scraping-completed') {
      onScrapingCompleted(data);
    } else {
      console.log(`Unknown event ${event}`);
    }
  },
  console.error,
  () => console.log('\nDone')
);