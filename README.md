# campushoy-auto-submit
今日校园自动完成

# 运行环境
 nodejs 14+

# 部署指南
请确保安装好了 nodejs 和 yarn
```bash
git clone https://github.com/AntaresQAQ/campushoy-auto-submit.git
cd campushoy-auto-submit
yarn
```
等待依赖包安装完成，如果速度过慢请酌情更换镜像源

```bash
yarn start
```

如果环境配置正确，应该会有如下输出：
```
[xxxx-xx-xx xx:xx:xx][WARNING]: 配置文件已生成，请完成 config.yaml
```

编辑文件`config.yaml`，样例如下：
```yaml
login_info:
  school_name: xxxx大学 # 学校
  username: 2019000000 # 用户名，一般为学号
  password: ABC1234 # 登录密码
  retry_times: 5 # 登录重试次数

captcha: # 自动打码
  enable: false
  pd_id: # 请前往 http://www.fateadm.com 获取
  pd_key: # 请前往 http://www.fateadm.com 获取

noticer: # Server酱推送
  enable: false
  secret_key: # Server酱密钥，请前往 http://sc.ftqq.com/ 注册并绑定微信后获取

cron: 0 0 9 * * * # 计划任务规则
log_level: info # 日志级别 debug/info/warning/error
```

如果不会填写cron规则，可以使用 <https://www.bejson.com/othertools/cron/> 来生成

完成后，再次执行

```bash
yarn start
```
此时输出如下：
```
[xxxx-xx-xx xx:xx:xx][WARNING]: 表单配置文件已生成，请完成 forms.yaml
```
程序会根据你今日校园的信息收集表生成配置文件`forms.yaml`

如果生成的文件为空列表，则可能还未到填表时间，请等待表单发布后，删除`forms.yaml`重新生成表单模板。

生成的表单模板类似这样：
```yaml
- title: xxxx大学x月x日防控新冠肺炎零报告
  enable: true # 是否填写这张表
  form:
    - type: 2
      required: true # true为必填项，false为选填项
      title: 你的学生类别
      options:
        - 中专生
        - 大专生
        - 本科生
        - 硕士
        - 博士
      answer: 本科生 # 这里填写你的选择，请直接复制options的值填写
    - type: 2
      required: true
      title: 你今天的体温是多少？
      options:
        - 36℃以下
        - 36~37.2℃
        - 37.3~37.9℃
        - 38℃及以上
      answer: 36~37.2℃
    - type: 2
      required: true
      title: 你是否有疑似/确诊新冠肺炎/无症状感染症病例？
      options:
        - 否
        - 新冠肺炎疑似病例
        - 新冠肺炎确诊病例
        - 无症状感染症病例
      answer: 否
    - type: 2
      required: true
      title: 你当前是否被医学隔离？
      options:
        - 是
        - 否
      answer: 否
    - type: 2
      required: false
      title: 你如果已被医学隔离，请选择被隔离的方式（未被隔离的不填）
      enable: false # 如果requireed为false，可以自行选择是否填写
      options:
        - 居家隔离
        - 集中隔离
      answer: null
    - type: 1
      required: false
      title: 你如果已被医学隔离，请填写目前被隔离的详细地址（未被隔离的不填）
      enable: false
      answer: ''
    - type: 2
      required: true
      title: 你近14天是否有发热、咳嗽等呼吸道病症？
      options:
        - 是
        - 否
      answer: 否
  address: '' # 这里填写你的地址
  position: # 填写定位经纬度
    lon: 0 # 经度
    lat: 0 # 纬度
```

请按照实际需求填写好表单配置文件，执行：

```bash
yarn start
```

程序开始运行。