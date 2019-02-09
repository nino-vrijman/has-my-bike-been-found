const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const ora = require('ora');
const chalk = require('chalk');

const CITY_ID = 3974;
const BEGINNING_OF_TIME = '2014-02-05';
const searchQueries = ['Popal'];

const WORD_ART = (() => {
  const title = 'HAS MY BIKE BEEN FOUND?'
  const pad = (amount, character) => `${character || ' '}`.repeat(amount);
  const LINE_LENGTH = 8 + title.length + 8;
  return `${pad(LINE_LENGTH)}
${pad((LINE_LENGTH - title.length) / 2)}${title}${pad((LINE_LENGTH - title.length) / 2)}
${pad(17)}(probably not)${pad(8)}
${pad(LINE_LENGTH)}`;
})();

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
  console.log(chalk.black.bgYellow(WORD_ART));
  console.log(chalk.dim(`Last search was done on: ${new Date()}\n`));

  const launchingBrowserSpinner = ora(
    `Searching for: '${searchQueries.join("', '")}'`
  ).start();
  const browser = await puppeteer.launch();
  launchingBrowserSpinner.succeed();
  const resultsSpinner = ora('Determining how many results to scrape').start();
  const page = await browser.newPage();
  await page.goto(
    generateUrl({
      cityId: CITY_ID,
      doNationWideSearch: true,
      searchQuery: searchQueries[0]
    })
  );
  const amountOfResults = await (async () => {
    const pageContent = await page.content();
    const landing$ = cheerio.load(pageContent);
    const amountHeadingText = landing$('.search-results')
      .parent('.column-content')
      .children('h1')
      .first()
      .text();
    return parseInt(/([\d]+)\s/.exec(amountHeadingText)[0].trim(), 10);
  })();

  if (isNaN(amountOfResults)) {
    throw new Error("Couldn't determine amount of results");
  }

  resultsSpinner.succeed();
  ora().info(`Website will be scraped for: ${amountOfResults} results`);
  const lazyLoadingSpinner = ora({
    text: `Scraping website for: ${amountOfResults} results`
  }).start();

  /**
   * Handle lazy loading: https://intoli.com/blog/scrape-infinite-scroll/
   */
  let previousScrollHeight;
  let found = 0;
  while (found < amountOfResults) {
    previousScrollHeight = await page.evaluate('document.body.scrollHeight');
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await page.waitForFunction(
      `document.body.scrollHeight > ${previousScrollHeight}`
    );
    found = await page.evaluate(
      () => document.querySelectorAll('.search-results li').length
    );
    lazyLoadingSpinner.text = `Scraping website for: ${amountOfResults} results (${found}/${amountOfResults})`;
  }

  const $ = cheerio.load(await page.content());

  if ($('.search-results li').length === amountOfResults) {
    lazyLoadingSpinner.succeed(`${amountOfResults} results scraped successfully!`);
    await browser.close();
  } else {
    process.on('exit', async () => await browser.close());
  }
})();
