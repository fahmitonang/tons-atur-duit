import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import mariadb from 'mariadb'

const poolSingleton = () => {
  // MariaDB driver pool configuration using the connection string
  return mariadb.createPool(process.env.DATABASE_URL as string)
}

const prismaClientSingleton = (pool: mariadb.Pool) => {
  const adapter = new PrismaMariaDb(pool)
  return new PrismaClient({ adapter })
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
  poolGlobal: ReturnType<typeof poolSingleton>;
} & typeof global;

const pool = globalThis.poolGlobal ?? poolSingleton()
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton(pool)

export default prisma

if (process.env.NODE_ENV !== 'production') {
  globalThis.poolGlobal = pool
  globalThis.prismaGlobal = prisma
}
