import bcrypt from "bcryptjs";
import { prisma } from "./db.js";

const hash = await bcrypt.hash("qwerty", 10);
await prisma.user.create({
	data: {
		email: "wahyu@example.com",
		password: hash,
	},
});

await prisma.apiKey.create({
	data: {
		key: "xxxyyyzzz",
		expiresAt: new Date("2025-12-31"),
	},
});
