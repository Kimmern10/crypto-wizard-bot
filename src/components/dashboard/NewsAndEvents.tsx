
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from 'lucide-react';

// Sample news data - in a real application this would come from an API
const sampleNews = [
  {
    id: 1,
    title: 'Bitcoin Breaks $40,000 Resistance Level',
    source: 'CryptoNews',
    date: '2023-12-15',
    url: '#'
  },
  {
    id: 2,
    title: 'Ethereum 2.0 Upgrade Set for Q1 2024',
    source: 'BlockchainInsider',
    date: '2023-12-12',
    url: '#'
  },
  {
    id: 3,
    title: 'Kraken Expands Services to New Markets',
    source: 'CryptoExchange Weekly',
    date: '2023-12-10',
    url: '#'
  },
  {
    id: 4,
    title: 'New Regulatory Framework for Crypto Trading',
    source: 'FinanceToday',
    date: '2023-12-05',
    url: '#'
  }
];

const NewsAndEvents: React.FC = () => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Market News</CardTitle>
        <CardDescription>Latest cryptocurrency news</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sampleNews.map(news => (
            <div key={news.id} className="space-y-1">
              <div className="flex items-start justify-between">
                <a 
                  href={news.url} 
                  className="text-sm font-medium hover:underline"
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  {news.title}
                  <ExternalLink className="inline-block ml-1 h-3 w-3" />
                </a>
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <span>{news.source}</span>
                <span className="mx-1">•</span>
                <span>{news.date}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default NewsAndEvents;
