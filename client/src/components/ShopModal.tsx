import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Palette, Paintbrush, Smile, Award } from 'lucide-react';
import { Button } from './ui/Button';
import { useSocket } from '@/hooks/useSocket';
import { ShopItem, UserStats } from '@/types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface ShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    userStats: UserStats | null;
}

export default function ShopModal({ isOpen, onClose, userStats }: ShopModalProps) {
    const { socket } = useSocket();
    const [items, setItems] = useState<Record<string, ShopItem>>({});
    const [activeTab, setActiveTab] = useState<'brush' | 'color' | 'avatar' | 'title'>('brush');
    const [inventory, setInventory] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            socket.emit('get_shop_items');
            socket.emit('get_inventory');
        }

        const onShopItems = (data: any) => setItems(data);
        const onInventory = (data: any[]) => setInventory(data);
        const onPurchaseResult = (res: { success: boolean, message: string }) => {
            if (res.success) {
                toast.success(res.message);
                socket.emit('get_inventory'); // Refresh inventory
            } else {
                toast.error(res.message);
            }
        };

        socket.on('shop_items', onShopItems);
        socket.on('inventory_data', onInventory);
        socket.on('purchase_result', onPurchaseResult);

        return () => {
            socket.off('shop_items', onShopItems);
            socket.off('inventory_data', onInventory);
            socket.off('purchase_result', onPurchaseResult);
        };
    }, [isOpen, socket]);

    const handleBuy = (itemId: string) => {
        socket.emit('buy_item', itemId);
    };

    const handleEquip = (itemId: string) => {
        socket.emit('equip_item', itemId);
    };

    if (!isOpen) return null;

    const filteredItems = Object.entries(items).filter(([_, item]) => item.type === activeTab);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-4xl bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-pink-500/20 rounded-xl">
                            <ShoppingBag className="w-6 h-6 text-pink-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Item Shop</h2>
                            <p className="text-white/50 text-sm">Customize your artistic style</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/10 flex items-center gap-2">
                            <span className="text-yellow-400 font-bold">🪙 {userStats?.coins || 0}</span>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <X className="w-6 h-6 text-white/70" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    {[
                        { id: 'brush', icon: Paintbrush, label: 'Brushes' },
                        { id: 'color', icon: Palette, label: 'Colors' },
                        { id: 'avatar', icon: Smile, label: 'Avatars' },
                        { id: 'title', icon: Award, label: 'Titles' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "flex-1 py-4 flex items-center justify-center gap-2 text-sm font-medium transition-all relative",
                                activeTab === tab.id ? "text-white bg-white/5" : "text-white/50 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div layoutId="shop-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredItems.map(([id, item]) => {
                            const isOwned = inventory.some(i => i.item_id === id);
                            const itemIsEquipped = inventory.find(i => i.item_id === id)?.equipped === 1;
                            const canAfford = (userStats?.coins || 0) >= item.price;

                            return (
                                <div key={id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-4 hover:border-white/20 transition-all group">
                                    <div className="h-32 bg-black/20 rounded-lg flex items-center justify-center relative overflow-hidden">
                                        {/* Placeholder Visuals */}
                                        <div className={cn(
                                            "w-16 h-16 rounded-full",
                                            item.type === 'brush' && "bg-gradient-to-tr from-blue-500 to-purple-500",
                                            item.type === 'color' && "bg-gradient-to-r from-yellow-400 to-orange-500",
                                            item.type === 'avatar' && "bg-gray-700",
                                            item.type === 'title' && "bg-transparent border-2 border-dashed border-white/20"
                                        )} />
                                        {activeTab === 'title' && <span className="absolute text-xs uppercase tracking-widest font-bold text-white/50">{item.name}</span>}
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-white">{item.name}</h3>
                                        <p className="text-sm text-white/50 capitalize">{item.type}</p>
                                    </div>

                                    <div className="mt-auto">
                                        {isOwned ? (
                                            <Button
                                                variant={itemIsEquipped ? 'default' : 'outline'}
                                                className={cn("w-full", itemIsEquipped ? "bg-green-500 hover:bg-green-600 border-none" : "border-white/20 hover:bg-white/10")}
                                                onClick={() => !itemIsEquipped && handleEquip(id)}
                                                disabled={itemIsEquipped}
                                            >
                                                {itemIsEquipped ? "Equipped" : "Equip"}
                                            </Button>
                                        ) : (
                                            <Button
                                                variant={canAfford ? 'default' : 'ghost'}
                                                className={cn("w-full", !canAfford && "opacity-50")}
                                                disabled={!canAfford}
                                                onClick={() => handleBuy(id)}
                                            >
                                                Buy for {item.price} 🪙
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
