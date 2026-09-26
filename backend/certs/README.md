Put the MongoDB client certificate here (never commit it — `*.pem` is git-ignored).

The file must contain the certificate **and** its private key:

    cat client.crt client.key > mongodb-client.pem

Then in `backend/.env`:

    MONGODB_URI=mongodb+srv://<your-cluster-host>/
    MONGODB_TLS_CERT_KEY_FILE=./certs/mongodb-client.pem

The path is relative to the `backend/` folder (where you run `cargo run`).
