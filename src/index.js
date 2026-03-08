require('dotenv').config();
const express = require('express');

const valorantRouter = require('./routes/valorant');
const { initAgentData } = require('./agentData');
const { initRankIcons } = require('./rankIcons');
const { initMapData } = require('./mapData');
const { log } = require('./logger');

const app = express();
const PORT = process.env.PORT || 3000;
const START_TIME = Date.now();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: Math.floor((Date.now() - START_TIME) / 1000) });
});

app.use('/valorant', valorantRouter);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

(async () => {
  log('INIT', 'Loading static data (agents, rank icons, maps)...');
  await Promise.all([initAgentData(), initRankIcons(), initMapData()]);
  log('INIT', 'Static data loaded');
  app.listen(PORT, () => {
    log('INIT', `Server listening on port ${PORT}`);
  });
})();
