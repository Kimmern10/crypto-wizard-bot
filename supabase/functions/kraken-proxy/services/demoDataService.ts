
// Demo data service for Kraken API proxy
// This provides realistic mock data for testing when not authenticated

/**
 * Generates mock responses for Kraken API endpoints
 * @param endpoint The API endpoint being called
 * @param data Request data (used to customize the response)
 * @returns Mock API response data
 */
export const getMockResponse = (endpoint: string, data: any = {}): any => {
  console.log(`Generating mock data for endpoint: ${endpoint}`);
  
  // Add some randomized delay for realistic simulation
  const simulateDelay = Math.random() < 0.3;
  if (simulateDelay) {
    // Simulate occasional slow responses
    console.log('Simulating slow response for demo mode');
  }
  
  // Time endpoint (public)
  if (endpoint === 'public/Time') {
    return {
      error: [],
      result: {
        unixtime: Math.floor(Date.now() / 1000),
        rfc1123: new Date().toUTCString()
      }
    };
  }
  
  // Balance endpoint (private)
  if (endpoint === 'private/Balance') {
    return {
      error: [],
      result: {
        'ZUSD': (10000 + Math.random() * 500).toFixed(4), 
        'XXBT': (1.5 + Math.random() * 0.2).toFixed(6),
        'XETH': (25.0 + Math.random() * 2).toFixed(6)
      }
    };
  }
  
  // OpenPositions endpoint (private)
  if (endpoint === 'private/OpenPositions') {
    // 70% chance of empty positions, 30% chance of some position
    const hasPositions = Math.random() > 0.7;
    
    if (!hasPositions) {
      return { error: [], result: {} };
    }
    
    return { 
      error: [],
      result: {
        'DEMO-POS-1': {
          ordertxid: 'DEMO-ORDER-1',
          pair: 'XXBTZUSD',
          time: Math.floor(Date.now()/1000) - 86400,
          type: Math.random() > 0.5 ? 'buy' : 'sell',
          ordertype: 'limit',
          cost: (3500 + Math.random() * 500).toFixed(2),
          fee: (10 + Math.random() * 5).toFixed(2),
          vol: (0.1 + Math.random() * 0.3).toFixed(6),
          vol_closed: '0',
          margin: (1750 + Math.random() * 250).toFixed(2),
          value: (3600 + Math.random() * 500).toFixed(2),
          net: (Math.random() > 0.5 ? 1 : -1 * (Math.random() * 100)).toFixed(2),
          misc: '',
          oflags: '',
          status: 'open'
        }
      }
    };
  }
  
  // TradesHistory endpoint (private)
  if (endpoint === 'private/TradesHistory') {
    return {
      error: [],
      result: {
        trades: {
          'DEMO-TRADE-1': {
            ordertxid: 'DEMO-ORDER-OLD-1',
            pair: 'XXBTZUSD',
            time: Math.floor(Date.now()/1000) - 86400,
            type: 'buy',
            ordertype: 'market',
            price: '36500.0',
            cost: '3650.0',
            fee: '7.3',
            vol: '0.1',
            margin: '0',
            misc: ''
          },
          'DEMO-TRADE-2': {
            ordertxid: 'DEMO-ORDER-OLD-2',
            pair: 'XXBTZUSD',
            time: Math.floor(Date.now()/1000) - 43200,
            type: 'sell',
            ordertype: 'limit',
            price: '37800.0',
            cost: '1890.0',
            fee: '3.78',
            vol: '0.05',
            margin: '0',
            misc: ''
          }
        },
        count: 2
      }
    };
  }
  
  // AddOrder endpoint (private)
  if (endpoint === 'private/AddOrder') {
    return {
      error: [],
      result: {
        descr: { order: `${data.type} ${data.volume} ${data.pair} @ ${data.ordertype}` },
        txid: ['DEMO-NEW-ORDER-' + Math.random().toString(36).substring(2, 10)]
      }
    };
  }
  
  // Default fallback for unknown endpoints
  return { 
    error: [],
    result: {
      message: 'Demo data for endpoint not implemented',
      timestamp: Date.now(),
      endpoint
    }
  };
};
