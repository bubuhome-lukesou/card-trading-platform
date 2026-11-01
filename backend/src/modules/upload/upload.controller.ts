import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Request } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

// 訂單聊天附件上傳（2026-11-01）：圖片 + 影片
// 返回 { url, type } 供聊天消息 attachments 使用
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  @Post('image')
  @UseInterceptors(FileInterceptor('image'))
  uploadImage(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) {
      return { success: false, error: 'No file uploaded' }
    }
    // Return the URL path to access the uploaded file
    const imageUrl = `/uploads/${file.filename}`
    return {
      success: true,
      url: imageUrl,
      filename: file.filename,
      size: file.size,
    }
  }

  // 訂單聊天附件：圖片或影片（60MB 影片上限由 module 設定，此處按 mimetype 分型）
  @Post('chat-media')
  @UseInterceptors(FileInterceptor('file'))
  uploadChatMedia(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) {
      return { success: false, error: 'No file uploaded' }
    }
    const isVideo = (file.mimetype || '').startsWith('video/')
    return {
      success: true,
      url: `/uploads/${file.filename}`,
      type: isVideo ? 'video' : 'image',
      filename: file.filename,
      size: file.size,
    }
  }
}