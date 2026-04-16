import { 
  openContractCall,
  AppConfig,
  UserSession
} from '@stacks/connect';
import {
  uintCV,
  stringAsciiCV
} from '@stacks/transactions';
import * as stacksNetwork from '@stacks/network';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });
const network = stacksNetwork.createNetwork('testnet');

// Contract details
const CONTRACT_ADDRESS = 'STW42W7AEKZ2EFYH834C6DW9272JHT1PHM92FY88';
const CONTRACT_NAME = 'supply-chain';

function openContractCallForTxId(options: Parameters<typeof openContractCall>[0]): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const result = openContractCall({
        ...options,
        onFinish: (data) => {
          options.onFinish?.(data);
          resolve(data.txId);
        },
        onCancel: () => {
          options.onCancel?.();
          reject(new Error('Transaction cancelled'));
        },
      });

      // Some versions return `void` (no promise). Guard before attaching handlers.
      const maybePromise = result as unknown;
      if (typeof maybePromise === 'object' && maybePromise !== null && typeof (maybePromise as any).catch === 'function') {
        (maybePromise as any).catch(reject);
      }
    } catch (err) {
      reject(err);
    }
  });
}

export const createProduct = async (params: {
  productId: string;
  batchId: string;
  harvestDate: number;
  location: string;
}): Promise<string> => {
  if (!userSession.isUserSignedIn()) {
    throw new Error('User not signed in');
  }

  const txId = await openContractCallForTxId({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'create-product',
    functionArgs: [
      stringAsciiCV(params.productId),
      stringAsciiCV(params.batchId),
      uintCV(params.harvestDate),
      stringAsciiCV(params.location),
    ],
    network,
    onFinish: (data) => console.log('Product created. Transaction ID:', data.txId),
  });

  return txId;
};

export const addCheckpoint = async (params: {
  productId: string;
  stage: string;
  data: string;
}): Promise<string> => {
  if (!userSession.isUserSignedIn()) {
    throw new Error('User not signed in');
  }

  const txId = await openContractCallForTxId({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'add-checkpoint',
    functionArgs: [
      stringAsciiCV(params.productId),
      stringAsciiCV(params.stage),
      stringAsciiCV(params.data),
    ],
    network,
    onFinish: (data) => console.log('Checkpoint added. Transaction ID:', data.txId),
  });

  return txId;
};

export const verifyCheckpoint = async (params: {
  productId: string;
  checkpointId: number;
}): Promise<string> => {
  if (!userSession.isUserSignedIn()) {
    throw new Error('User not signed in');
  }

  const txId = await openContractCallForTxId({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'verify-checkpoint',
    functionArgs: [
      stringAsciiCV(params.productId),
      uintCV(params.checkpointId),
    ],
    network,
    onFinish: (data) => console.log('Checkpoint verification submitted. Transaction ID:', data.txId),
  });

  return txId;
};

export const getBatchFromStacks = async (batchId: number) => {
  try {
    // This would require a read-only function call to the contract
    // For now, we'll return a mock response
    console.log('Getting batch from Stacks:', batchId);
    return {
      batchId,
      product: 'Organic Tomatoes',
      origin: 'SP...',
      owner: 'SP...',
      createdAt: Date.now()
    };
  } catch (error) {
    console.error('Error getting batch from Stacks:', error);
    throw error;
  }
};

export const getBatchHistory = async (batchId: number) => {
  try {
    // This would require multiple read-only function calls
    console.log('Getting batch history for:', batchId);
    return [
      { owner: 'SP...farmer', blockHeight: 123456 },
      { owner: 'SP...processor', blockHeight: 123460 },
      { owner: 'SP...retailer', blockHeight: 123465 }
    ];
  } catch (error) {
    console.error('Error getting batch history:', error);
    throw error;
  }
};

export const isStacksConnected = (): boolean => {
  return userSession.isUserSignedIn();
};

export const getStacksAddress = (): string | null => {
  if (!userSession.isUserSignedIn()) return null;
  
  const userData = userSession.loadUserData();
  return userData.profile.stxAddress.testnet;
};

export { userSession };
