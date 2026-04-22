"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("./entities/user.entity");
const product_entity_1 = require("./entities/product.entity");
const auction_entity_1 = require("./entities/auction.entity");
const auction_entity_2 = require("./entities/auction.entity");
const AppDataSource = new typeorm_1.DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'card_admin',
    password: process.env.DB_PASSWORD || 'CardAuction2026!',
    database: process.env.DB_DATABASE || 'card_auction',
    entities: [user_entity_1.User, product_entity_1.Product, auction_entity_1.Auction, auction_entity_2.Bid],
    synchronize: false,
});
async function seed() {
    await AppDataSource.initialize();
    console.log('✅ Database connected');
    const userRepo = AppDataSource.getRepository(user_entity_1.User);
    const productRepo = AppDataSource.getRepository(product_entity_1.Product);
    const auctionRepo = AppDataSource.getRepository(auction_entity_1.Auction);
    const passwordHash = await bcrypt.hash('Seller123!', 10);
    let seller = await userRepo.findOne({ where: { email: 'seller@cardquest.com' } });
    if (!seller) {
        seller = await userRepo.save({
            email: 'seller@cardquest.com',
            nickname: 'CardMaster',
            password: passwordHash,
            role: user_entity_1.UserRole.SELLER,
            status: user_entity_1.UserStatus.ACTIVE,
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cardmaster',
        });
        console.log('✅ Seller created:', seller.nickname);
    }
    else {
        console.log('ℹ️ Seller already exists');
    }
    const products = [
        {
            titleEn: 'Pokemon 1st Edition Charizard Holo',
            titleZh: '宝可梦 初代喷火龙 全息卡',
            descriptionEn: '1999 Pokemon 1st Edition Base Set Charizard. PSA graded 9 near mint condition. The holy grail of Pokemon cards.',
            descriptionZh: '1999年宝可梦初代喷火龙卡片。PSA评分9，近 mint 品相。宝可梦卡牌界的圣杯。',
            category: product_entity_1.ProductCategory.POKEMON,
            rarity: product_entity_1.ProductRarity.SSR,
            condition: product_entity_1.ProductCondition.NEAR_MINT,
            price: 12800,
            brand: 'Pokemon',
            series: '1st Edition Base Set',
            cardNumber: '4/102',
            listingType: product_entity_1.ListingType.AUCTION,
            images: JSON.stringify(['https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=400']),
            thumbnail: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=200',
            stock: 1,
            sellerId: seller.id,
            status: product_entity_1.ProductStatus.ACTIVE,
        },
        {
            titleEn: 'Yu-Gi-Oh Blue-Eyes White Dragon',
            titleZh: '游戏王 青眼白龙',
            descriptionEn: 'Original print Blue-Eyes White Dragon from the legendary set. Kaiba signature card.',
            descriptionZh: '初代游戏王青眼白龙。经典的龙癌卡。',
            category: product_entity_1.ProductCategory.YUGIOH,
            rarity: product_entity_1.ProductRarity.SSR,
            condition: product_entity_1.ProductCondition.MINT,
            price: 6800,
            brand: 'Konami',
            series: 'LOB',
            cardNumber: 'LOB-001',
            listingType: product_entity_1.ListingType.AUCTION,
            images: JSON.stringify(['https://images.unsplash.com/photo-1606152421802-db97b9c7a11b?w=400']),
            thumbnail: 'https://images.unsplash.com/photo-1606152421802-db97b9c7a11b?w=200',
            stock: 1,
            sellerId: seller.id,
            status: product_entity_1.ProductStatus.ACTIVE,
        },
        {
            titleEn: 'MTG Black Lotus Alpha Edition',
            titleZh: '万智牌 黑莲阿法版',
            descriptionEn: 'The most valuable Magic: The Gathering card. Alpha edition in excellent condition.',
            descriptionZh: '最珍贵的万智牌。黑莲阿法版、品相优秀。',
            category: product_entity_1.ProductCategory.MTG,
            rarity: product_entity_1.ProductRarity.SSR,
            condition: product_entity_1.ProductCondition.EXCELLENT,
            price: 25000,
            brand: 'Wizards of the Coast',
            series: 'Alpha',
            cardNumber: 'None',
            listingType: product_entity_1.ListingType.AUCTION,
            images: JSON.stringify(['https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?w=400']),
            thumbnail: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?w=200',
            stock: 1,
            sellerId: seller.id,
            status: product_entity_1.ProductStatus.ACTIVE,
        },
        {
            titleEn: 'Ultraman Ultra Medal Collection',
            titleZh: '奥特曼 超奥特兄弟勋章套装',
            descriptionEn: 'Complete set of Ultra Medal collection. Limited edition with display case.',
            descriptionZh: '完整版奥特曼勋章收藏套装。限量版含展示盒。',
            category: product_entity_1.ProductCategory.ULTRAMAN,
            rarity: product_entity_1.ProductRarity.SR,
            condition: product_entity_1.ProductCondition.MINT,
            price: 3200,
            brand: 'Bandai',
            series: 'Ultra Medal Series',
            cardNumber: 'N/A',
            listingType: product_entity_1.ListingType.SALE,
            images: JSON.stringify(['https://images.unsplash.com/photo-1608889175123-8ee362201f81?w=400']),
            thumbnail: 'https://images.unsplash.com/photo-1608889175123-8ee362201f81?w=200',
            stock: 5,
            sellerId: seller.id,
            status: product_entity_1.ProductStatus.ACTIVE,
        },
        {
            titleEn: 'One Piece Luffy Gear 5 Figure',
            titleZh: '海贼王 路飞五档手办',
            descriptionEn: 'Hot Toys Luffy Gear 5 figure. Brand new in box. Masterpiece series.',
            descriptionZh: 'Hot Toys 路飞五档手办。全新未拆封。 masterpiece 系列。',
            category: product_entity_1.ProductCategory.ONEPiece,
            rarity: product_entity_1.ProductRarity.SR,
            condition: product_entity_1.ProductCondition.MINT,
            price: 4500,
            brand: 'Hot Toys',
            series: 'One Piece',
            cardNumber: 'N/A',
            listingType: product_entity_1.ListingType.SALE,
            images: JSON.stringify(['https://images.unsplash.com/photo-1608889335941-32ac5f2041b9?w=400']),
            thumbnail: 'https://images.unsplash.com/photo-1608889335941-32ac5f2041b9?w=200',
            stock: 2,
            sellerId: seller.id,
            status: product_entity_1.ProductStatus.ACTIVE,
        },
        {
            titleEn: 'Sports Card Michael Jordan Rookie',
            titleZh: '体育卡 乔丹新秀卡',
            descriptionEn: '1993 Upper Deck Michael Jordan rookie card. PSA 8 condition.',
            descriptionZh: '1993年Upper Deck乔丹新秀卡。PSA评分8。',
            category: product_entity_1.ProductCategory.OTHER,
            rarity: product_entity_1.ProductRarity.SSR,
            condition: product_entity_1.ProductCondition.EXCELLENT,
            price: 15000,
            brand: 'Upper Deck',
            series: '1993 SP',
            cardNumber: 'SP279',
            listingType: product_entity_1.ListingType.AUCTION,
            images: JSON.stringify(['https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400']),
            thumbnail: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=200',
            stock: 1,
            sellerId: seller.id,
            status: product_entity_1.ProductStatus.ACTIVE,
        },
    ];
    for (const productData of products) {
        let product = await productRepo.findOne({ where: { titleEn: productData.titleEn } });
        if (!product) {
            product = await productRepo.save(productData);
            console.log('✅ Product created:', product.titleEn);
        }
        else {
            console.log('ℹ️ Product already exists:', product.titleEn);
        }
        if (product.listingType === product_entity_1.ListingType.AUCTION) {
            let auction = await auctionRepo.findOne({ where: { productId: product.id } });
            if (!auction) {
                const startTime = new Date();
                const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
                auction = await auctionRepo.save({
                    productId: product.id,
                    sellerId: seller.id,
                    startingPrice: product.price * 0.8,
                    currentPrice: product.price * 0.8,
                    startTime,
                    endTime,
                    status: auction_entity_1.AuctionStatus.ACTIVE,
                    extensionMinutes: 5,
                });
                console.log('✅ Auction created for:', product.titleEn);
            }
            else {
                console.log('ℹ️ Auction already exists for:', product.titleEn);
            }
        }
    }
    console.log('🎉 Seed completed!');
    await AppDataSource.destroy();
}
seed().catch(console.error);
//# sourceMappingURL=seed.js.map