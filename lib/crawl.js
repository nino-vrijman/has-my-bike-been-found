const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const { Observable } = require('rxjs');

console.log(Observable);

async function crawl(url) {
  const browser = await puppeteer.launch();
  // notify browser launched
  
  const page = await browser.newPage();
  await page.goto(url);
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
  // notify amounts

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
    // notify progress amount of results scraped
  }

  const $ = cheerio.load(await page.content());
  // scrape & parse results, notify with scraped and parsed results

  process.on('exit', async () => await browser.close());
}

module.exports = crawl;