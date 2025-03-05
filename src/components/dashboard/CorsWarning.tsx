
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ServerCrash } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CorsWarningProps {
  corsBlocked: boolean;
}

const CorsWarning: React.FC<CorsWarningProps> = ({ corsBlocked }) => {
  if (!corsBlocked) {
    return null;
  }

  const handleShowTechnicalDetails = () => {
    toast.info('CORS Restriction Details', {
      description: `
        The browser prevents direct API calls to Kraken for security reasons.
        In production, this would require a proxy server to handle API requests.
      `,
      duration: 6000,
    });
  };

  return (
    <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
      <CardContent className="p-4 flex items-start space-x-3">
        <ServerCrash className="h-5 w-5 mt-1 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <h3 className="font-medium text-amber-800 dark:text-amber-300">CORS Restrictions Detected</h3>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
            Your browser is preventing direct API calls to Kraken as a security measure. 
            In a production environment, you would need to implement a backend proxy to route these requests.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleShowTechnicalDetails}
              className="text-amber-800 border-amber-300 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/40"
            >
              View Technical Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CorsWarning;
