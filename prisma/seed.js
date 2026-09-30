import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const cats = [['blog','Blog'],['connexion','Connexion'],['dashboard','Dashboard & admin'],['e-commerce','E-commerce'],['portfolio','Portfolio & CV'],['restaurant','Restaurant'],['education','Éducation'],['agence','Agence & business'],['sante','Santé'],['media','Médias'],['composants','Composants UI'],['outils','Outils & calculatrices']];
for (const [i,[slug,name]] of cats.entries()) {
  await prisma.category.upsert({ where: { slug }, update: {}, create: { slug, name, position: i } });
}
await prisma.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
console.log('Seed OK');
await prisma.$disconnect();
