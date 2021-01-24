const axios = require("axios");
const UUID = require("uuid");
const CryptoJS = require("crypto-js");
require("axios-cookiejar-support").default(axios);

function DESEncrypt(data) {
  const key = CryptoJS.enc.Utf8.parse("b3L26XNL");
  const iv = CryptoJS.enc.Hex.parse("0102030405060708");
  return CryptoJS.DES.encrypt(data, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  }).toString();
}

class Forms {
  constructor(cookieJar, school_url) {
    this.cookieJar = cookieJar;
    this.school_url = school_url;
  }

  async getForms() {
    logger.debug("Start Get Forms...");
    const headers = {
      "Accept": "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/81.0.4044.122 Safari/537.36",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "zh-CN,zh;q=0.9",
      "Connection": "Keep-Alive",
      "X-Requested-With": "XMLHttpRequest"
    };
    const res1 = await axios.post(this.school_url +
      "/wec-counselor-collector-apps/stu/collector/queryCollectorProcessingList", {
      pageSize: 6,
      pageNumber: 1
    }, {
      headers,
      jar: this.cookieJar,
      withCredentials: true
    });
    const rows = res1.data["datas"]["rows"];
    logger.debug(`Successfully Get ${rows.length} Forms`);
    const forms = [];
    for (const row of rows) {
      const collect_wid = row['wid'];
      const form_wid = row['formWid'];
      const res2 = await axios.post(this.school_url +
        "/wec-counselor-collector-apps/stu/collector/detailCollector", {
        collectorWid: collect_wid
      }, {
        headers,
        jar: this.cookieJar,
        withCredentials: true
      });
      const title = res2.data['datas']["form"]["formTitle"];
      const school_task_wid = res2.data['datas']['collector']['schoolTaskWid'];
      const res3 = await axios.post(this.school_url +
        "/wec-counselor-collector-apps/stu/collector/getFormFields", {
        pageSize: 100,
        pageNumber: 1,
        formWid: form_wid,
        collectorWid: collect_wid,
      }, {
        headers,
        jar: this.cookieJar,
        withCredentials: true
      });
      const form = res3.data['datas']['rows'];
      logger.debug(`Successfully get from ${title} ${form.length} fields`);
      forms.push({title, collect_wid, form_wid, school_task_wid, form});
    }
    logger.debug("Get Forms Finished");
    return forms;
  }

  async generateConfig() {
    logger.debug("Start Generate Config...");
    const forms = await this.getForms();
    const config = [];
    forms.forEach(value => {
      const form = value.form;
      const item = form.map(value1 => {
        const type = value1["fieldType"];
        let field = {
          type,
          required: value1["isRequired"] === 1,
          title: value1.title
        };
        if (!field.required) {
          field.enable = false;
        }
        if (type === 2) {
          const options = value1["fieldItems"];
          field.options = [];
          for (const opt of options) {
            field.options.push(opt.content);
            if (opt["isSelected"] === 1) {
              field.answer = opt.content;
            }
          }
          if (!field.answer) field.answer = null;
        } else if (type === 3) {
          const options = value1["fieldItems"];
          field.options = [];
          field.answer = [];
          for (const opt of options) {
            field.options.push(opt.content);
            if (opt["isSelected"] === 1) {
              field.answer.push(opt.content);
            }
          }
        } else {
          field.answer = value1.value;
        }
        return field;
      });
      config.push({
        title: value.title,
        enable: true,
        form: item,
        address: "",
        position: {
          lon: 0.00,
          lat: 0.00
        }
      });
    });
    logger.debug("Generate Config Finished");
    return config;
  }

  async fillForms(config) {
    logger.debug("Start Fill Forms...");
    if (typeof config !== "object") {
      logger.error("错误的配置文件格式");
      return null;
    }
    const forms = await this.getForms();
    for (let i = 0; i < Math.min(forms.length, config.length); i++) {
      const config_form = config[i];
      forms[i].enable = config_form.enable;
      forms[i].address = config_form.address;
      forms[i].position = config_form.position;
      if (config_form.enable) {
        const form = forms[i].form;
        if (config_form.form.length !== form.length) {
          logger.error(`配置文件 Form:${i} 缺少项`);
          return null;
        }
        for (let j1 = 0, j2 = 0; j1 < config_form.form.length; j1++, j2++) {
          const config_item = config_form.form[j1];
          const form_item = form[j2];
          if (config_item.title !== form_item.title || config_item.type !== form_item["fieldType"]) {
            logger.error(`配置文件 Form:${i} Fields:${j1} 有错误`);
            return null;
          }
          if (!config_item.required && !config_item.enable) {
            form.splice(j2, 1);
            j2--;
            continue;
          }
          const {type} = config_item;
          if (type === 2) {
            form_item.value = config_item.answer;
            for (let k = 0; k < form_item['fieldItems'].length; k++) {
              if (form_item['fieldItems'][k].content === config_item.answer) {
                form_item['fieldItems'][k]["isSelected"] = 1;
              } else {
                form_item['fieldItems'].splice(k, 1);
                k--;
              }
            }
          } else if (type === 3) {
            form_item.value = "";
            for (let k = 0; k < form_item['fieldItems'].length; k++) {
              let flag = true;
              for (const answer_item of config_item.answer) {
                if (form_item['fieldItems'][k].content === answer_item) {
                  flag = false;
                  form_item['fieldItems'][k]["isSelected"] = 1;
                  form_item.value += `${answer_item} `;
                }
              }
              if (flag) {
                form_item['fieldItems'].splice(k, 1);
                k--;
              }
            }
          } else if (type === 4) {
            //待完成
          } else {
            form_item.value = config_item.answer;
          }
        }
      }
    }
    logger.debug("Fill Forms Finished");
    return forms;
  }

  async submit(config, username) {
    logger.debug("Start Submit Forms...");
    const results = [];
    const forms = await this.fillForms(config);
    for (const form of forms) {
      if (form.enable) {
        const data = {
          formWid: form.form_wid,
          address: form.address,
          collectWid: form.collect_wid,
          schoolTaskWid: form.school_task_wid,
          form: form.form,
          uaIsCpadaily: true
        };
        const extension = {
          ...form.position,
          "model": "OPPO R11 Plus",
          "appVersion": "8.2.14",
          "systemVersion": "8.0",
          "userId": username,
          "systemName": "android",
          "deviceId": UUID.v1()
        };
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 4.4.4; OPPO R11 Plus Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/33.0.0.0 Safari/537.36 okhttp/3.12.4',
          'CpdailyStandAlone': '0',
          'extension': '1',
          'Cpdaily-Extension': DESEncrypt(JSON.stringify(extension)),
          'Content-Type': 'application/json; charset=utf-8',
          'Host': new URL(this.school_url).host,
          'Connection': 'Keep-Alive',
          'Accept-Encoding': 'gzip',
        };
        const res = await axios.post(this.school_url +
          "/wec-counselor-collector-apps/stu/collector/submitForm", data, {
          headers,
          jar: this.cookieJar,
          withCredentials: true
        });
        logger.debug(`Submit Result: ${res.data}`);
        const {message} = res.data;
        const result = {
          title: form.title,
          succeed: message === "SUCCESS" || message === "该收集已填写无需再次填写",
          message
        };
        results.push(result);
        if (result.succeed) {
          logger.info(`表单 ${result.title} 提交成功`);
        } else {
          logger.warning(`表单 ${result.title} 提交失败 msg=${result.message}`);
        }
      }
    }
    logger.debug("Submit Forms Finished");
    return results;
  }
}

module.exports = Forms;