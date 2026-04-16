import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Tractor, Truck, Shield } from 'lucide-react';
import StacksWalletConnector from '@/components/StacksWalletConnector';
import { useOffchainData } from '@/hooks/useOffchainData';
import { createProduct, addCheckpoint, verifyCheckpoint, isStacksConnected, getStacksAddress } from '@/utils/stacksIntegration';

const SupplyChain = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getProduct, saveProduct } = useOffchainData();

  // Form states
  const [farmerForm, setFarmerForm] = useState({
    productId: '',
    productName: '',
    batchId: '',
    harvestDate: '',
    location: ''
  });

  const [checkpointForm, setCheckpointForm] = useState({
    productId: '',
    stage: 'processing',
    customStage: '',
    data: ''
  });

  const [verifyForm, setVerifyForm] = useState({
    productId: '',
    checkpointId: ''
  });

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = () => {
    const connected = isStacksConnected();
    setIsConnected(connected);
    if (connected) {
      setUserAddress(getStacksAddress());
    }
  };

  const handleFarmerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      toast.error('Please connect your Hiro wallet first');
      return;
    }

    if (!farmerForm.productId.trim()) {
      toast.error('Product ID is required');
      return;
    }

    if (!farmerForm.harvestDate) {
      toast.error('Harvest date is required');
      return;
    }

    setIsSubmitting(true);
    const pendingToastId = toast.loading('Waiting for wallet approval...');
    try {
      const harvestDateSeconds = Math.floor(new Date(farmerForm.harvestDate).getTime() / 1000);
      if (!Number.isFinite(harvestDateSeconds)) {
        toast.error('Please enter a valid harvest date');
        return;
      }

      const productId = farmerForm.productId.trim();
      const batchId = (farmerForm.batchId || farmerForm.productId).trim();
      const location = farmerForm.location.trim();

      const txId = await createProduct({
        productId,
        batchId,
        harvestDate: harvestDateSeconds,
        location,
      });

      toast.success(`Transaction submitted! TX: ${txId.slice(0, 10)}...`, { id: pendingToastId });

      // Store richer metadata off-chain (DynamoDB) keyed by the blockchain product ID.
      // Do this in the background so the UI doesn't feel "stuck" after the wallet approves.
      void saveProduct({
        blockchainId: productId,
        name: farmerForm.productName.trim(),
        owner: userAddress || undefined,
        batchId,
        location,
        currentStage: 'farm',
        lastTxId: txId,
      })
        .then(() => toast.success('Saved off-chain metadata to DynamoDB'))
        .catch((err) => {
          console.error('Off-chain save error:', err);
          toast.error('Failed to save off-chain metadata to DynamoDB');
        });

      setFarmerForm({ productId: '', productName: '', batchId: '', harvestDate: '', location: '' });
    } catch (error) {
      toast.error('Failed to create product', { id: pendingToastId });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckpointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      toast.error('Please connect your Hiro wallet first');
      return;
    }

    setIsSubmitting(true);
    const pendingToastId = toast.loading('Waiting for wallet approval...');
    try {
      const productId = checkpointForm.productId.trim();
      const stage = (checkpointForm.stage === 'custom'
        ? checkpointForm.customStage
        : checkpointForm.stage
      ).trim();
      if (!stage) {
        toast.error('Please enter a custom stage');
        return;
      }
      const data = checkpointForm.data.trim();

      const txId = await addCheckpoint({ productId, stage, data });

      // Preserve existing off-chain metadata and append latest stage/tx info.
      const existing = await getProduct(productId);
      await saveProduct({
        ...(existing || {}),
        blockchainId: productId,
        owner: userAddress || existing?.owner,
        currentStage: stage,
        lastTxId: txId,
      });

      toast.success(`Checkpoint submitted! TX: ${txId.slice(0, 10)}...`, { id: pendingToastId });
      setCheckpointForm({ productId: '', stage: 'processing', customStage: '', data: '' });
    } catch (error) {
      toast.error('Failed to add checkpoint', { id: pendingToastId });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      toast.error('Please connect your Hiro wallet first');
      return;
    }

    setIsSubmitting(true);
    const pendingToastId = toast.loading('Waiting for wallet approval...');
    try {
      const productId = verifyForm.productId.trim();
      const checkpointId = Number.parseInt(verifyForm.checkpointId, 10);
      if (!Number.isFinite(checkpointId)) {
        toast.error('Please enter a valid checkpoint ID');
        return;
      }

      const txId = await verifyCheckpoint({ productId, checkpointId });
      toast.success(`Verification submitted! TX: ${txId.slice(0, 10)}...`, { id: pendingToastId });
      setVerifyForm({ productId: '', checkpointId: '' });
    } catch (error) {
      toast.error('Failed to verify checkpoint', { id: pendingToastId });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent mb-4">
              Supply Chain Management
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Track your products from farm to table using blockchain technology
            </p>
            
            <div className="flex justify-center mb-6">
              <StacksWalletConnector 
                onConnect={checkConnection}
                onDisconnect={() => {
                  setIsConnected(false);
                  setUserAddress(null);
                }}
              />
            </div>

            {isConnected && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-center gap-2">
                  <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-green-800 dark:text-green-200">
                    Connected to Stacks Testnet
                  </span>
                  <Badge variant="secondary">
                    {userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          <Tabs defaultValue="farmer" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="farmer" className="gap-2">
                <Tractor className="h-4 w-4" />
                Create Product
              </TabsTrigger>
              <TabsTrigger value="transfer" className="gap-2">
                <Truck className="h-4 w-4" />
                Add Checkpoint
              </TabsTrigger>
              <TabsTrigger value="roles" className="gap-2">
                <Shield className="h-4 w-4" />
                Verify Checkpoint
              </TabsTrigger>
            </TabsList>

            <TabsContent value="farmer">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tractor className="h-5 w-5" />
                    Create New Product
                  </CardTitle>
                  <CardDescription>
                    Start a new product record on the Stacks blockchain
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleFarmerSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="productId">Product ID *</Label>
                      <Input
                        id="productId"
                        value={farmerForm.productId}
                        onChange={(e) => setFarmerForm(prev => ({ ...prev, productId: e.target.value }))}
                        placeholder="e.g., PROD-001"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="productName">Product Name *</Label>
                      <Input
                        id="productName"
                        value={farmerForm.productName}
                        onChange={(e) => setFarmerForm(prev => ({ ...prev, productName: e.target.value }))}
                        placeholder="e.g., Organic Tomatoes"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="batchId">Batch ID (Optional)</Label>
                      <Input
                        id="batchId"
                        value={farmerForm.batchId}
                        onChange={(e) => setFarmerForm(prev => ({ ...prev, batchId: e.target.value }))}
                        placeholder="e.g., BATCH-2024-001"
                      />
                    </div>

                    <div>
                      <Label htmlFor="harvestDate">Harvest Date *</Label>
                      <Input
                        id="harvestDate"
                        type="date"
                        value={farmerForm.harvestDate}
                        onChange={(e) => setFarmerForm(prev => ({ ...prev, harvestDate: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="location">Farm Location *</Label>
                      <Input
                        id="location"
                        value={farmerForm.location}
                        onChange={(e) => setFarmerForm(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="e.g., California, USA"
                        required
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={!isConnected || isSubmitting}
                      className="w-full"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Product'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transfer">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Add Supply Chain Checkpoint
                  </CardTitle>
                  <CardDescription>
                    Append an immutable checkpoint (processing/transport/retail/etc.) to a product
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCheckpointSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="checkpointProductId">Product ID</Label>
                      <Input
                        id="checkpointProductId"
                        value={checkpointForm.productId}
                        onChange={(e) => setCheckpointForm(prev => ({ ...prev, productId: e.target.value }))}
                        placeholder="e.g., PROD-001"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="stage">Stage</Label>
                      <select
                        id="stage"
                        value={checkpointForm.stage}
                        onChange={(e) => setCheckpointForm(prev => ({ ...prev, stage: e.target.value }))}
                        className="w-full p-2 border rounded-md bg-background"
                        required
                      >
                        <option value="processing">Processing</option>
                        <option value="transport">Transport</option>
                        <option value="retail">Retail</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    {checkpointForm.stage === 'custom' && (
                      <div>
                        <Label htmlFor="customStage">Custom Stage</Label>
                        <Input
                          id="customStage"
                          value={checkpointForm.customStage}
                          onChange={(e) => setCheckpointForm(prev => ({ ...prev, customStage: e.target.value }))}
                          placeholder="e.g., cold-storage"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="checkpointData">Checkpoint Data</Label>
                      <Textarea
                        id="checkpointData"
                        value={checkpointForm.data}
                        onChange={(e) => setCheckpointForm(prev => ({ ...prev, data: e.target.value }))}
                        placeholder="e.g., Temp 4C, QA passed, shipped via truck #12"
                        required
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={!isConnected || isSubmitting}
                      className="w-full"
                    >
                      {isSubmitting ? 'Submitting...' : 'Add Checkpoint'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="roles">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Verify a Checkpoint
                  </CardTitle>
                  <CardDescription>
                    Mark a checkpoint as verified on-chain (useful for regulators/auditors)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleVerifySubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="verifyProductId">Product ID</Label>
                      <Input
                        id="verifyProductId"
                        value={verifyForm.productId}
                        onChange={(e) => setVerifyForm(prev => ({ ...prev, productId: e.target.value }))}
                        placeholder="e.g., PROD-001"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="checkpointId">Checkpoint ID</Label>
                      <Input
                        id="checkpointId"
                        type="number"
                        value={verifyForm.checkpointId}
                        onChange={(e) => setVerifyForm(prev => ({ ...prev, checkpointId: e.target.value }))}
                        placeholder="e.g., 1"
                        required
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={!isConnected || isSubmitting}
                      className="w-full"
                    >
                      {isSubmitting ? 'Submitting...' : 'Verify Checkpoint'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default SupplyChain;
