import { prisma } from "../utils/db.js";
import express from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import axios from "axios";

const router = express.Router();

router.post("/news", async (req, res) => {
	const { apiKey } = req.body;
	if (!apiKey) {
		return res.status(400).json({
			success: false,
			message: "apiKey required",
		});
	}

	const key = await prisma.apiKey.findUnique({ where: { key: apiKey } });
	if (!key) {
		return res.json({
			success: false,
			message: "Invalid API Key",
		});
	}

	const news = await prisma.message.findMany({
		orderBy: { timestamp: "desc" },
	});

	res.json({
		success: true,
		news
	});
});

router.post("/login", async (req, res) => {
	try {
		const { email, password } = req.body;
		const user = await prisma.user.findUnique({ where: { email } });

		if (!user) return res.json({ success: false });

		const isValid = await bcrypt.compare(password, user.password);
		return res.json({
			id: isValid ? user.id : null,
			success: isValid,
		});
	} catch (error) {
		res.json({
			success: false,
			message: "Samting weng wong.",
			error: error.message,
		}).status(500);
	}
});

router.post("/key", async (req, res) => {
	try {
		const { key } = req.body;
		const apiKey = await prisma.apiKey.findUnique({ where: { key } });

		if (!apiKey) return res.json({ success: false });

		const isValid = new Date() < apiKey.expiresAt;
		return res.json({
			success: isValid,
			apiKey: apiKey.key,
		});
	} catch (error) {
		res.json({
			success: false,
			message: "Samting weng wong.",
			error: error.message,
		}).status(500);
	}
});

// upload files
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const dir = "public/files/";
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
		cb(null, dir);
	},
	filename: (req, file, cb) => {
		const ext = path.extname(file.originalname);
		const base = path.basename(file.originalname, ext);
		const uniqueName = `${base}-${Date.now()}${ext}`;
		cb(null, uniqueName);
	},
});
const upload = multer({ storage });

router.post("/user", upload.single("file"), async (req, res) => {
	try {
		let { id, email, password, apiKey } = req.body;
		if (!id) return res.status(400).json({ message: "Id required" });

		const updateData = {};

		// cek file
		if (req.file) {
			updateData.image = `${req.file.filename}`;
		}

		if (email) updateData.email = email;
		if (password) {
			const salt = await bcrypt.genSalt(10);
			updateData.password = await bcrypt.hash(password, salt);
		}

		if (Object.keys(updateData).length == 0 && apiKey == null) {
			return res.status(400).json({ message: "No update data provided" });
		}

		if (apiKey) {
			apiKey = await prisma.apiKey.findFirst({
				where: {
					key: apiKey,
					expiresAt: {
						gte: new Date(),
					},
				},
			}).then((data) => data?.key || null);
		}

		const userInfo = await prisma.user.findUnique({ where: { id } });
		if (!userInfo) return res.status(404).json({ message: "User not found" });

		// update user
		const updatedUser = await prisma.user.update({
			where: { id },
			data: updateData,
		});

		res.json({
			success: true,
			email: updatedUser.email,
			image: updatedUser.image,
			apiKey: apiKey,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Samting weng wong.",
			error: error.message,
		});
	}
});

router.get("/user", async (req, res) => {
	try {
		const { id } = req.query;
		const userInfo = await prisma.user.findUnique({ where: { id } });
		if (!userInfo) return res.json({ success: false });

		return res.json({
			success: true,
			id: userInfo.id,
			email: userInfo.email,
			image: userInfo.image,
		});
	} catch (error) {
		res.json({
			success: false,
			message: "Samting weng wong.",
			error: error.message,
		});
	}
});

// AI
router.post("/macro", async (req, res) => {
	const { text } = req.body;
	if (!text) return res.status(400).json({ message: "text required" });

	const prompt = `Jelaskan secara ringkas dan jelas isi dari informasi berikut terhadap pasar secara makroekonomi. Informasi: ${text}`;
	try {
		const result = await axios.post(
			"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
			{
				contents: [
					{
						parts: [{ text: prompt }]
					}
				]
			},
			{
				headers: {
					"Content-Type": "application/json",
					"X-goog-api-key": process.env.AI_API_KEY
				}
			}
		);
		res.json(result.data);
	} catch (err) {
		res.status(500).json({
			message: "Error from API",
			detail: err?.response?.data || err.message
		});
	}
});

router.post("/recommendation", async (req, res) => {
	const { text } = req.body;
	if (!text) return res.status(400).json({ message: "text required" });

	const prompt = `Berikan rekomendasi apa yang harus dilakukan sebagai investor pemula terhadap informasi berikut secara makroekonomi. Informasi: ${text}`;
	try {
		const result = await axios.post(
			"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
			{
				contents: [
					{
						parts: [{ text: prompt }]
					}
				]
			},
			{
				headers: {
					"Content-Type": "application/json",
					"X-goog-api-key": process.env.AI_API_KEY
				}
			}
		);
		res.json(result.data);
	} catch (err) {
		res.status(500).json({
			message: "Error from API",
			detail: err?.response?.data || err.message
		});
	}
});

export default router;
