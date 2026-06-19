const maxContent = 8000;

document.addEventListener("DOMContentLoaded", () => {
	const userElem = document.querySelector(".user");
	const userInput = document.getElementById("input");
	userInput.addEventListener("focusin", () => {
		userElem.style.borderColor = "#ffffff";
	});
	userInput.addEventListener("focusout", () => {
		userElem.removeAttribute("style");
	});
	userInput.addEventListener("input", (event) => {
		updateText(event);
	});
});

function updateText(event) {
	const userInput = document.getElementById("input");
	const curScroll = window.scrollY;
	userInput.style.height = "auto";
	userInput.style.height = userInput.scrollHeight + "px";
	window.scroll(null, curScroll);
	const charSpan = document.getElementById("currentChars");
	const charElem = document.querySelector(".charcount");
	const charCount = userInput.value.length;
	charSpan.innerText = charCount;
	if (charCount > maxContent) {
		document.querySelector(".submit").disabled = true;
		charSpan.style.color = "var(--error)";
	} else if (charCount <= maxContent && charCount > 0) {
		if (document.querySelector(".submit").disabled) {
			document.querySelector(".submit").removeAttribute("disabled");
			charSpan.removeAttribute("style");
		}
	} else if (charCount === 0) {
		document.querySelector(".submit").disabled = true;
	}
}

async function submitPaste(content) {
	const submitBtn = document.querySelector(".submit");

	if (content.length <= maxContent) {
		const enc = await encryptData(content);
		content = enc.data;
		console.log(content);
		submitBtn.disabled = true;
		const req = await fetch("/submit", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content: content }),
		});
		if (req.ok) {
			submitBtn.style.borderColor = "var(--success)";
			const identifier = (await req.json()).identifier;
			setTimeout(() => {
				submitBtn.removeAttribute("style");
				submitBtn.removeAttribute("disabled");
				intermissal(identifier, enc.decryption, enc.iv);
			}, 1000);
		} else {
			submitBtn.style.borderColor = "var(--error)";
			alert("failed to submit");
			setTimeout(() => {
				submitBtn.removeAttribute("style");
				submitBtn.removeAttribute("disabled");
			}, 2000);
		}
	}
}

function intermissal(identifier, privkey, iv) {
	document.getElementById("bin").style.alignContent = "center";
	document.getElementById("bin").innerHTML =
		"successfully submitted. you can find your paste at " +
		`<a href="/p/${identifier}#${privkey}&${iv}">https://${window.location.host}/p/${identifier}#${privkey}&${iv}`;
}

// encryption

async function encryptData(data) {
	const crypto = window.crypto.subtle;
	const decode = new TextDecoder();
	const b64 = new ArrayBuffer(data.length);

	let bytes = new Uint8Array(b64);
	const nonce = window.btoa(self.crypto.randomUUID());
	for (let i = 0; i < data.length; i++) {
		bytes[i] = data.charCodeAt(i);
	}
	data = bytes.buffer;

	console.log(decode.decode(data), data);

	const algorithm = {
		name: "AES-GCM",
		length: 256,
		// publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
		// hash: "SHA-512",
	};
	const iv = window.crypto.getRandomValues(new Uint8Array(12));
	const algoParams = {
		name: "AES-GCM",
		iv: iv,
	};
	console.log(algoParams);
	const key = await crypto.generateKey(algorithm, true, ["encrypt", "decrypt"]);
	console.log(key);
	const encrypted = await crypto.encrypt(algoParams, key, data);
	console.log(encrypted, "encrypted data");
	console.log(decode.decode(encrypted));

	// const d = decode.decode(encrypted);
	console.log(await crypto.decrypt(algoParams, key, encrypted), "mhm");
	const decrypted = decode.decode(
		await crypto.decrypt(algoParams, key, encrypted),
	);

	// console.log()
	const pKey = await crypto.exportKey("raw", key);
	bytes = new Uint8Array(pKey);
	let s = "";
	for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);

	const privKey = window.btoa(s);
	bytes = new Uint8Array(encrypted);
	s = "";
	for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
	console.log(s, "THISTHISTHIS");
	const d = window.btoa(s);
	console.log(d, "s");
	// console.log(window.btoa(privKey));
	console.log(privKey, pKey, key, window.atob(privKey));
	console.log("iv: ", iv);
	const info = {
		data: d,
		decryption: privKey,
		iv: window.btoa(iv),
	};
	// const privKey = key.privateKey;
	// console.log("PRIVKEY: ", privKey);
	// console.log(window.btoa((await crypto.exportKey("jwk", privKey)).d));
	return info;
}

encryptData("rawr");
