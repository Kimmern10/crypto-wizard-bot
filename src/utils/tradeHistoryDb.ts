
import { supabase } from '@/integrations/supabase/client';

export interface TradeRecord {
  user_id: string;
  pair: string;
  type: string;
  price: number;
  volume: number;
  cost: number;
  fee: number;
  order_type: string;
  external_id: string;
  created_at: string;
}

export const fetchTradesFromSupabase = async (): Promise<any[] | null> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      console.log('No active session found');
      return null;
    }
    
    const { data: localTrades, error } = await supabase
      .from('trade_history')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching trades from Supabase:', error);
      return null;
    }
    
    if (localTrades && localTrades.length > 0) {
      console.log('Using trade history from Supabase:', localTrades);
      return localTrades.map(trade => ({
        id: trade.external_id || trade.id,
        pair: trade.pair,
        type: trade.type,
        price: parseFloat(trade.price.toString()),
        volume: parseFloat(trade.volume.toString()),
        time: trade.created_at,
        orderType: trade.order_type,
        cost: parseFloat(trade.cost.toString()),
        fee: parseFloat(trade.fee.toString())
      }));
    }
    
    return [];
  } catch (e) {
    console.error('Error fetching trade history from Supabase:', e);
    return null;
  }
};

export const saveTradesToSupabase = async (trades: any[]): Promise<void> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      console.log('No active session found, cannot save trades');
      return;
    }
    
    for (const trade of trades) {
      const tradeRecord: TradeRecord = {
        user_id: session.session.user.id,
        pair: trade.pair,
        type: trade.type,
        price: trade.price,
        volume: trade.volume,
        cost: trade.cost,
        fee: trade.fee,
        order_type: trade.orderType,
        external_id: trade.id,
        created_at: trade.time
      };
      
      const { error } = await supabase
        .from('trade_history')
        .upsert(tradeRecord, { onConflict: 'external_id' });
      
      if (error) {
        console.error('Error upserting trade:', error);
      }
    }
    
    console.log('Trade history saved to Supabase');
  } catch (e) {
    console.error('Error saving trade history to Supabase:', e);
  }
};

export const saveOrderToSupabase = async (
  orderId: string,
  orderParams: {
    pair: string;
    type: 'buy' | 'sell';
    ordertype: 'market' | 'limit';
    volume: string;
    price?: string;
  }
): Promise<void> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      console.log('No active session found, cannot save order');
      return;
    }
    
    const price = orderParams.price || '0';
    const tradeRecord: TradeRecord = {
      user_id: session.session.user.id,
      pair: orderParams.pair,
      type: orderParams.type,
      price: parseFloat(price),
      volume: parseFloat(orderParams.volume),
      cost: parseFloat(price) * parseFloat(orderParams.volume),
      fee: 0,
      order_type: orderParams.ordertype,
      external_id: orderId,
      created_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('trade_history')
      .insert(tradeRecord);
    
    if (error) {
      console.error('Error inserting into trade_history:', error);
    } else {
      console.log('Order saved to trade history');
    }
  } catch (e) {
    console.error('Error saving order to trade history:', e);
  }
};
