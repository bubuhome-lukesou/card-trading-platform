import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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

@Controller('ai')
export class AiController {
  
  @UseGuards(JwtAuthGuard)
  @Post('recognize-card')
  async recognizeCard(@Body() body: CardInfoRequest, @Request() req: any): Promise<CardInfoResponse> {
    try {
      const { imageUrl } = body;

      if (!imageUrl) {
        return { success: false, error: 'Image URL is required' };
      }

      // Call OpenAI Vision API
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

      // Parse JSON from response
      let jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const cardInfo = JSON.parse(jsonMatch[0]);
        
        if (cardInfo.error) {
          return { success: false, error: cardInfo.error };
        }

        return { success: true, data: cardInfo };
      }

      return { success: false, error: 'Failed to parse AI response' };
    } catch (error) {
      console.error('Card recognition error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }
}
