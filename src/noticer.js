const axios = require("axios");
const qs = require("querystring");

class Noticer {
  constructor(config) {
    this.enable = config.enable;
    this.key = config["secret_key"];
  }

  async sendNoticer(title, content) {
    if (!this.enable) return null
    const res = await axios.post(`https://sc.ftqq.com/${this.key}.send`, qs.stringify({
      text: title,
      desp: content
    }));
    return res.data;
  }
}

module.exports = Noticer;