import api from '../lib/api';

/**
 * Example service to interact with your EC2 backend, which in turn
 * talks to DynamoDB.
 */

// DynamoDB item shape used by the backend `/api/products` routes.
export interface OffchainProductItem {
  blockchainId: string;
  name?: string;
  owner?: string;
  batchId?: string;
  location?: string;
  currentStage?: string;
  ipfsHash?: string;
  highResImageUrl?: string;
  lastTxId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const dbService = {
  /**
   * Fetch all products from the EC2 backend
   */
  async getProducts(): Promise<OffchainProductItem[]> {
    const response = await api.get('/products');
    return response.data;
  },

  /**
   * Fetch a single product by blockchainId
   */
  async getProductById(blockchainId: string): Promise<OffchainProductItem> {
    const response = await api.get(`/products/${blockchainId}`);
    return response.data;
  },

  /**
   * Create a new product (upsert)
   */
  async createProduct(itemData: Omit<OffchainProductItem, 'createdAt' | 'updatedAt'>): Promise<OffchainProductItem> {
    const response = await api.post('/products', itemData);
    return response.data;
  },

  /**
   * Update an existing product
   */
  async updateProduct(blockchainId: string, updates: Partial<OffchainProductItem>): Promise<OffchainProductItem> {
    const response = await api.put(`/products/${blockchainId}`, updates);
    return response.data;
  },

  /**
   * Delete a product
   */
  async deleteProduct(blockchainId: string): Promise<void> {
    await api.delete(`/products/${blockchainId}`);
  }
};
