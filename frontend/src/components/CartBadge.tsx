import { useCartStore } from "../store/cartStore";

export function CartBadge({ onClick }: { onClick: () => void }) {
    const count = useCartStore((s) => s.totalItems());

    return (
        <button onClick={onClick} className="relative px-3 py-1.5 rounded-lg bg-surface">
            Cart
            {count > 0 && (
                <span className="absolute -top-2 -right-2 bg-accent text-black text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {count}
                </span>
            )}
        </button>
    );
}
