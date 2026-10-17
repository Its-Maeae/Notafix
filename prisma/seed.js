const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@notenrechner.local'
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin1234!'

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (existing) {
    console.log('Admin user already exists:', adminEmail)
    return
  }

  const hashed = await bcrypt.hash(adminPassword, 12)
  await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashed,
      isAdmin: true,
    },
  })

  console.log('Admin user created:', adminEmail)
  console.log('Password:', adminPassword)
  console.log('IMPORTANT: Change these credentials in .env before production use!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
