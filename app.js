const express = require("express");
const app = express();
const port = 3000;
const path = require("path");
const Database = require("better-sqlite3");
const { randomUUID, createHash } = require("crypto");
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
var createError = require("http-errors");

// disable if not behind cloudflare or some funky thing
app.set("trust proxy", true);

app.use("/", express.static(path.join(__dirname, `public/`)));

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});

// setup
const maxContent = 8000;
const db = new Database("./bin.db");

db.exec(
	`CREATE TABLE IF NOT EXISTS entries (epoch BIGINT NOT NULL, content TEXT NOT NULL, identifier TEXT UNIQUE NOT NULL, uses INT NOT NULL DEFAULT 1)`,
);

// submission logic

app.put("/submit", async (req, res, next) => {
	try {
		const content = req.body["content"] ?? null;
		if (content) {
			const uses = req.body["uses"] ?? null;
			if (
				content.length <= maxContent &&
				content.length > 0 &&
				!(typeof content == null) &&
				!["", " "].includes(content)
			) {
				const epoch = Date.now();

				const identifier = await generateIdentifier(epoch, content);

				db.prepare(`INSERT INTO entries VALUES (?, ?, ?, ?)`).run(
					epoch,
					content,
					identifier,
					uses ?? 1,
				);
				return res.status(201).send({ identifier: identifier });
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
		return res.render("entry");
	}
	return next();
});

// expiration

setInterval(clearExpired, 15 * 1000);

async function clearExpired() {
	db.prepare(
		`DELETE FROM entries WHERE ((epoch - ${Date.now()})/(1*1000*60*60*24))`,
	);
}

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
