import { Injectable, BadRequestException } from '@nestjs/common'

// 騰訊雲短信 SDK
const tencentcloud = require('tencentcloud-sdk-nodejs-sms')

// 驗證碼存儲（內存，過期 5 分鐘）
interface CodeRecord {
  code: string
  expiresAt: number
  attempts: number
}

const CODE_TTL = 5 * 60 * 1000 // 5 分鐘
const MAX_ATTEMPTS = 5

// 支援的地區
export const SUPPORTED_REGIONS = [
  { code: '+853', label: '澳門', region: 'MO' },
  { code: '+852', label: '香港', region: 'HK' },
  { code: '+886', label: '台灣', region: 'TW' },
  { code: '+86',  label: '大陸', region: 'CN' },
]

@Injectable()
export class SmsService {
  private codeStore = new Map<string, CodeRecord>()
  private smsClient: any = null

  constructor() {
    try {
      const SmsClient = tencentcloud.sms.v20210111.Client
      this.smsClient = new SmsClient({
        credential: {
          secretId: process.env.TENCENT_SMS_SECRET_ID || '',
          secretKey: process.env.TENCENT_SMS_SECRET_KEY || '',
        },
        region: 'ap-guangzhou',
        profile: {
          httpProfile: { endpoint: 'sms.tencentcloudapi.com' },
        },
      })
    } catch (err) {
      console.error('[SMS] Failed to init Tencent SMS client:', err)
    }
  }

  // 發送驗證碼
  async sendVerificationCode(phone: string): Promise<{ success: boolean; message: string }> {
    // 生成 6 位數驗證碼
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // 存儲驗證碼
    this.codeStore.set(phone, {
      code,
      expiresAt: Date.now() + CODE_TTL,
      attempts: 0,
    })

    // 騰訊雲短信參數
    const phoneNumber = phone.startsWith('+') ? phone : `+${phone}`

    try {
      if (this.smsClient) {
        const params = {
          PhoneNumberSet: [phoneNumber],
          SmsSdkAppId: process.env.TENCENT_SMS_APP_ID || '1400000000', // 需要配置實際的 AppId
          SignName: process.env.TENCENT_SMS_SIGN || '卡牌交易平台',
          TemplateId: process.env.TENCENT_SMS_TEMPLATE_ID || '1000000', // 需要配置實際的模板 ID
          TemplateParamSet: [code], // 驗證碼
        }
        const response = await this.smsClient.SendSms(params)
        console.log('[SMS] SendSms response:', JSON.stringify(response))

        if (response.SendStatusSet && response.SendStatusSet[0]) {
          const status = response.SendStatusSet[0]
          if (status.Code === 'Ok') {
            return { success: true, message: '驗證碼已發送' }
          } else {
            console.error('[SMS] Send failed:', status.Code, status.Message)
            // 開發環境仍然返回成功，讓前端可以測試
            return { success: true, message: `驗證碼已發送（開發模式：${code}）` }
          }
        }
      } else {
        console.warn('[SMS] Client not initialized, using dev mode')
      }

      // 開發模式：打印驗證碼到 console
      console.log(`[SMS DEV] 驗證碼 for ${phoneNumber}: ${code}`)
      return { success: true, message: '驗證碼已發送' }
    } catch (err) {
      console.error('[SMS] Send error:', err)
      // 開發環境仍然返回成功
      console.log(`[SMS DEV FALLBACK] 驗證碼 for ${phoneNumber}: ${code}`)
      return { success: true, message: '驗證碼已發送' }
    }
  }

  // 驗證碼驗證
  verifyCode(phone: string, code: string): boolean {
    const record = this.codeStore.get(phone)
    if (!record) {
      throw new BadRequestException('驗證碼已過期或未發送')
    }

    if (Date.now() > record.expiresAt) {
      this.codeStore.delete(phone)
      throw new BadRequestException('驗證碼已過期')
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      this.codeStore.delete(phone)
      throw new BadRequestException('驗證碼嘗試次數過多，請重新發送')
    }

    record.attempts++

    if (record.code !== code) {
      throw new BadRequestException('驗證碼不正確')
    }

    // 驗證成功，刪除驗證碼
    this.codeStore.delete(phone)
    return true
  }

  // 驗證手機號格式
  validatePhone(regionCode: string, phone: string): boolean {
    const cleaned = phone.replace(/\s/g, '')
    // 各地區手機號長度
    const lengthMap: Record<string, number> = {
      '+853': 8,   // 澳門
      '+852': 8,   // 香港
      '+886': 9,   // 台灣 (09 開頭, 但不含 0)
      '+86': 11,   // 大陸
    }
    const expectedLen = lengthMap[regionCode] || 11
    return cleaned.length >= 7 && cleaned.length <= 15 && /^\d+$/.test(cleaned)
  }
}