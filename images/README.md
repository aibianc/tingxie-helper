# TabBar 图标说明

此目录用于存放小程序 TabBar 图标文件，建议尺寸为 81px * 81px。

需要以下文件（每个图标需要两个版本：普通状态和选中状态）：

- `home.png` / `home-active.png` - 首页图标
- `book.png` / `book-active.png` - 词库图标
- `history.png` / `history-active.png` - 历史记录图标
- `medal.png` / `medal-active.png` - 奖牌图标
- `user.png` / `user-active.png` - 个人中心图标

## 临时解决方案

在正式图标准备好之前，你可以：
1. 在 iconfont.cn 等网站下载适合的图标
2. 使用在线工具生成简单的占位图标
3. 或者在微信开发者工具中暂时注释掉 tabBar 配置

## 注意事项

- 图标文件格式必须是 PNG
- 建议使用透明背景
- 普通状态建议使用灰色调
- 选中状态建议使用主题色（#667eea 或渐变色）
