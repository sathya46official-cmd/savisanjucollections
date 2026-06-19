'use client';

import { Product, Variant } from '@/hooks/useProducts';
import { Edit3, Trash2 } from 'lucide-react';
import { resolveImageUrl, handleImageError } from '@/lib/images';

interface ProductCardProps {
  product: Product;
  onAddVariant: (productId: string) => void;
  onEditVariant: (product: Product, variant: Variant) => void;
  onDeleteVariant: (variantId: string) => void;
  onDeleteProduct: (productId: string) => void;
}

export default function ProductCard({
  product,
  onAddVariant,
  onEditVariant,
  onDeleteVariant,
  onDeleteProduct,
}: ProductCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
        <div>
          <h3 className="font-serif text-lg font-medium text-gray-900">{product.name}</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xl truncate">{product.description}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onAddVariant(product.id)}
            className="text-xs flex items-center gap-1 bg-white border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-50"
          >
            <span className="text-lg leading-none">+</span> Add Color
          </button>
          <button
            onClick={() => onDeleteProduct(product.id)}
            className="text-red-600 hover:bg-red-50 p-1.5 rounded transition"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {product.variants?.map((variant: Variant) => (
          <div key={variant.id} className="border border-gray-100 rounded-md p-3 relative group flex flex-col">
            <div className="aspect-square w-full rounded-md overflow-hidden bg-gray-100 mb-3 relative">
              <img
                src={resolveImageUrl(variant.image_url)}
                alt={variant.color_name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={handleImageError}
              />
              <div className="absolute top-2 left-2 w-4 h-4 rounded-full border border-white/50 shadow-sm" style={{ backgroundColor: variant.hex_code }} />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                <button
                  onClick={() => onEditVariant(product, variant)}
                  className="p-2 bg-white text-black rounded-full hover:bg-gray-200 shadow-sm"
                  title="Edit Color Details"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => onDeleteVariant(variant.id)}
                  className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-sm"
                  title="Delete Color Variant"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="flex justify-between items-end mt-auto">
              <div>
                <div className="font-medium text-sm text-gray-900">{variant.color_name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  ₹{variant.price ? variant.price.toLocaleString('en-IN') : '--'} {variant.is_negotiable && '(Neg)'}
                </div>
                <select
                  value={variant.stock_status}
                  onChange={(e) => {/* handled by parent */}}
                  className={`text-xs mt-1 bg-transparent border-0 p-0 font-medium focus:ring-0 ${
                    variant.stock_status === 'in_stock' ? 'text-green-600' : variant.stock_status === 'limited' ? 'text-amber-600' : 'text-red-600'
                  }`}
                >
                  <option value="in_stock" className="text-black">In Stock</option>
                  <option value="limited" className="text-black">Limited Stock</option>
                  <option value="out_of_stock" className="text-black">Out of Stock</option>
                </select>
              </div>
            </div>
          </div>
        ))}
        {(!product.variants || product.variants.length === 0) && (
          <div className="text-sm text-gray-400 italic py-4 col-span-full">No active colors for this saree.</div>
        )}
      </div>
    </div>
  );
}
