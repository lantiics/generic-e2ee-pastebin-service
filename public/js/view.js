import {
	Key,
	Cypher,
	bufferToB64,
	bytesToB64,
	createUintArray,
	b64ToBytes,
	createBuffer,
} from "./main.js";

async function decryptPaste() {
	try {
		const text = document.getElementById("text");
		const content = document
			.querySelector("meta[name='data']")
			.getAttribute("content");
		const passwordStatus =
			document.querySelector("meta[name='pw']")?.getAttribute("content") ===
				"1" ?? null;
		const data_iv = await (await fetch("?iv=1")).text();
		console.log(data_iv);
		if (!passwordStatus) {
			const keyB64 = location.hash.replace("#", "");
			const key = new Key();
			console.log("no password required, continuing");
			const keyData = b64ToBytes(keyB64);
			await key.importKey(keyData, "AES-GCM", ["encrypt", "decrypt"]);
			const privKey = key.key;
			const iv = await new Uint8Array(atob(data_iv).split(","));

			const contentData = await b64ToBytes(content);

			const cypher = new Cypher(privKey, iv);
			const decypher = atob(
				await bufferToB64(await cypher.decrypt(contentData)),
			);
			console.log(decypher);
			text.innerText = decypher;
		} else {
			console.log("password required, prompting user");
			const password = location.hash.replace("#", "");

			const salt = document
				.querySelector("meta[name='psw_salt']")
				.getAttribute("content");
			const psw_iv = document
				.querySelector("meta[name='psw_iv']")
				.getAttribute("content");
			// console.log(psw_iv);

			// console.log(salt, "salt");
			// const data_iv = document
			// 	.querySelector("meta[name='data_iv']")
			// 	.getAttribute("content");
			const ps = await doPassword(password, salt, psw_iv);

			if (ps != 0) {
				// console.log("WOO");
				const cypher = new Cypher(ps, new Uint8Array(atob(data_iv).split(",")));
				const decrypt = new TextDecoder().decode(
					await cypher.decrypt(b64ToBytes(content)),
				);
				if (decrypt) {
					text.innerText = decrypt;
					text.style.display = "block";
					document.getElementById("popup-container").style.display = "none";
				}
			}
		}
	} catch (e) {
		document.getElementById("text").style.display = "unset";
		document.getElementById("text").innerText = "failed to decrypt data";
		document.querySelector(".date").innerText += " - decryption failed";
		console.error(e);
	}
}

function togglePw() {
	usepw = !usepw;

	document.getElementById("pwbtn").style.borderColor = usepw
		? "var(--success)"
		: "var(--error)";
}

async function doPassword(password, salt, psw_iv) {
	const btn = document.getElementById("password");
	const h = document.getElementById("popup");
	const container = document.getElementById("popup-container");
	const pw = document.getElementById("password");
	const submit = document.getElementById("pw-submit");
	// console.log(salt);

	return new Promise((resolve, reject) => {
		submit.addEventListener("click", handleCheck);
		async function handleCheck() {
			submit.innerText = "attempting...";
			const test = await testPassword(pw.value, salt, psw_iv, password);
			if (test != 0) {
				submit.removeEventListener("click", handleCheck);
				submit.innerText = "successful";
				return resolve(test);
			} else {
				submit.innerText = "failed";
			}
		}
	});
}

async function testPassword(pw, salt, psw_iv, enc) {
	try {
		salt = b64ToBytes(salt);

		psw_iv = b64ToBytes(psw_iv);
		const key = new Key(psw_iv, salt);
		await key.generatePassword(pw);
		return await key.unwrap(await key.key, await createBuffer(atob(enc)));
	} catch (e) {
		console.error(e);
		return 0;
	}
}

document.addEventListener("DOMContentLoaded", decryptPaste);
