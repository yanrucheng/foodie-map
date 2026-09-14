/** Browser downloads belong to the explicit browser:install step, not npm ci. */
module.exports = {
  cacheDirectory: `${__dirname}/node_modules/.cache/puppeteer`,
  skipDownload: true,
};
