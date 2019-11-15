const { URL, URLSearchParams } = require("url");
const { AuthorizationError, NotAuthorizedError } = require("./errors");
const {
  orderMiddleware,
  queryMiddleware,
  categoryMiddleware,
  sortMiddleware
} = require("./middlewares");
const { decodeWindows1251 } = require("./utils");
const axios = require("axios");

class PageProvider {
  constructor(host) {
    this.authorized = false;
    this.request = axios;
    this.cookie = null;
    this.host = host || "http://rutracker.org";
    this.loginUrl = `${this.host}/forum/login.php`;
    this.searchUrl = `${this.host}/forum/tracker.php`;
    this.threadUrl = `${this.host}/forum/viewtopic.php`;
    this.downloadUrl = `${this.host}/forum/dl.php`;

    this.searchMiddlewares = [
      queryMiddleware,
      categoryMiddleware,
      sortMiddleware,
      orderMiddleware
    ];
  }

  setCookies(response) {
    if (response.headers && response.headers["set-cookie"]) {
      [this.cookie] = response.headers["set-cookie"];
    }
  }

  getHeaders(referer = this.host, id = null) {
    let { cookie } = this;
    if (id) {
      cookie += `; bb_dl=${id}`;
    }
    return {
      Cookie: cookie,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
      "Accept-Encoding": "gzip, deflate",
      "Accept-Language":
        "en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7,de;q=0.6,ro;q=0.5",
      DNT: 1,
      Referer: referer,
      Host: this.host.substr(this.host.indexOf("://") + 3),
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": 1,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36"
    };
  }

  login(username, password) {
    const body = new URLSearchParams();

    body.append("login_username", username);
    body.append("login_password", password);
    body.append("login", "Вход");

    return this.request({
      url: this.loginUrl,
      method: "POST",
      data: body.toString(),
      maxRedirects: 0,
      validateStatus(status) {
        return status === 302;
      }
    })
      .then(response => {
        this.setCookies(response);
        this.authorized = true;

        return true;
      })
      .catch(() => {
        throw new AuthorizationError();
      });
  }

  search(params) {
    if (!this.authorized) {
      return Promise.reject(new NotAuthorizedError());
    }

    const url = new URL(this.searchUrl);
    const body = new URLSearchParams();

    try {
      this.searchMiddlewares.forEach(middleware => {
        middleware(params, body, url);
      });
    } catch (err) {
      return Promise.reject(err);
    }

    return this.request({
      url: url.toString(),
      data: body.toString(),
      method: "POST",
      responseType: "arraybuffer",
      headers: this.getHeaders(this.searchUrl)
    }).then(response => {
      this.setCookies(response);
      return decodeWindows1251(response.data);
    });
  }

  thread(id) {
    if (!this.authorized) {
      return Promise.reject(new NotAuthorizedError());
    }

    const url = `${this.threadUrl}?t=${encodeURIComponent(id)}`;

    return this.request({
      url,
      method: "GET",
      responseType: "arraybuffer",
      headers: this.getHeaders(this.searchUrl)
    }).then(response => {
      this.setCookies(response);
      return decodeWindows1251(response.data);
    });
  }

  torrentFile(id) {
    if (!this.authorized) {
      return Promise.reject(new NotAuthorizedError());
    }

    const url = `${this.downloadUrl}?t=${encodeURIComponent(id)}`;

    return this.request({
      url,
      method: "GET",
      responseType: "stream",
      headers: this.getHeaders(
        `${this.threadUrl}?t=${encodeURIComponent(id)}`,
        id
      )
    }).then(response => response.data);
  }
}

module.exports = PageProvider;
