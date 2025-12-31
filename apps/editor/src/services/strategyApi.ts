interface Strategy {
  id: string;
  name: string;
  code: string;
  problemTypeId: string;
}

const baseUrl = 'http://localhost:5000';

export const strategyApi = {
  listStrategies: async (type = ""): Promise<Strategy[]> => {
    const res = await fetch(`${baseUrl}/strategies` + (type ? ('?type=' + encodeURIComponent(type)) : ''));
    if (!res.ok) throw new Error('Failed to list strategies');
    return res.json() as Promise<Strategy[]>;
  },

  listAllStrategies: async (): Promise<Strategy[]> => {
    const res = await fetch(`${baseUrl}/strategies`);
    if (!res.ok) throw new Error('Failed to list all strategies');
    return res.json() as Promise<Strategy[]>;
  },

  getStrategy: async (id: string): Promise<Strategy> => {
    const res = await fetch(`${baseUrl}/strategies/${id}`);
    if (!res.ok) throw new Error('Strategy not found');
    return res.json() as Promise<Strategy>;
  },

  createStrategy: async (payload: { name: string; code: string }): Promise<Strategy> => {
    const res = await fetch(`${baseUrl}/strategies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create strategy: ' + await res.text());
    return res.json() as Promise<Strategy>;
  },

  updateStrategy: async (id: string, payload: { name: string; code: string }): Promise<Strategy> => {
    const res = await fetch(`${baseUrl}/strategies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update strategy: ' + await res.text());
    return res.json() as Promise<Strategy>;
  },

  deleteStrategy: async (id: string): Promise<void> => {
    const res = await fetch(`${baseUrl}/strategies/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error('Failed to delete strategy' + (txt ? ': ' + txt : ''));
    }
  }
};

export type { Strategy };

