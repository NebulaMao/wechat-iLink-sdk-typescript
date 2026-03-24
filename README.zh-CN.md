# @xmccln/wechat-ilink-sdk

微信 iLink 协议的 TypeScript SDK。

[English README](./README.md)

目前已经封装：

- Token 登录
- 二维码登录
- `getupdates` 长轮询收消息
- 文本和媒体发送
- CDN 上传
- 入站媒体下载和解密

## 安装

```bash
npm install @xmccln/wechat-ilink-sdk
```

## 默认配置

示例里默认使用：

- API Base URL: `https://ilinkai.weixin.qq.com`
- CDN Base URL: `https://novac2c.cdn.weixin.qq.com/c2c`
- 二维码登录 `bot_type`: `3`

## 快速开始

```ts
import {
  WeixinSDK,
  TokenAuthProvider,
  LogLevel,
} from '@xmccln/wechat-ilink-sdk';

const sdk = new WeixinSDK({
  config: {
    baseUrl: process.env.WEIXIN_BASE_URL ?? 'https://ilinkai.weixin.qq.com',
    cdnBaseUrl: process.env.WEIXIN_CDN_URL ?? 'https://novac2c.cdn.weixin.qq.com/c2c',
    timeout: 15000,
    longPollTimeoutMs: 35000,
    pollingInterval: 1000,
    retries: 3,
    logLevel: LogLevel.INFO,
    enableConsoleLog: true,
  },
  auth: new TokenAuthProvider(
    process.env.WEIXIN_TOKEN!,
    process.env.WEIXIN_USER_ID
  ),
});

sdk.onMessage((message) => {
  console.log('from:', message.from_user_id);
  console.log('context:', message.context_token);
});

await sdk.start();
await sdk.sendText('target-user-id', 'hello');
```

## 二维码登录

```ts
import {
  WeixinSDK,
  QrAuthProvider,
  ApiClient,
} from '@xmccln/wechat-ilink-sdk';

const config = {
  baseUrl: 'https://ilinkai.weixin.qq.com',
  cdnBaseUrl: 'https://novac2c.cdn.weixin.qq.com/c2c',
};

const apiClient = new ApiClient(config);
const auth = new QrAuthProvider(apiClient, '3');

auth.on('qr_generated', ({ url }) => {
  console.log('扫码地址:', url);
});

const sdk = new WeixinSDK({ config, auth });
await sdk.start();
```

## 正确回复消息

回复时应该带上入站消息里的 `context_token`。

```ts
sdk.onMessage(async (message) => {
  const to = message.from_user_id;
  const contextToken = message.context_token;
  if (!to || !contextToken) return;

  await sdk.sendText(to, 'Echo reply', contextToken);
});
```

## 发送媒体

```ts
import { UploadMediaType } from '@xmccln/wechat-ilink-sdk';

await sdk.messaging.sender.sendMedia({
  to: 'target-user-id',
  filePath: '/tmp/demo.png',
  mediaType: UploadMediaType.IMAGE,
  contextToken: 'message-context-token',
});
```

支持的 `UploadMediaType`：

- `UploadMediaType.IMAGE`
- `UploadMediaType.VIDEO`
- `UploadMediaType.FILE`
- `UploadMediaType.VOICE`

发送文件时可以显式传 `fileName`：

```ts
await sdk.messaging.sender.sendMedia({
  to: 'target-user-id',
  filePath: '/tmp/report.bin',
  fileName: 'report.pdf',
  mediaType: UploadMediaType.FILE,
  contextToken: 'message-context-token',
});
```

## 下载并解密入站媒体

SDK 已经内建 CDN 下载和 AES 解密，不需要用户再自己处理。

```ts
const downloaded = await sdk.media.downloader.downloadFirstMedia(message);
if (!downloaded) return;

console.log(downloaded.type);
console.log(downloaded.path);
console.log(downloaded.mimeType);

await downloaded.cleanup();
```

可直接调用：

- `sdk.media.downloader.downloadImage(message)`
- `sdk.media.downloader.downloadVideo(message)`
- `sdk.media.downloader.downloadFile(message)`
- `sdk.media.downloader.downloadVoice(message)`
- `sdk.media.downloader.downloadFirstMedia(message)`

当前行为：

- 图片：下载并解密到本地文件
- 视频：下载并解密到本地文件
- 文件：下载并解密到本地文件，并根据文件名推断 MIME
- 语音：下载并解密到本地文件，当前按原始 `audio/silk` 保存

## Echo Bot

完整示例见 [examples/echo-bot.ts](./examples/echo-bot.ts)。

当前支持：

- 二维码登录和本地 token 缓存
- 文本回显
- 图片回显
- 视频回显
- 文件回显
- 语音回显

运行：

```bash
npx tsx examples/echo-bot.ts
```

清理本地缓存认证：

```bash
npx tsx examples/echo-bot.ts --clear-auth
```

## 主要导出

```ts
import {
  WeixinSDK,
  ApiClient,
  ApiEndpoints,
  TokenAuthProvider,
  QrAuthProvider,
  MessageSender,
  MessageReceiver,
  MediaUploader,
  MediaDownloader,
  UploadMediaType,
  MessageItemType,
  MessageType,
  TypingStatus,
  LogLevel,
  WeixinSDKError,
  ErrorCode,
} from '@xmccln/wechat-ilink-sdk';
```

## 配置项

`WeixinConfig` 主要字段：

- `baseUrl`: iLink API 地址
- `cdnBaseUrl`: CDN 地址
- `timeout`: 普通 API 超时毫秒数
- `longPollTimeoutMs`: `getupdates` 长轮询超时毫秒数
- `retries`: 可重试请求的重试次数
- `pollingInterval`: 轮询兜底间隔
- `logLevel`
- `enableConsoleLog`

## 开发

```bash
npm install
npm run typecheck
npm test
npm run build
```
