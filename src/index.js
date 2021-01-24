const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const Logger = require("./logger.js");
const School = require("./school.js");
const Task = require("./task.js");

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
    for (const user of this.config["users"]) {
      if (!user["school_name"] || !user["username"] || !user["password"]) {
        logger.error("请完成配置文件 config.yaml");
        process.exit(-1);
      }
    }
    logger.info("加载配置文件成功!");
  }

  async init() {
    this.loadConfig();
    logger.info(`日志等级切换为: ${this.config["log_level"]}`);
    logger.set_level(this.config["log_level"]);
    this.school = new School(this.config);
    await this.school.getSchoolsList();
    this.tasks = this.config["users"].map(user => new Task(this.config, user, this.school));
  }

  run() {
    this.init().then(() => {
      this.tasks.forEach(task => task.start());
    }).catch(logger.error);
  }
}

module.exports = Main;