const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const schedule = require('node-schedule');
const moment = require("moment");
const Logger = require("./logger.js");
const Login = require("./login.js");
const School = require("./school.js");
const Forms = require("./forms.js");
const Noticer = require("./noticer.js");

global.logger = new Logger();

class Main {
  loadConfig() {
    const file_path = path.join(__dirname, "../config.yaml");
    if (!fs.existsSync(file_path)) {
      fs.copyFileSync(path.join(__dirname, "../config-example.yaml"), file_path);
      logger.warning("配置文件已生成，请完成 config.yaml");
      process.exit(0);
    }
    this.config = yaml.load(fs.readFileSync(file_path).toString());
    if (!this.config["login_info"]["school_name"] ||
      !this.config["login_info"]["username"] ||
      !this.config["login_info"]["password"]
    ) {
      logger.error("请完成配置文件 config.yaml");
      process.exit(-1);
    }
    logger.info("加载配置文件成功!");
  }

  async loadFormsConfig() {
    if (!await this.login.login()) process.exit(-1);
    const form_config_path = path.join(__dirname, "../forms.yaml");
    if (!fs.existsSync(form_config_path)) {
      const config = await this.forms.generateConfig();
      const config_file = yaml.dump(config);
      fs.writeFileSync(form_config_path, config_file);
      logger.warning("表单配置文件已生成，请完成 forms.yaml");
      process.exit(0);
    }
    const config = yaml.load(fs.readFileSync(form_config_path).toString());
    logger.info("加载表单配置文件成功");
    if (!await this.forms.fillForms(config)) {
      process.exit(-1);
    }
    logger.info("配置文件检查无误");
    return config;
  }

  async taskHandle() {
    logger.info("开始执行计划任务");
    let result = await this.login.login();
    if (!result) {
      result = await this.noticer.sendNoticer("账号登录失败",
        "账号登录失败，本次提交任务终止，请检查服务器状态并及时提交");
      if (result) {
        if (result["errmsg"] === "success") {
          logger.info(`Server酱消息推送成功`);
        } else {
          logger.warning(`Server酱消息推送失败 msg=${result["errmsg"]}`);
        }
      }
      logger.info("登录失败，本次任务终止");
      logger.info("下次表单提交时间：" +
        moment(new Date(this.job.nextInvocation())).format("YYYY-MM-DD HH:mm:ss"));
      return;
    }
    const results = await this.forms.submit(this.forms_config, this.config["login_info"].username);
    let content = "表单列表推送信息:\n\n";
    results.forEach(form => {
      content += `- ${form.title} ${form.succeed ? "成功" : "失败"} INFO:${form.message}\n`
    });
    result = await this.noticer.sendNoticer("表单提交通知", content);
    if (result) {
      if (result["errmsg"] === "success") {
        logger.info(`Server酱消息推送成功`);
      } else {
        logger.warning(`Server酱消息推送失败 msg=${result["errmsg"]}`);
      }
    }
    logger.info("计划任务结束");
    logger.info("下次表单提交时间：" +
      moment(new Date(this.job.nextInvocation())).format("YYYY-MM-DD HH:mm:ss"));
  }

  async init() {
    this.loadConfig();
    logger.info(`日志等级切换为: ${this.config["log_level"]}`);
    logger.set_level(this.config["log_level"]);
    this.noticer = new Noticer(this.config["noticer"]);
    this.cookieJar = new (require('tough-cookie')).CookieJar();

    this.school = new School(this.config);
    this.school_url = await this.school.getSchoolUrl();

    this.login = new Login(this.config, this.cookieJar, this.school_url);
    this.forms = new Forms(this.cookieJar, this.school_url);
    this.forms_config = await this.loadFormsConfig();
  }

  run() {
    this.init().then(() => {
      this.job = schedule.scheduleJob(this.config["cron"], this.taskHandle);
      logger.info("下次表单提交时间：" +
        moment(new Date(this.job.nextInvocation())).format("YYYY-MM-DD HH:mm:ss"));
    }).catch(e => logger.error(e));

  }
}

module.exports = Main;