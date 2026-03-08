const AGENT_DATA = {};

async function initAgentData() {
  try {
    const res = await fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data } = await res.json();
    for (const agent of data) {
      AGENT_DATA[agent.displayName] = {
        icon: agent.displayIcon,
        role: agent.role?.displayName ?? null,
        portrait: agent.fullPortrait,
        killfeedPortrait: agent.killfeedPortrait,
      };
    }
    console.log(`Loaded data for ${data.length} agents`);
  } catch (err) {
    console.warn(`Warning: failed to load agent data — ${err.message}`);
  }
}

module.exports = { AGENT_DATA, initAgentData };
