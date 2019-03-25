const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const { Observable } = require('rxjs');

function crawl(url) {
  return new Observable(async subscriber => {
    const browser = await puppeteer.launch();
    process.on('exit', async () => await browser.close());
    subscriber.next({ event: 'browser-started' });

    const page = await browser.newPage();
    await page.goto(url);
    const amountOfResults = await (async () => {
      const pageContent = await page.content();
      const $landing = cheerio.load(pageContent);
      const amountHeadingText = $landing('.search-results')
        .parent('.column-content')
        .children('h1')
        .first()
        .text();
      return parseInt(/([\d]+)\s/.exec(amountHeadingText)[0].trim(), 10);
    })();

    if (isNaN(amountOfResults)) {
      throw new Error("Couldn't determine amount of results");
    }
    subscriber.next({ event: 'results-amount-scraped', data: amountOfResults });

    /**
     * Handle lazy loading: https://intoli.com/blog/scrape-infinite-scroll/
     */
    let previousScrollHeight;
    let found = await page.evaluate(
      () => document.querySelectorAll('.search-results li').length
    );
    subscriber.next({ event: 'update-progress', data: found });
    while (found < amountOfResults) {
      previousScrollHeight = await page.evaluate('document.body.scrollHeight');
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForFunction(
        `document.body.scrollHeight > ${previousScrollHeight}`
      );
      found = await page.evaluate(
        () => document.querySelectorAll('.search-results li').length
      );
      subscriber.next({ event: 'update-progress', data: found });
    }
    subscriber.next({ event: 'scraping-completed', data: found });
    
    const $ = cheerio.load(await page.content());
    

    subscriber.complete();
  });
}

module.exports = crawl;
