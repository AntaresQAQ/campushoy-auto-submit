const axios = require("axios");
require("axios-cookiejar-support").default(axios);
const qs = require("querystring");
const FuckCaptcha = require("./fuckcaptcha.js");

function sleep(x) {
  return new Promise(resolve => setTimeout(resolve, x))
}

class Login {
  constructor(config, cookieJar) {
    this.config = config;
    this.cookieJar = cookieJar;
    this.schools_list = [];
    this.school_id = null;
    this.school_info = null;
    this.lt = null;
  }

  async getSchoolsList() {
    const res = await axios.get("https://static.campushoy.com/apicache/tenantListSort");
    if (res.data["errCode"] !== 0) {
      logger.error(`Can Not Get Schools List: ${res.data["errMsg"]}`);
      return;
    }
    res.data["data"].forEach((section) => {
      this.schools_list.push(...section["datas"]);
    });
  }

  findSchoolId() {
    const school = this.schools_list.find(
      value => value.name === this.config["login_info"]["school_name"]);
    if (!school) {
      logger.error("您的学校名称错误或学校未加入今日校园，请核实信息！");
      return;
    }
    this.school_id = school.id;
  }

  async getSchoolInfo() {
    const res = await axios.get("https://mobile.campushoy.com/v6/config/guest/tenant/info", {
      params: {ids: this.school_id}
    });
    if (res.data["errCode"] !== 0) {
      logger.error(`Can Not Get Schools Info: ${res.data["errMsg"]}`);
      return
    }
    this.school_info = res.data["data"][0];
    this.ids_url = res.data["data"][0]["idsUrl"];
  }

  async getLt() {
    const res = await axios.get(this.ids_url + "/login", {
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
    this.lt = /_2lBepC=([^&]+)/g.exec(res.request.path)[1];
  }

  async getCaptcha() {
    const res = await axios.get(this.ids_url + "/generateCaptcha", {
      params: {ltId: this.lt},
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
      withCredentials: true,
      responseType: "arraybuffer"
    });
    return Buffer.from(res.data, "binary");
  }

  async postLoginData() {
    const {username, password, retry_times} = this.config["login_info"];
    let login_counter = 0;
    let need_captcha = false;
    while (true) {
      if (login_counter) {
        logger.info(`正在重新登录... 重试第${login_counter}次`);
      }
      let captcha = null;
      if (need_captcha) {
        const image = await this.getCaptcha();
        captcha = await this.fuckCaptcha.capreg(image.toString("base64"));
      }
      const body = qs.stringify({
        username,
        password,
        mobile: "",
        dllt: "",
        captcha: captcha ? captcha.result : "",
        rememberMe: false,
        lt: this.lt
      });
      const {data} = await axios.post(this.ids_url + "/doLogin", body, {
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
      const result = data["resultCode"];
      need_captcha = data["needCaptcha"];
      if (result === "REDIRECT") {
        logger.info(`用户 ${username} 登录成功`);
        return true;
      }
      login_counter++;
      if (result === "CAPTCHA_NOTMATCH") {
        logger.warning("用户登录验证码错误");
        if (captcha) {
          await this.fuckCaptcha.capjust(captcha.request_id);
        }
      } else if (result === "LT_NOTMATCH") {
        logger.warning("LT不匹配");
      } else if (result === "FAIL_UPNOTMATCH") {
        logger.warning("账户密码不匹配");
      } else {
        logger.warning("未知错误，请检查账户是否可用");
      }
      if (login_counter > retry_times) {
        logger.error(`用户 ${username} 登录失败`);
        return false;
      }
      await sleep(1000);
    }
  }

  async login() {
    this.fuckCaptcha = new FuckCaptcha(this.config.captcha.pd_id, this.config.captcha.pd_key);
    logger.debug("Getting Schools List...");
    await this.getSchoolsList();
    logger.info(`Successfully Get ${this.schools_list.length} Schools`);
    this.findSchoolId();
    logger.info(`Your School ID is "${this.school_id}"`);
    await this.getSchoolInfo();
    await this.getLt();
    await this.postLoginData();
  }
}

module.exports = Login;