const fs = require("fs");
const Logger = require("./logger.js");
const Login = require("./login.js");
const School = require("./school.js");
const SubmitForm = require("./submit-form.js");

global.logger = new Logger("warning");

class Main {
  load_config() {
    const path = require("path"), yaml = require("js-yaml");
    const file_path = path.join(__dirname, "../config.yaml");
    if (!fs.existsSync(file_path)) {
      fs.copyFileSync(path.join(__dirname, "../config-example.yaml"), file_path);
      logger.warning('Create Configuration File "config.yaml"!')
    }
    this.config = yaml.load(fs.readFileSync(file_path).toString());
    if (!this.config["login_info"]["school_name"] ||
      !this.config["login_info"]["username"] ||
      !this.config["login_info"]["password"]) {
      logger.error('Please Complete the Configuration File "config.yaml" First!');
      process.exit(-1);
    }
  }

  async start() {
    this.load_config();
    logger.set_level(this.config["log_level"]);
    this.cookieJar = new (require('tough-cookie')).CookieJar();

    this.school = new School(this.config);
    this.school_url = await this.school.getSchoolUrl();

    this.login = new Login(this.config, this.cookieJar, this.school_url);
    await this.login.login();

    this.submitForm = new SubmitForm(this.cookieJar, this.school_url);
    await this.submitForm.checkAndPostForm();
  }

  run() {
    this.start().catch(logger.error);
  }
}

module.exports = Main;