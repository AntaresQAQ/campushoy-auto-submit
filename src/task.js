const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const schedule = require('node-schedule');
const moment = require("moment");
const Login = require("./login.js");
const Forms = require("./forms.js");
const Noticer = require("./noticer.js");

class Task {
  constructor(config, user, school) {
    this.config = config;
    this.school = school;
    this.user = user;
  }

  async loadFormsConfig() {
    const form_config_dir = path.join(__dirname, "../forms");
    if (!fs.existsSync(form_config_dir)) {
      fs.mkdirSync(form_config_dir, {recursive: true});
    }
    const filename = `${this.user["school_name"]}-${this.user["username"]}.yaml`;
    const form_config_path = path.join(form_config_dir, filename);
    if (!fs.existsSync(form_config_path)) {
      if (!await this.login.login()) process.exit(-1);
      const config = await this.forms.generateConfig();
      if (!config.length) {
        logger.error(`用户 ${this.user["school_name"]} ${this.user["username"]} 的今日校园内没有待填写的收集表，请等待收集表发布`);
        process.exit(-1);
      }
      const config_file = yaml.dump(config);
      fs.writeFileSync(form_config_path, config_file);
      logger.warning(`表单配置文件已生成，请完成 ${filename}`);
      process.exit(0);
    }
    const config = yaml.load(fs.readFileSync(form_config_path).toString());
    logger.info(`加载表单配置文件 ${filename} 成功`);
    return config;
  }

  async taskHandle(task) {
    logger.info(`用户 ${this.user["school_name"]} ${this.user["username"]} 开始执行计划任务`);
    let result = await task.login.login();
    if (!result) {
      result = await task.noticer.sendNoticer("账号登录失败",
        `登录失败，本次提交任务终止，请检查服务器状态并及时提交`);
      if (result) {
        if (result["errmsg"] === "success") {
          logger.info(`用户 ${this.user["school_name"]} ${this.user["username"]} Server酱消息推送成功`);
        } else {
          logger.warning(`用户 ${this.user["school_name"]} ${this.user["username"]} Server酱消息推送失败 msg=${result["errmsg"]}`);
        }
      }
      logger.warning(`用户 ${this.user["school_name"]} ${this.user["username"]} 登录失败，本次任务终止`);
      logger.info(`用户 ${this.user["school_name"]} ${this.user["username"]} 下次表单提交时间：` +
        moment(new Date(task.job.nextInvocation())).format("YYYY-MM-DD HH:mm:ss"));
      return;
    }
    const results = await task.forms.submit(task.forms_config, task.config["login_info"].username);
    let content = "表单列表推送信息:\n\n";
    results.forEach(form => {
      content += `- ${form.title} ${form.succeed ? "成功" : "失败"} INFO:${form.message}\n`
    });
    result = await task.noticer.sendNoticer("表单提交通知", content);
    if (result) {
      if (result["errmsg"] === "success") {
        logger.info(`Server酱消息推送成功`);
      } else {
        logger.warning(`Server酱消息推送失败 msg=${result["errmsg"]}`);
      }
    }
    logger.info(`用户 ${this.user["school_name"]} ${this.user["username"]} 计划任务结束`);
    logger.info(`用户 ${this.user["school_name"]} ${this.user["username"]} 下次表单提交时间：` +
      moment(new Date(task.job.nextInvocation())).format("YYYY-MM-DD HH:mm:ss"));
  }

  async init() {
    logger.info(`初始化用户 ${this.user["school_name"]} ${this.user["username"]}`);
    this.noticer = new Noticer(this.user.noticer);
    this.cookieJar = new (require('tough-cookie')).CookieJar();
    this.school_url = await this.school.getSchoolUrl(this.user["school_name"]);
    this.login = new Login(this.config, this.user, this.cookieJar, this.school_url);
    this.forms = new Forms(this.cookieJar, this.school_url);
    this.forms_config = await this.loadFormsConfig();
  }

  start() {
    this.init().then(() => {
      this.job = schedule.scheduleJob(this.user["cron"], async () => await this.taskHandle(this));
      logger.info(`用户 ${this.user["school_name"]} ${this.user["username"]} 下次表单提交时间：` +
        moment(new Date(this.job.nextInvocation())).format("YYYY-MM-DD HH:mm:ss"));
    }).catch(e => logger.error(e));
  }
}


module.exports = Task;