import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

import ragRouter from './src/routes/rag.router.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/rag', ragRouter);
app.use('/rag', ragRouter);

app.get('/', (req, res) => {
  res.status(200).send({ status: 200, message: 'API RAG en funcionamiento' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Servidor RAG iniciado en http://localhost:${PORT}`);
  });
}

export default app;
