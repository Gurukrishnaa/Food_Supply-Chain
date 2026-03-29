import { useState, useCallback } from 'react';
import axios from 'axios';
import { APP_CONFIG } from '../config';

export interface OffchainProductData {
  blockchainId: string;
  name?: string;
  ipfsHash?: string;
  highResImageUrl?: string;
  owner?: string;
  createdAt?: string;
}

export function useOffchainData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use axios instance to point to the EC2 backend
  const api = axios.create({
    baseURL: APP_CONFIG.EC2_BACKEND_URL,
    headers: { 'Content-Type': 'application/json' },
  });

  const getProduct = useCallback(async (blockchainId: string): Promise<OffchainProductData | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/products/${blockchainId}`);
      return response.data;
    } catch (err: any) {
      if (err.response?.status !== 404) {
        setError(err.message || 'Error fetching offchain data');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProduct = useCallback(async (productData: OffchainProductData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/products', productData);
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Error saving offchain data to EC2 backend');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getProduct, saveProduct, loading, error };
}
