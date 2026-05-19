import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth';

interface Bid {
  id: string;
  amount: number;
  bidderId: string;
  bidderName: string;
  timestamp: Date;
}

interface AuctionNotification {
  type: 'outbid' | 'won' | 'ended';
  title: string;
  message: string;
  auctionId?: string;
}

export function useAuctionSocket(auctionId: string) {
  const socket = ref<Socket | null>(null);
  const isConnected = ref(false);
  const latestBid = ref<Bid | null>(null);
  const error = ref<string | null>(null);

  const authStore = useAuthStore();

  const connect = () => {
    if (socket.value?.connected) return;

    // Connect to WebSocket server
    socket.value = io('/auction', {
      transports: ['websocket'],
      auth: {
        token: authStore.token,
      },
    });

    socket.value.on('connect', () => {
      isConnected.value = true;
      error.value = null;
      // Join the auction room
      socket.value?.emit('joinAuction', { auctionId });
    });

    socket.value.on('disconnect', () => {
      isConnected.value = false;
    });

    socket.value.on('newBid', (data: { auctionId: string; bid: Bid }) => {
      latestBid.value = data.bid;
    });

    socket.value.on('auctionEnded', (data: { auctionId: string; winner: any }) => {
      // Handle auction ended
      console.log('Auction ended:', data);
    });

    socket.value.on('auctionCancelled', (data: { auctionId: string; reason: string }) => {
      console.log('Auction cancelled:', data);
    });

    socket.value.on('notification', (notification: AuctionNotification) => {
      // Show notification
      console.log('Notification:', notification);
    });

    socket.value.on('error', (err: any) => {
      error.value = err.message || 'Connection error';
    });
  };

  const disconnect = () => {
    if (socket.value) {
      socket.value.emit('leaveAuction', { auctionId });
      socket.value.disconnect();
      socket.value = null;
      isConnected.value = false;
    }
  };

  const placeBid = (amount: number) => {
    if (!socket.value?.connected) {
      error.value = 'Not connected to auction';
      return false;
    }
    // Emit bid event - the server will validate and broadcast
    socket.value.emit('placeBid', {
      auctionId,
      amount,
      bidderId: authStore.user?.id,
    });
    return true;
  };

  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    disconnect();
  });

  return {
    isConnected,
    latestBid,
    error,
    connect,
    disconnect,
    placeBid,
  };
}
