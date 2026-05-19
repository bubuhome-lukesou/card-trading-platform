import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}

// ============================================================================
// 📧 Email Service Interface (Gmail SMTP - 待接入)
// ============================================================================
//
// 接入步骤:
// 1. 在 Google Cloud Console 创建项目并启用 Gmail API
// 2. 配置 OAuth 2.0 凭据 (客户端 ID 和密钥)
// 3. 实现 email.service.ts 中的 sendEmail 方法
//
// 配置示例 (.env):
//   GMAIL_CLIENT_ID=your-client-id
//   GMAIL_CLIENT_SECRET=your-client-secret
//   GMAIL_REDIRECT_URI=urn:ietf:wg:oauth:2.0:oob
//   GMAIL_REFRESH_TOKEN=your-refresh-token
//
// ============================================================================
// ============================================================================
// 💬 WeChat Work (企业微信) - 待接入
// ============================================================================
//
// 接入步骤:
// 1. 在企业微信管理后台创建自建应用
// 2. 获取 AgentId, CorpId, CorpSecret
// 3. 实现 wechat.service.ts 中的发送消息方法
//
// 配置示例 (.env):
//   WECHAT_AGENT_ID=your-agent-id
//   WECHAT_CORP_ID=your-corp-id
//   WECHAT_CORP_SECRET=your-corp-secret
//
// 消息类型支持:
// - 文本消息
// - 图文消息 (点击跳转小程序/网页)
// - 模板消息 (拍卖出价/中标通知)
//
// ============================================================================
// ============================================================================
// 📱 OneBot (QQ机器人) - 待接入
// ============================================================================
//
// 可用于:
// - 拍卖开始/结束通知
// - 出价成功/被超越通知
// - 订单状态更新
//
// ============================================================================
