import express from 'express';

const app = express();
const PORT = 8000;

app.use(express.json());

app.get('/', (_req, res) => {
    res.send("Hello from express js");
});

app.get(PORT, () => {
    console.log(`Hello from port http://localhost:${PORT}`);
});