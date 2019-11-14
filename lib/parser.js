const cheerio = require("cheerio");
const Torrent = require("./torrent");

class Parser {
  constructor(host) {
    this.host = host || "http://rutracker.org";
  }

  parseSearch(rawHtml) {
    const $ = cheerio.load(rawHtml, { decodeEntities: false });
    const results = [];
    const tracks = $("#tor-tbl tbody").find("tr");
    tracks.each((i, elem) => {
      const $tr = $(elem);
      const document = $tr.find("td:first-child");
      const state = document.next();
      const category = state.next();
      const title = category.next();
      const author = title.next();
      const size = author.next();
      const seeds = size.next();
      const leeches = seeds.next();
      const downloads = leeches.next();
      const registered = downloads.next();

      const topicLink = title.find("div a");
      let id = 0;
      if (topicLink) {
        id =
          topicLink.data("topic_id") ||
          topicLink
            .attr("href")
            .split("=")
            .reverse()[0];
      }
      // Handle case where search has no results
      if (id) {
        const torrent = new Torrent({
          state: state.attr("title"),
          id: `${id}`,
          category: category.find("a").text(),
          title: title.find("div a").text(),
          author: author.find("a").text(),
          size: Number(size.data("ts_text") || size.find("u").text()),
          seeds: Number(seeds.find("b").text()),
          leeches: Number(leeches.find("b").text()),
          downloads: Number(downloads.text()),
          registered: new Date(
            Number(registered.data("ts_text") || registered.find("u").text()) *
              1000
          ),
          host: this.host
        });

        results.push(torrent);
      }
    });

    return results;
  }

  parseMagnetLink(rawHtml) {
    const $ = cheerio.load(rawHtml, { decodeEntities: false });

    return $(".magnet-link").attr("href");
  }
}

module.exports = Parser;
