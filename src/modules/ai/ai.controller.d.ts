interface CardInfoRequest {
    imageUrl: string;
}
interface CardInfoResponse {
    success: boolean;
    data?: {
        titleEn?: string;
        titleZh?: string;
        descriptionEn?: string;
        descriptionZh?: string;
        category?: string;
        rarity?: string;
        condition?: string;
        brand?: string;
        series?: string;
        cardNumber?: string;
    };
    error?: string;
}
export declare class AiController {
    recognizeCard(body: CardInfoRequest, req: any): Promise<CardInfoResponse>;
}
export {};
