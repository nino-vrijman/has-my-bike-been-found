const ora = require('ora');
const chalk = require('chalk');

const crawl = require('./crawl');
const History = require('./history');

const CITY_ID = 3974;
const BEGINNING_OF_TIME = '2014-02-05';
const searchQueries = ['Popal'];

const generateUrl = ({
  cityId,
  doNationWideSearch = false,
  searchQuery,
  date = BEGINNING_OF_TIME
}) => {
  /**
   * Example url for given search query in city on the current date:
   * https://www.verlorenofgevonden.nl/gevonden-voorwerpen?q=&date=2019-02-05&city=3974
   */
  return `https://www.verlorenofgevonden.nl/gevonden-voorwerpen?${
    doNationWideSearch ? '' : `city=${cityId}`
  }&q=${searchQuery}&date=${date}`;
};

(async () => {
  const searchQuery = searchQueries[0];
  const queryHistoryKey = searchQuery.toLowerCase();
  const previousSearch = History.getHistoryByQuery(queryHistoryKey);

  if (process.env.IS_DRY_RUN) {
  }

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
    searchQuery: searchQueries[0]
  });

  // const crawlObservable = crawl(url)

  const launchingBrowserSpinner = ora(
    `Starting search for: '${searchQueries.join("', '")}'`
  ).start();
  // await browser launch

  launchingBrowserSpinner.succeed();
  const resultsSpinner = ora('Determining how many results to scrape').start();

  // await amount of results
  const amountOfResults = 1337;

  resultsSpinner.succeed();
  ora().info(`Website will be scraped for: ${amountOfResults} results`);
  const lazyLoadingSpinner = ora({
    text: `Scraping website for: ${amountOfResults} results`
  }).start();

  // await progress of amount of results scraped
  lazyLoadingSpinner.text = `Scraping website for: ${amountOfResults} results (${found}/${amountOfResults})`;

  // await scraped and parsed results
  // TODO: update with scraped and parsed results length
  // const foundResults = $('.search-results li').length;
  const foundResults = 1;
  if (foundResults === amountOfResults) {
    lazyLoadingSpinner.succeed(`${amountOfResults} results scraped successfully!`);
    // await browser closed
  } else {
    // await scraping canceled
  }

  History.persistHistoryForQuery(queryHistoryKey, {
    ...previousSearch,
    searchDates: [...previousSearch.searchDates, new Date()]
  });
})();
