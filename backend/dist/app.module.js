"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const schedule_1 = require("@nestjs/schedule");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./modules/auth/auth.module");
const products_module_1 = require("./modules/products/products.module");
const auctions_module_1 = require("./modules/auctions/auctions.module");
const notification_module_1 = require("./modules/notification/notification.module");
const user_entity_1 = require("./entities/user.entity");
const product_entity_1 = require("./entities/product.entity");
const auction_entity_1 = require("./entities/auction.entity");
const bid_entity_1 = require("./entities/bid.entity");
const order_entity_1 = require("./entities/order.entity");
const websocket_module_1 = require("./websocket/websocket.module");
const ai_module_1 = require("./modules/ai/ai.module");
const upload_module_1 = require("./modules/upload/upload.module");
const users_module_1 = require("./modules/users/users.module");
const orders_module_1 = require("./modules/orders/orders.module");
const bids_module_1 = require("./modules/bids/bids.module");
const favorites_module_1 = require("./modules/favorites/favorites.module");
const wallet_module_1 = require("./modules/wallet/wallet.module");
const favorite_entity_1 = require("./entities/favorite.entity");
const wallet_entity_1 = require("./entities/wallet.entity");
const admin_module_1 = require("./modules/admin/admin.module");
const pages_module_1 = require("./modules/pages/pages.module");
const page_entity_1 = require("./entities/page.entity");
const tag_entity_1 = require("./entities/tag.entity");
const tags_module_1 = require("./modules/tags/tags.module");
const cart_module_1 = require("./modules/cart/cart.module");
const cart_item_entity_1 = require("./entities/cart-item.entity");
const settings_entity_1 = require("./entities/settings.entity");
const seller_application_entity_1 = require("./entities/seller-application.entity");
const seller_applications_module_1 = require("./modules/seller-applications/seller-applications.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRoot({
                type: 'mysql',
                host: process.env.DB_HOST || '127.0.0.1',
                port: parseInt(process.env.DB_PORT || '3306'),
                username: process.env.DB_USERNAME || 'card_admin',
                password: process.env.DB_PASSWORD || 'CardAuction2026!',
                database: process.env.DB_DATABASE || 'card_auction',
                entities: [user_entity_1.User, product_entity_1.Product, auction_entity_1.Auction, bid_entity_1.Bid, order_entity_1.Order, favorite_entity_1.Favorite, wallet_entity_1.WalletTransaction, page_entity_1.Page, tag_entity_1.Tag, cart_item_entity_1.CartItem, settings_entity_1.Settings, seller_application_entity_1.SellerApplication],
                synchronize: true,
                logging: process.env.NODE_ENV === 'development'
            }),
            typeorm_1.TypeOrmModule.forFeature([settings_entity_1.Settings]),
            schedule_1.ScheduleModule.forRoot(),
            auth_module_1.AuthModule,
            products_module_1.ProductsModule,
            auctions_module_1.AuctionsModule,
            notification_module_1.NotificationModule,
            websocket_module_1.WebsocketModule,
            ai_module_1.AiModule,
            upload_module_1.UploadModule,
            users_module_1.UsersModule,
            orders_module_1.OrdersModule,
            bids_module_1.BidsModule,
            favorites_module_1.FavoritesModule,
            wallet_module_1.WalletModule,
            admin_module_1.AdminModule,
            pages_module_1.PagesModule,
            tags_module_1.TagsModule,
            cart_module_1.CartModule,
            seller_applications_module_1.SellerApplicationsModule
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService]
    })
], AppModule);
//# sourceMappingURL=app.module.js.map