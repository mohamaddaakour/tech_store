import { useCartStore } from "../store/cartStore";

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    const lines = useCartStore((s) => s.lines);
    const remove = useCartStore((s) => s.remove);
    const total = useCartStore((s) => s.totalCents());

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-end" onClick={onClose}>
            <div className="w-80 h-full bg-surface p-4" onClick={(e) => e.stopPropagation()}>
                <h2 className="font-bold mb-4">Your cart</h2>
                {lines.length === 0 && <p className="text-gray-500">Empty</p>}
                {lines.map((l) => (
                    <div key={l.product.id} className="flex justify-between items-center mb-2">
                        <span>
                            {l.product.name} x {l.quantity}
                        </span>
                        <button onClick={() => remove(l.product.id)} className="text-red-400 text-sm">
                            remove
                        </button>
                    </div>
                ))}
                <div className="border-t border-gray-700 mt-4 pt-2 font-bold">
                    Total: ${(total / 100).toFixed(2)}
                </div>
            </div>
        </div>
    );
}
