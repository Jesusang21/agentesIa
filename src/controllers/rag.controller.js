import { ragService } from '../services/rag.service.js';

export const ragController = async (req, res) => {
  const result = await ragService(req.body);
  res.status(result.status).send(result.message);
};
