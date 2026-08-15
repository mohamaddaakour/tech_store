import { useState } from 'react';
import { ProductGrid } from './components/ProductGrid';
import { CartBadge } from './components/CartBadge';
import { CartDrawer } from './components/CartDrawer';

function App() {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <main className="min-h-screen">
      <header className="p-6 flex justify-between items-center">
        <span className="text-xl font-bold tracking-tight">TechStore</span>
        <CartBadge onClick={() => setCartOpen(true)} />
      </header>
      <ProductGrid />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </main>
  );
}

export default App;