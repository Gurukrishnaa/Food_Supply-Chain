import api from '../lib/api';

/**
 * Example service to interact with your EC2 backend, which in turn
 * talks to DynamoDB.
 */

// Example generic type for the data you expect from DynamoDB
export interface SupplyChainItem {
  id: string;
  name: string;
  status: string;
  createdAt?: string;
}

export const dbService = {
  /**
   * Fetch all items from the EC2 backend
   */
  async getItems(): Promise<SupplyChainItem[]> {
    const response = await api.get('/items');
    return response.data;
  },

  /**
   * Fetch a single item by ID
   */
  async getItemById(id: string): Promise<SupplyChainItem> {
    const response = await api.get(`/items/${id}`);
    return response.data;
  },

  /**
   * Create a new item
   */
  async createItem(itemData: Omit<SupplyChainItem, 'id'>): Promise<SupplyChainItem> {
    const response = await api.post('/items', itemData);
    return response.data;
  },

  /**
   * Update an existing item
   */
  async updateItem(id: string, updates: Partial<SupplyChainItem>): Promise<SupplyChainItem> {
    const response = await api.put(`/items/${id}`, updates);
    return response.data;
  },

  /**
   * Delete an item
   */
  async deleteItem(id: string): Promise<void> {
    await api.delete(`/items/${id}`);
  }
};
