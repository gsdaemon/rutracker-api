const Parser = require("./lib/parser");
const PageProvider = require("./lib/page-provider");

class RutrackerApi {
  constructor({ host = "http://rutracker.org", username, password }) {
    this.authInfo = { username, password };
    this.parser = new Parser(host);
    this.pageProvider = new PageProvider(host);
  }

  login({ username, password } = {}) {
    if (!username || !password) {
      ({username, password} = this.authInfo);
    }
    return this.pageProvider.login(username, password);
  }

  search({ query, sort, order, cats }) {
    return this.pageProvider
      .search({ query, sort, order, cats })
      .then(html => this.parser.parseSearch(html));
  }

  download(id) {
    return this.pageProvider.torrentFile(id);
  }

  getMagnetLink(id) {
    return this.pageProvider
      .thread(id)
      .then(html => this.parser.parseMagnetLink(html));
  }
}

module.exports = RutrackerApi;
