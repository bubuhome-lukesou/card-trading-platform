import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Request } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('upload')
export class UploadController {
  @UseGuards(JwtAuthGuard)
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
}
