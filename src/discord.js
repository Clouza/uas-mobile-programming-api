import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { prisma } from "./utils/db.js";

dotenv.config();

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

client.once("ready", async () => {
	console.log(`Bot ready as ${client.user.tag}`);
	const channel = await client.channels.fetch(process.env.CHANNEL_ID);

	let lastMessageId = null;

	setInterval(async () => {
		try {
			const messages = await channel.messages.fetch({ limit: 1 });
			const message = messages.first();
			if (!message) return;

			if (message.id == lastMessageId) return;
			lastMessageId = message.id;

			const exists = await prisma.message.findFirst({
				where: {
					messageId: message.id
				},
			});
			if (exists) return;

			await prisma.message.create({
				data: {
					messageId: message.id,
					channelId: message.channelId,
					guildId: message.guildId,
					author: message.author.username,
					content: message.content,
					timestamp: message.createdAt,
				},
			});

			console.log(`[${new Date().toISOString()}] New message saved:`, message.content);
		} catch (error) {
			console.error("Polling error:", error.message);
		}
	}, 5000);
});

client.login(process.env.DISCORD_TOKEN);
