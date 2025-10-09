import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MenuHeader } from "@/components/menu/MenuHeader";
import { MenuCategories } from "@/components/menu/MenuCategories";
import { MenuProducts } from "@/components/menu/MenuProducts";
import { MenuCart } from "@/components/menu/MenuCart";
import { MenuCheckout } from "@/components/menu/MenuCheckout";
import { Loader2 } from "lucide-react";

interface Company {
  id: string;
  name: string;
  fantasy_name: string;
  logo_url: string | null;
  banner_url: string | null;
  phone: string;
  whatsapp: string;
  description: string;
  schedule: any;
  is_active: boolean;
  delivery_mode: string;
}

interface Category {
  id: string;
  name: string;
  on_off: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  category_id: string;
  on_off: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
  observations?: string;
}

export default function PublicMenuBySubdomain() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    loadMenuData();
  }, []);

  const getSubdomain = () => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // Se for localhost ou IP, retorna null
    if (hostname === 'localhost' || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      return null;
    }
    
    // Se tiver 3 ou mais partes (ex: subdomain.anafood.vip)
    if (parts.length >= 3) {
      // Retorna a primeira parte se não for www
      if (parts[0] !== 'www') {
        return parts[0];
      }
    }
    
    return null;
  };

  const loadMenuData = async () => {
    try {
      setLoading(true);

      const subdomain = getSubdomain();
      
      if (!subdomain) {
        setLoading(false);
        return;
      }

      // Buscar empresa pelo subdomínio
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('subdomain', subdomain)
        .maybeSingle();

      if (companyError) throw companyError;
      if (!companyData) {
        toast({
          title: "Erro",
          description: "Estabelecimento não encontrado",
          variant: "destructive",
        });
        return;
      }

      setCompany(companyData);

      // Buscar categorias
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('company_id', companyData.id)
        .eq('on_off', true)
        .order('name');

      setCategories(categoriesData || []);

      // Buscar produtos
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyData.id)
        .eq('on_off', true)
        .order('name');

      setProducts(productsData || []);
    } catch (error) {
      console.error('Error loading menu:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar cardápio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product, quantity: number = 1, observations?: string) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      if (existingItem) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity, observations }
            : item
        );
      }
      return [...prev, { product, quantity, observations }];
    });

    toast({
      title: "Produto adicionado",
      description: `${product.name} foi adicionado ao carrinho`,
    });
  };

  const updateCartItem = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Estabelecimento não encontrado</h1>
          <p className="text-muted-foreground">
            Verifique se o link está correto
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MenuHeader company={company} />
      
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <MenuCategories
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
            
            <MenuProducts
              products={filteredProducts}
              onAddToCart={addToCart}
            />
          </div>

          <div className="lg:col-span-1">
            <MenuCart
              cart={cart}
              onUpdateQuantity={updateCartItem}
              onRemoveItem={removeFromCart}
              onClearCart={clearCart}
              onCheckout={() => setShowCheckout(true)}
              total={getCartTotal()}
            />
          </div>
        </div>
      </div>

      {showCheckout && (
        <MenuCheckout
          cart={cart}
          total={getCartTotal()}
          company={company}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => {
            clearCart();
            setShowCheckout(false);
          }}
        />
      )}
    </div>
  );
}
