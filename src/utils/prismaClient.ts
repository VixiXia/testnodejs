import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
// { log: ["query"] }
// prisma.$on("query" as never, async (e: any) => {
//   console.debug(e.params);
// });
export default prisma;
