import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productOnCart = cart.find(item => item.id === productId);

      if (productOnCart) {
        updateProductAmount({ productId, amount: productOnCart.amount + 1 });
        return;
      }

      await api.get<Product>(`products/${productId}`).then(response => {
        const product = {...response.data, amount: 1};

        setCart([...cart, product]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, product]));
      });
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // existencia do produto
      const product = cart.find(item => item.id === productId);
      if (!product) {
        throw new Error('Erro na remoção do produto');
      }

      // remoção com filter
      const removedProduct = cart.filter(item => item.id !== product.id);

      // set
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(removedProduct));
      setCart(removedProduct);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({productId, amount}: UpdateProductAmount) => {
    try {
      // busca estoque do produto na api
      const { data: productOnStock } = await api.get<Stock>(`stock/${productId}`).catch(() => {
        throw new Error('Erro na alteração de quantidade do produto');
      });

      // quantidade deve ser maior que zero
      if (amount <= 0) {
        throw new Error('Erro na alteração de quantidade do produto');
      }

      // quantidade solicitada maior que a de estoque
      if (amount > productOnStock.amount) {
        throw new Error('Quantidade solicitada fora de estoque');
      }

      // produto que não existe não pode ser alterado
      const productOnCart = cart.find((product) => product.id === productId);
      if (!productOnCart) {
        throw new Error('Erro na alteração de quantidade do produto');
      }

      // altera o produto no carrinho
      productOnCart.amount = amount;

      // setar carrinho com o novo produto
      setCart([...cart])
      localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart]));
    } catch(error) {
      toast.error(error.message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
