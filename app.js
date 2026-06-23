const express = require("express");
const app = express();
const port = process.env.PORT;
const path = require("path");
const Database = require("better-sqlite3");
const { randomUUID, createHash } = require("crypto");
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
var createError = require("http-errors");
const { rateLimit } = require("express-rate-limit");

const limiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minute
	limit: 3,
});

const helmet = require("helmet");
app.use(helmet());

// disable if not behind cloudflare or some funky thing
app.set("trust proxy", true);

app.use("/", express.static(path.join(__dirname, `public/`)));

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});

// setup

// add 28 to account for encryption overhead

const maxContent = 8000 + 28;

console.log("initializing entry database");
const db = new Database("./bin.db");

db.exec(
	`CREATE TABLE IF NOT EXISTS entries (epoch BIGINT NOT NULL, content TEXT NOT NULL, identifier TEXT UNIQUE NOT NULL, password BOOLEAN DEFAULT 0, psw_salt TEXT, psw_iv TEXT, content_iv TEXT, delete_upon_view BOOLEAN)`,
);

console.log("database initialized");

// submission logic

app.put("/submit", limiter, async (req, res, next) => {
	try {
		const content = req.body.content.data ?? null;
		if (content) {
			let uses = req.body["uses"] ? 1 : 0;
			const d = atob(content);
			if (d.length <= maxContent && d.length > 0) {
				if (
					!(!typeof content === String) &&
					/[\x80-\xFF]/.test(atob(content))
				) {
					const epoch = Date.now();
					this.contentIv = req.body.content.iv;

					if (req.body.psw?.salt ?? false) {
						this.password = 1;
						this.salt = req.body.psw.salt;
						this.iv = req.body.psw.iv;
					} else {
						this.password = null;
						this.salt = null;
						this.iv = null;
					}
					const insertion = await insertEntry(
						epoch,
						content,
						this.password,
						this.salt,
						this.iv,
						this.contentIv,
						uses,
					);
					return res.status(201).send({ identifier: insertion.identifier });
				} else {
					return res.sendStatus(400);
				}
			} else {
				return res.sendStatus(413);
			}
		}
		return res.sendStatus(400);
	} catch (e) {
		console.error(e);
		return res.sendStatus(500);
	}
});

async function insertEntry(
	epoch,
	content,
	password = null,
	salt = null,
	pwIv = null,
	contentIv = null,
	uses,
) {
	// console.log(salt, iv, password, epoch, content, uses);
	const identifier = await generateIdentifier(epoch, content);
	if (!password) {
		db.prepare(
			`INSERT INTO entries (epoch, content, identifier, content_iv, delete_upon_view) VALUES (?, ?, ?, ?, ?)`,
		).run(epoch, content, identifier, contentIv, uses);
	} else {
		db.prepare(
			`INSERT INTO entries (epoch, content, identifier, password, psw_salt, psw_iv, content_iv, delete_upon_view) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		).run(epoch, content, identifier, password, salt, pwIv, contentIv, uses);
	}
	return { identifier: identifier };
}

async function generateIdentifier(epoch, content) {
	const uuid = randomUUID();
	let hash = createHash("sha256").update(uuid).digest("hex");

	let h = createHash("sha256")
		.update(epoch + content)
		.digest("hex");
	h = h.split("", h.length / 5);

	hash = hash.split("", hash.length / 5);
	hash = hash + h;
	hash = hash.replaceAll(",", "");
	return hash;
}

// retrieval logic

app.get("/p/:identifier", async (req, res, next) => {
	const identifier = req.params.identifier;
	const data = db
		.prepare("SELECT * FROM entries WHERE identifier = ?")
		.get(identifier);
	if (data) {
		res.locals.content = data.content;

		res.locals.date =
			[
				"January",
				"February",
				"March",
				"April",
				"May",
				"June",
				"July",
				"August",
				"September",
				"October",
				"November",
				"December",
			][new Date(Math.floor(data.epoch)).getUTCMonth()] +
			" " +
			new Date(Math.floor(data.epoch)).getUTCDate() +
			" " +
			new Date(Math.floor(data.epoch)).getUTCFullYear() +
			" UTC";
		const diff = data.epoch + 1 * 1000 * 60 * 60 * 3 - Date.now();
		const minutes = Math.floor((diff / 1000 / 60) % 60);
		const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
		res.locals.expires = `${hours} hour${hours === 1 ? "" : "s"} and ${minutes} minute${minutes === 1 ? "" : "s"}`;
		res.locals.password = data.password;
		res.locals.content_iv = data.content_iv;
		if (res.locals.password) {
			res.locals.psw_salt = data.psw_salt;
			res.locals.psw_iv = data.psw_iv;

			res.locals.data = data.content;
		}
		if (data.delete_upon_view === 1) {
			db.prepare(`DELETE FROM entries WHERE identifier = ?`).run(identifier);
			res.locals.oneTimeUse = true;
		}
		// add deletion function
		return res.render("entry");
	}
	return next();
});
function b64ToBytes(b64) {
	const bin = atob(b64);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

// expiration - all entries expire after 3 hours

setInterval(clearExpired, 15 * 1000);

async function clearExpired() {
	db.exec(
		`DELETE FROM entries WHERE epoch < (strftime('%s', 'now', '-3 hours') * 1000)`,
	);
}

// other utils

// error handing

app.use(function (req, res, next) {
	next(createError(404));
});
app.use(function (err, req, res, next) {
	res.locals.message = err.message;

	res.locals.error = err.status;
	res.locals.host = req.hostname;
	// render the error page
	res.status(err.status || 500);
	// console.log(err)

	res.render("error");
});
