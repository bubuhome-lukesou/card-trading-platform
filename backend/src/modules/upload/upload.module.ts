import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { UploadController } from './upload.controller'

const IMAGE_RE = /\/(jpg|jpeg|png|gif|webp)$/
const VIDEO_RE = /^video\//

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: '/var/www/card-trading-platform/backend/uploads',
        filename: (req, file, callback) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`
          callback(null, uniqueName)
        },
      }),
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB（影片上限；圖片由前端另行限 20MB）
      },
      fileFilter: (req, file, callback) => {
        if (IMAGE_RE.test(file.mimetype) || VIDEO_RE.test(file.mimetype)) {
          return callback(null, true)
        }
        return callback(new Error('Only image or video files are allowed!'), false)
      },
    }),
  ],
  controllers: [UploadController],
})
export class UploadModule {}