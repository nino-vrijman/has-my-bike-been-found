const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

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
  if (doNationWideSearch && cityId) {
    console.log(
      'Both cityId and doNationWideSearch were specified, executing nationwide search...'
    );
  }
  return `https://www.verlorenofgevonden.nl/gevonden-voorwerpen?${
    doNationWideSearch ? '' : `city=${cityId}`
  }&q=${searchQuery}&date=${date}`;
};

(async () => {
  const browser = await puppeteer.launch();
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

  /**
   * Handle lazy loading: https://intoli.com/blog/scrape-infinite-scroll/
   */
  let previousScrollHeight;
  while (
    (await page.evaluate(
      () => document.querySelectorAll('.search-results li').length
    )) < amountOfResults
  ) {
    previousScrollHeight = await page.evaluate('document.body.scrollHeight');
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await page.waitForFunction(
      `document.body.scrollHeight > ${previousScrollHeight}`
    );
  }

  const $ = cheerio.load(await page.content());

  if ($('.search-results li').length === amountOfResults) {
    console.log(`Found all ${amountOfResults} results!`);
    await browser.close();
  } else {
    process.on('exit', async () => await browser.close());
  }
})();
