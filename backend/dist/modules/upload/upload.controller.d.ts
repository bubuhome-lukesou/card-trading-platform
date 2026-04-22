export declare class UploadController {
    uploadImage(file: Express.Multer.File, req: any): {
        success: boolean;
        error: string;
        url?: undefined;
        filename?: undefined;
        size?: undefined;
    } | {
        success: boolean;
        url: string;
        filename: string;
        size: number;
        error?: undefined;
    };
}
