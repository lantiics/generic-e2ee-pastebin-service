async function decryptPaste() {
	try {
		const text = document.getElementById("text").innerText;
		document.getElementById("text").style.display = "unset";
		document.getElementById("text").innerText =
			"decrypting data. this should show an error if the action is unsuccessful.";
		console.log(window.atob(text));
		console.log(text, window.atob(text));
		const cypher = Uint8Array.from(window.atob(text), (c) =>
			c.charCodeAt(0),
		).buffer;
		const info = await getPrivkey();
		const key = info.key;

		const iv = info.iv;
		console.log(iv, "iv info");
		const params = {
			name: "AES-GCM",
			iv: iv,
		};
		console.log(cypher, "");
		const plaintext = await decrypt(params, key, cypher);

		if (plaintext !== 0) {
			document.getElementById("text").innerText = plaintext;
		} else {
			document.getElementById("text").innerText = "failed to decrypt data";
		}
		document.getElementById("text").style.display = "unset";
	} catch (e) {
		document.getElementById("text").style.display = "unset";
		document.getElementById("text").innerText = "failed to decrypt data";
	}
}

async function getPrivkey() {
	const crypto = window.crypto.subtle;
	const hash = location.hash.replace("#", "");
	const key = window.atob(hash.split("&")[0]);
	let iv = window.atob(hash.split("&")[1]);
	iv = iv.split(",");
	const decoder = new TextDecoder();
	// console.log(new TextDecoder().decode(ascii));

	// console.log(key, iv);
	console.log(key);
	const keyBytes = Uint8Array.from(key, (c) => c.charCodeAt(0));
	const ivBytes = new Uint8Array(iv);

	console.log(ivBytes, "ivbytes");
	// const keyBytes = Uint8Array.from(key, (c) => c.charCodeAt(0));
	const length = keyBytes.length * 8;
	console.log(decoder.decode(keyBytes));
	const privKey = await crypto.importKey(
		"raw",
		keyBytes,
		{ name: "AES-GCM", length },
		false,
		["encrypt", "decrypt"],
	);
	return { key: privKey, iv: ivBytes };
}

async function decrypt(algorithm, privKey, cypher) {
	const crypto = window.crypto.subtle;
	const decoder = new TextDecoder();
	console.log(algorithm, privKey, cypher);
	return decoder.decode(await crypto.decrypt(algorithm, privKey, cypher));
}

document.addEventListener("DOMContentLoaded", decryptPaste);
