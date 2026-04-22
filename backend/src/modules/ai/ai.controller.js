"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let AiController = class AiController {
    async recognizeCard(body, req) {
        try {
            const { imageUrl } = body;
            if (!imageUrl) {
                return { success: false, error: 'Image URL is required' };
            }
            const openAiKey = process.env.OPENAI_API_KEY;
            if (!openAiKey) {
                return { success: false, error: 'AI service not configured' };
            }
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openAiKey}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: `You are a trading card expert. Analyze this card image and provide information in JSON format.
                  
Return ONLY a valid JSON object with these fields (use null if unknown):
{
  "titleEn": "English card name",
  "titleZh": "Chinese card name (or leave empty if can't determine)",
  "descriptionEn": "Brief English description",
  "descriptionZh": "Brief Chinese description",
  "category": "pokemon, yugioh, mtg, ultraman, onepiece, sports, or other",
  "rarity": "SSR, SR, R, or N",
  "condition": "mint, near_mint, excellent, good, or fair",
  "brand": "Brand name like Pokemon, Konami, Wizards of the Coast, etc.",
  "series": "Card set/series name",
  "cardNumber": "Card number in set if visible"
}

If this is not a trading card, return {"error": "Not a trading card"}`,
                                },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: imageUrl,
                                        detail: 'low'
                                    },
                                },
                            ],
                        },
                    ],
                    max_tokens: 500,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error('OpenAI API error:', errorText);
                return { success: false, error: 'AI service error' };
            }
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (!content) {
                return { success: false, error: 'No response from AI' };
            }
            let jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const cardInfo = JSON.parse(jsonMatch[0]);
                if (cardInfo.error) {
                    return { success: false, error: cardInfo.error };
                }
                return { success: true, data: cardInfo };
            }
            return { success: false, error: 'Failed to parse AI response' };
        }
        catch (error) {
            console.error('Card recognition error:', error);
            return { success: false, error: 'Internal server error' };
        }
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('recognize-card'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "recognizeCard", null);
exports.AiController = AiController = __decorate([
    (0, common_1.Controller)('ai')
], AiController);
//# sourceMappingURL=ai.controller.js.map