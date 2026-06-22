# generic end-to-end encrypted pastebin service
This is a project I created in 3 days, inspired by PrivateBin and Ente Paste.
All message content is stored encrypted, and keys are generated in the browser.
All non-sensitive information is stored as Base64 encoded data. This includes the initialization vectors used for generating encryption keys, and, if applicable, the salt used for deriving a key from a password.
After submission, the Base64-encoded key used to initially encrypted the message is appended to the URL of the paste after a *#* hash.
Message content is decrypted locally using the provided key.

Entries automatically expire after 3 hours by default, and can optionally be deleted immediately upon being viewed.

This runs on Express Webserver. To run, simply:
```
git clone git@github.com:lantiics/generic-e2ee-pastebin-service.git
cd generic-e2ee-pastebin-service
npm install
npm run start
```
###### The default production port is `3010`, `npm run dev` for development runs on port `8000` by default.

<img width="1197" height="921" alt="image" src="https://github.com/user-attachments/assets/6245a82d-804e-458d-894c-1662d5225402" />


## Passwords
Entries can optionally be further protected with a password.
If a password is given, the *key* used to encrypt the entry content is *wrapped* with a key derived from the password. This key is then encoded to Base64 and replaces the unencrypted key in the URL mentioned above. The vectors used for generation, which are not sensitive, are encoded and stored as Base64 serverside.
Upon viewing an entry, the user is prompted for a password which will then be used to derive an identical key to decrypt the primary key. The primary key is then used to decrypt the message contents.
