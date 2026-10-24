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

    // 根據區號選擇簽名和模板
    // 港澳台（+853/+852/+886）用 HIMACSMS 簽名 + 模板 2720933
    // 大陸（+86）用珠海横琴宇澳科技有限公司簽名 + 模板 2720934
    const isMainland = phoneNumber.startsWith('+86')
    const signName = isMainland
      ? (process.env.TENCENT_SMS_SIGN_CN || '珠海横琴宇澳科技有限公司')
      : (process.env.TENCENT_SMS_SIGN || 'HIMACSMS')
    const templateId = isMainland
      ? (process.env.TENCENT_SMS_TEMPLATE_ID_CN || '2720934')
      : (process.env.TENCENT_SMS_TEMPLATE_ID || '2720933')

    try {
      if (this.smsClient) {
        const params = {
          PhoneNumberSet: [phoneNumber],
          SmsSdkAppId: process.env.TENCENT_SMS_APP_ID || '1401046724',
          SignName: signName,
          TemplateId: templateId,
          TemplateParamSet: [code], // 驗證碼
        }
        const response = await this.smsClient.SendSms(params)
        console.log('[SMS] SendSms response:', JSON.stringify(response))

        if (response.SendStatusSet && response.SendStatusSet[0]) {
          const status = response.SendStatusSet[0]
          if (status.Code === 'Ok') {
            return { success: true, message: '驗證碼已發送' }
          }
          // 2026-10-24 修：以前呢度 catch 都返 success 掩住失敗（AuthFailure.SignatureFailure 嗰陣
          // 用戶以為已發送，其實一條都冇出）。而家失敗如實回，前端會顯示「發送失敗，請重試」。
          console.error('[SMS] Send failed:', status.Code, status.Message)
          return {
            success: false,
            message: `短信發送失敗（${status.Code}），請稍後重試或聯絡客服`,
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
      // 2026-10-24 修：SDK 異常如實回失敗，唔好再報成功掩飾
      return { success: false, message: '短信發送失敗，請稍後重試或聯絡客服' }
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