import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from './entities/user.entity';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'card_admin',
  password: process.env.DB_PASSWORD || 'CardAuction2026!',
  database: process.env.DB_DATABASE || 'card_auction',
  entities: [User],
  synchronize: false,
});

async function createSeller() {
  await AppDataSource.initialize();
  console.log('✅ Database connected');

  const userRepo = AppDataSource.getRepository(User);
  const passwordHash = await bcrypt.hash('Seller123!', 10);

  let seller = await userRepo.findOne({ where: { email: 'seller_test@cardquest.com' } });
  
  if (!seller) {
    seller = await userRepo.save({
      email: 'seller_test@cardquest.com',
      nickname: 'TestSeller',
      password: passwordHash,
      role: UserRole.SELLER,
      status: UserStatus.ACTIVE,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sellertest',
    });
    console.log('✅ Seller created!');
  } else {
    seller.password = passwordHash;
    seller.role = UserRole.SELLER;
    seller.status = UserStatus.ACTIVE;
    await userRepo.save(seller);
    console.log('✅ Seller updated!');
  }

  console.log('\n📝 Seller Account:');
  console.log('   Email: seller_test@cardquest.com');
  console.log('   Password: Seller123!');
  console.log('   Role: SELLER');
  console.log('   Status: ACTIVE');

  await AppDataSource.destroy();
}

createSeller().catch(console.error);
