import { EventEmitter } from '../utils/event-emitter.js';
import { Logger } from '../utils/logger.js';
import { ApiClient } from '../api/client.js';
import { ApiEndpoints } from '../api/endpoints.js';
import { MessageSender } from '../messaging/sender.js';
import { MessageReceiver } from '../messaging/receiver.js';
import { MediaUploader } from '../media/uploader.js';
import { MediaDownloader } from '../media/downloader.js';
import type { WeixinConfig, AuthResult } from '../core/types.js';
import type { AuthProvider } from '../auth/interfaces.js';
import type { WeixinMessage } from '../api/types.js';

export interface WeixinSDKOptions {
  config: WeixinConfig;
  auth: AuthProvider;
}

export class WeixinSDK extends EventEmitter {
  public readonly config: WeixinConfig;
  public readonly auth: AuthProvider;
  public readonly messaging: { sender: MessageSender; receiver: MessageReceiver };
  public readonly media: { uploader: MediaUploader; downloader: MediaDownloader };

  private readonly apiClient: ApiClient;
  private readonly apiEndpoints: ApiEndpoints;
  private readonly logger: Logger;
  private started: boolean = false;

  constructor(options: WeixinSDKOptions) {
    super();
    this.config = options.config;
    this.auth = options.auth;

    this.logger = new Logger({
      level: this.config.logLevel,
      enableConsole: this.config.enableConsoleLog ?? true,
      prefix: '[WeixinSDK]',
    });

    this.apiClient = new ApiClient(this.config);
    this.apiEndpoints = new ApiEndpoints(this.apiClient);

    const uploader = new MediaUploader(this.apiEndpoints, this.config.cdnBaseUrl);
    const downloader = new MediaDownloader(this.config.cdnBaseUrl);
    const sender = new MessageSender(this.apiEndpoints, uploader);
    const receiver = new MessageReceiver(this.apiEndpoints);

    this.messaging = { sender, receiver };
    this.media = { uploader, downloader };

    this.forwardAuthEvents();
    this.forwardMessageEvents();
  }

  private forwardAuthEvents(): void {
    this.auth.on('qr_generated', (data) => {
      this.emit('qr_generated', data);
    });

    this.auth.on('auth_success', (data) => {
      this.emit('auth_success', data);
    });

    this.auth.on('auth_failed', (data) => {
      this.emit('auth_failed', data);
    });
  }

  private forwardMessageEvents(): void {
    this.messaging.receiver.on('message', (msg) => {
      this.emit('message', msg);
    });

    this.messaging.receiver.on('error', (error) => {
      this.emit('error', error);
    });
  }

  async authenticate(): Promise<void> {
    this.logger.info('Authenticating...');
    const result = await this.auth.authenticate();
    this.apiClient.setAuthToken(result.token);
    this.logger.info('Authentication successful');
  }

  async start(): Promise<void> {
    this.logger.info('Starting SDK...');

    if (!this.auth.isAuthenticated()) {
      await this.authenticate();
    } else {
      const currentAuth = this.auth.getCurrentAuth?.();
      if (currentAuth) {
        this.apiClient.setAuthToken(currentAuth.token);
      }
    }

    const pollingInterval = this.config.pollingInterval ?? 30000;
    await this.messaging.receiver.startPolling(pollingInterval);
    this.started = true;
    this.logger.info('SDK started');
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping SDK...');
    this.messaging.receiver.stopPolling();

    if (this.auth.logout) {
      try {
        await this.auth.logout();
        this.logger.info('Logged out');
      } catch (error) {
        this.logger.warn('Logout failed', error);
      }
    }

    this.started = false;
    this.logger.info('SDK stopped');
  }

  async sendText(to: string, text: string, contextToken?: string): Promise<void> {
    await this.messaging.sender.sendText({ to, text, contextToken });
  }

  onMessage(listener: (message: WeixinMessage) => void): this {
    this.on('message', listener as (...args: unknown[]) => void);
    return this;
  }
}
