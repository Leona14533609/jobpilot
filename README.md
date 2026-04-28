# JobPilot

JobPilot 是一个面向商科同学的求职投递记录管理工具，用来整理投递记录、简历版本、暑期实习信息、面试复盘、岗位优先级和情绪状态。

当前版本是可上线的本地优先 MVP：

- 不需要账号
- 不接后端
- 不接 AI API
- 数据保存在本地浏览器，清除缓存会丢失

## 核心功能

- 投递记录管理：新增、编辑、删除、查看详情、修改状态
- 表格视图和 Kanban 看板视图
- 暑期实习字段：转正机会、信息来源、可信度、实习周期、投入程度
- 简历版本管理和投递绑定
- 面试记录和复盘
- 岗位优先级评分
- 情绪管理
- 关于作者和小红书咨询入口

## 本地运行

```bash
npm install
npm run dev
```

打开终端显示的本地预览地址即可查看。

## 上线前检查

```bash
npm run lint
npm run build
```

## 部署到 Vercel

1. 将项目推送到 GitHub。
2. 打开 Vercel，点击 New Project。
3. 选择 JobPilot 仓库。
4. Framework Preset 选择 Next.js。
5. Build Command 使用 `npm run build`。
6. 点击 Deploy。

当前版本不需要配置环境变量。
