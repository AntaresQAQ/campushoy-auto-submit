const axios = require("axios");
const {URL} = require("url");

class School {
  constructor(config) {
    this.config = config;
    this.schools_list = [];
    this.school_id = null;
    this.school_info = null;
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
  }

  async getSchoolUrl() {
    logger.debug("Getting Schools List...");
    await this.getSchoolsList();
    logger.debug(`Successfully Get ${this.schools_list.length} Schools`);
    this.findSchoolId();
    logger.debug(`Your School ID is "${this.school_id}"`);
    await this.getSchoolInfo();
    const ids_url = new URL(this.school_info["idsUrl"]);
    logger.debug(`Your School URL is ${ids_url.host}`);
    return ids_url.origin;
  }
}

module.exports = School;