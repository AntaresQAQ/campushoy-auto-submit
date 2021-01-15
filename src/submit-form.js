const fs = require("fs");
const qs = require("querystring");
const axios = require("axios");
require("axios-cookiejar-support").default(axios);


class SubmitForm {
  constructor(cookieJar, school_url) {
    this.cookieJar = cookieJar;
    this.school_url = school_url;
  }

  async getForms() {
    const res = await axios.post(this.school_url +
      "/wec-counselor-collector-apps/stu/collector/queryCollectorProcessingList", {
      pageSize: 6,
      pageNumber: 1
    }, {
      headers: {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/81.0.4044.122 Safari/537.36",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Connection": "Keep-Alive",
        "X-Requested-With": "XMLHttpRequest"
      },
      jar: this.cookieJar,
      withCredentials: true
    });
  }

  async checkAndPostForm() {
    await this.getForms();
  }

}

module.exports = SubmitForm;