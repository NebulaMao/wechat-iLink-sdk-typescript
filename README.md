# @xmccln/wechat-ilink-sdk

TypeScript SDK for the WeChat iLink bot protocol.

[中文文档](./README.zh-CN.md)

It includes:
- QR login and token login
- `getupdates` long-poll receive loop
- text and media sending
- CDN upload
- inbound media download and decryption

## Install

```bash
npm install @xmccln/wechat-ilink-sdk
```

## Quick Start

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

Default values used by the SDK examples:

- API base URL: `https://ilinkai.weixin.qq.com`
- CDN base URL: `https://novac2c.cdn.weixin.qq.com/c2c`
- QR login `bot_type`: `3`

## QR Login

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
  console.log('scan:', url);
});

const sdk = new WeixinSDK({ config, auth });
await sdk.start();
```

## Replying Correctly

Replies should carry the inbound `context_token`.

```ts
sdk.onMessage(async (message) => {
  const to = message.from_user_id;
  const contextToken = message.context_token;
  if (!to || !contextToken) return;

  await sdk.sendText(to, 'Echo reply', contextToken);
});
```

## Sending Media

```ts
import { UploadMediaType } from '@xmccln/wechat-ilink-sdk';

await sdk.messaging.sender.sendMedia({
  to: 'target-user-id',
  filePath: '/tmp/demo.png',
  mediaType: UploadMediaType.IMAGE,
  contextToken: 'message-context-token',
});
```

Supported `UploadMediaType` values:

- `UploadMediaType.IMAGE`
- `UploadMediaType.VIDEO`
- `UploadMediaType.FILE`
- `UploadMediaType.VOICE`

For file messages, you can also pass `fileName`:

```ts
await sdk.messaging.sender.sendMedia({
  to: 'target-user-id',
  filePath: '/tmp/report.bin',
  fileName: 'report.pdf',
  mediaType: UploadMediaType.FILE,
  contextToken: 'message-context-token',
});
```

## Downloading And Decrypting Inbound Media

The SDK now handles inbound CDN download and AES decryption for you.

```ts
const downloaded = await sdk.media.downloader.downloadFirstMedia(message);
if (!downloaded) return;

console.log(downloaded.type);
console.log(downloaded.path);
console.log(downloaded.mimeType);

await downloaded.cleanup();
```

Available helpers:

- `sdk.media.downloader.downloadImage(message)`
- `sdk.media.downloader.downloadVideo(message)`
- `sdk.media.downloader.downloadFile(message)`
- `sdk.media.downloader.downloadVoice(message)`
- `sdk.media.downloader.downloadFirstMedia(message)`

Current downloader behavior:

- image: downloads and decrypts to a local file
- video: downloads and decrypts to a local file
- file: downloads and decrypts to a local file, infers MIME from filename
- voice: downloads and decrypts to a local file, currently saved as raw `audio/silk`

## Echo Bot

An end-to-end example is included at [examples/echo-bot.ts](./examples/echo-bot.ts).

It supports:

- QR login with local token cache
- text echo
- image echo
- video echo
- file echo
- voice echo

Run it with:

```bash
npx tsx examples/echo-bot.ts
```

Clear cached auth:

```bash
npx tsx examples/echo-bot.ts --clear-auth
```

## API Surface

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

## Config

`WeixinConfig` fields:

- `baseUrl`: iLink API base URL
- `cdnBaseUrl`: CDN base URL
- `timeout`: normal API timeout in ms
- `longPollTimeoutMs`: `getupdates` long-poll timeout in ms
- `retries`: retry count for retryable requests
- `pollingInterval`: fallback delay between polls
- `logLevel`
- `enableConsoleLog`

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```
