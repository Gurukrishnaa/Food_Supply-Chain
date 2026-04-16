import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ProductQRGenerator from '@/components/ProductQRGenerator';
import QRScannerComponent from '@/components/QRScanner';
import { useWallet } from '@/hooks/useWallet';
import { useOffchainData } from '@/hooks/useOffchainData';
import { recordProductOnBlockchain, createProductRecord, SupplyChainProduct } from '@/utils/blockchain';
import { toast } from 'sonner';
import { QrCode, Scan, Package, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const QRTools = () => {
  const { address, isConnected, walletType } = useWallet();
  const { saveProduct } = useOffchainData();
  const [isRecording, setIsRecording] = useState(false);

  const handleQRGenerate = async (qrData: string) => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setIsRecording(true);
      const parsedData = JSON.parse(qrData);
      
      const product: SupplyChainProduct = createProductRecord({
        id: parsedData.id,
        name: parsedData.name || 'Unknown Product',
        origin: 'Generated via QR Tools',
        currentLocation: 'Initial Location',
        owner: address,
        blockchain: walletType === 'metamask' ? 'ethereum' : 'stacks',
      });

      const txHash = await recordProductOnBlockchain(product, address);
      toast.success(`Product recorded on ${walletType} blockchain! TX: ${txHash.slice(0, 10)}...`);

      // Store off-chain metadata in DynamoDB (via the EC2 backend), keyed by the blockchain product ID.
      // QR payload currently includes id/name only; extra fields are accepted if you later extend QR payload.
      try {
        await saveProduct({
          blockchainId: product.id,
          name: product.name,
          ipfsHash: parsedData.ipfsHash,
          highResImageUrl: parsedData.highResImageUrl,
          owner: address,
        });
        toast.success('Saved off-chain metadata to DynamoDB');
      } catch (err) {
        console.error('Off-chain save error:', err);
        toast.error('Recorded on blockchain, but failed to save to DynamoDB');
      }
    } catch (error) {
      toast.error('Failed to record product on blockchain');
      console.error('Blockchain recording error:', error);
    } finally {
      setIsRecording(false);
    }
  };

  const handleQRScan = (data: any) => {
    console.log('Scanned QR data:', data);
    
    if (data.id) {
      // If it's a product QR, you could navigate to tracking page
      window.open(`/track/${data.id}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent mb-4">
              QR Code Tools
            </h1>
            <p className="text-lg text-muted-foreground">
              Generate and scan QR codes for supply chain tracking
            </p>
          </div>

          {!isConnected && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Connect your wallet to record products on the blockchain when generating QR codes.
              </AlertDescription>
            </Alert>
          )}

          {isConnected && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-green-800 dark:text-green-200">
                  Connected to {walletType} wallet - Products will be recorded on blockchain
                </span>
                <Badge variant="secondary">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </Badge>
              </div>
            </div>
          )}

          <Tabs defaultValue="generate" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate" className="gap-2">
                <QrCode className="h-4 w-4" />
                Generate QR Code
              </TabsTrigger>
              <TabsTrigger value="scan" className="gap-2">
                <Scan className="h-4 w-4" />
                Scan QR Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create Product QR Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <ProductQRGenerator 
                      onGenerate={handleQRGenerate}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scan" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Scan Product QR Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <QRScannerComponent 
                      onScan={handleQRScan}
                      onError={(error) => toast.error(error)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How to Generate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>1. Enter a unique product ID</p>
                <p>2. Optionally add a product name</p>
                <p>3. Click "Generate QR Code"</p>
                <p>4. Download or copy the QR code</p>
                <p>5. If wallet connected, product is recorded on blockchain</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How to Scan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>1. Click "Start Scanning"</p>
                <p>2. Allow camera permissions</p>
                <p>3. Point camera at QR code</p>
                <p>4. View decoded product information</p>
                <p>5. Click tracking links to view details</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRTools;
