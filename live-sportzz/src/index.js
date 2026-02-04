import express from 'express';
import { matchRouter } from './routes/matches';

const app = express();
const PORT = 8000;

app.use(express.json());

app.get('/', (_req, res) => {
    res.send("Hello from express js");
});

app.use("/matches", matchRouter);

app.listen(PORT, () => {
    console.log(`Hello from port http://localhost:${PORT}`);
});