import { hash } from '@node-rs/argon2';

const users = [{ userId: 'usr-001', email: 'admin@tuktak.com', password: 'Admin@123' }];

for (const u of users) {
  const h = await hash(u.password);
  console.log(JSON.stringify({ userId: u.userId, hash: h }));
}
