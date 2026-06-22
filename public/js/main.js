export class Key {
	constructor(iv, salt, algorithm) {
		this.iv = iv ?? window.crypto.getRandomValues(new Uint8Array(12));
		this.algorithm = algorithm ?? {
			name: "AES-GCM",
			length: 256,
		};
		this.subtle = window.crypto.subtle;
		this.salt = salt ?? window.crypto.getRandomValues(new Uint8Array(16));
		this.encoder = new TextEncoder();
	}

	async generate() {
		this.key = this.subtle.generateKey(this.algorithm, true, [
			"encrypt",
			"decrypt",
		]);
		return this.key;
	}
	async derive(material) {
		const algorithm = {
			name: "PBKDF2",
			hash: "SHA-256",
			salt: this.salt,
			iterations: 100000,
		};
		// console.log(this.salt);
		const derived = await this.subtle.deriveKey(
			algorithm,
			material,
			{ name: "AES-GCM", length: 256 },
			true,
			["wrapKey", "unwrapKey"],
		);
		return derived;
	}

	// import a key, only used with password generation
	async importKey(key, name = "AES-GCM", params) {
		// console.log(key, name, params);
		const imported = await this.subtle.importKey(
			"raw",
			key,
			name,
			true,
			params,
		);
		this.key = imported;
		return imported;
	}

	// generate a key from a string password
	async generatePassword(pw) {
		const keyMaterial = await this.importKey(
			this.encoder.encode(pw),
			{ name: "PBKDF2" },
			["deriveKey"],
		);
		const generated = await this.derive(keyMaterial);
		this.key = generated;
		return generated;
	}

	async exportKey(key) {
		const exported = await this.subtle.exportKey("raw", key);
		// console.log(exported, "exported key");
		this.exported = exported;
		return exported;
	}

	// unwrap/wrap a key, these should be used alongside those generated from passwords

	async unwrap(wrapper, key) {
		const format = "raw";
		// console.log(`this iv is ${this.iv} `, this.iv);
		// console.log(key, wrapper, this.iv, "yoo");
		return await this.subtle.unwrapKey(
			"raw",
			key,
			wrapper,
			{
				name: "AES-GCM",
				iv: this.iv,
			},
			"AES-GCM",
			true,
			["encrypt", "decrypt"],
		);
	}

	async wrap(wrapper, key) {
		const format = "raw";
		// console.log(`this iv is ${this.iv}`);
		return await this.subtle.wrapKey("raw", key, wrapper, {
			name: "AES-GCM",
			iv: this.iv,
		});
	}
}

export class Cypher {
	constructor(key, iv) {
		this.key = key;
		this.iv = iv ?? window.crypto.getRandomValues(new Uint8Array(12));
		this.algorithm = {
			name: "AES-GCM",
			iv: this.iv,
		};
		this.crypto = window.crypto;
		this.subtle = window.crypto.subtle;
	}
	async decrypt(data) {
		// console.log(this.key, this.algorithm, data);
		return await this.subtle.decrypt(this.algorithm, this.key, data);
	}

	async encrypt(data) {
		// console.log(this.key, this.algorithm, data);
		return {
			data: await this.subtle.encrypt(this.algorithm, this.key, data),
			iv: this.iv,
		};
	}
}

// (async () => {
// 	encryptKey("123", await encryptData("yaa"));
// })();

// (async () => {
// 	encryptData("mhm");
// })();

export function bytesToB64(bytes) {
	let s = "";
	for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
	return window.btoa(s);
}

export function b64ToBytes(b64) {
	const bin = window.atob(b64);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

export function bufferToB64(h) {
	let bytes = new Uint8Array(h);
	let s = "";
	for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
	return window.btoa(s);
}

export async function createUintArray(text) {
	return await Uint8Array.from(text, (c) => c.charCodeAt(0));
}
export async function createBuffer(text) {
	return await (
		await Uint8Array.from(text, (c) => c.charCodeAt(0))
	).buffer;
}
export function toUuint(key) {}

// document.addEventListener("DOMContentLoaded", queryPassword);
// encryptData("rawr");
