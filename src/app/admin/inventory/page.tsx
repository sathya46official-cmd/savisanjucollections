"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Search, Package } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import ColorPicker from "@/components/admin/ColorPicker";
import ImageUploader from "@/components/admin/ImageUploader";

interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  featured: boolean;
  display_order: number;
  variants?: ProductVariant[];
}

interface ProductVariant {
  id: string;
  product_id: string;
  color: string;
  hex_code: string;
  size?: string;
  price: number;
  quantity: number;
  image_url: string;
  is_negotiable: boolean;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Product form state
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    category: "",
    featured: false,
    display_order: 0
  });

  // Variant form state
  const [variantForm, setVariantForm] = useState({
    color: "",
    hex_code: "#000000",
    size: "",
    price: "",
    quantity: 0,
    is_negotiable: false
  });
  const [variantImages, setVariantImages] = useState<File[]>([]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await apiClient.getProducts();
    if (!error && data) {
      setProducts(data as Product[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Mount-time data fetch; setState happens inside the async loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts();
  }, [fetchProducts]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data, error } = await apiClient.createProduct(productForm);
    
    if (!error && data) {
      setProducts([...products, data as Product]);
      setProductForm({ name: "", description: "", category: "", featured: false, display_order: 0 });
      setShowProductForm(false);
      setSelectedProduct(data as Product);
      setShowVariantForm(true);
    } else {
      alert(error?.message || "Failed to create product");
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingProduct) return;

    const { data, error } = await apiClient.updateProduct(editingProduct.id, productForm);
    
    if (!error && data) {
      setProducts(products.map(p => p.id === (data as Product).id ? data as Product : p));
      setEditingProduct(null);
      setShowProductForm(false);
      setProductForm({ name: "", description: "", category: "", featured: false, display_order: 0 });
    } else {
      alert(error?.message || "Failed to update product");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product? All variants will be deleted.")) return;

    const { error } = await apiClient.deleteProduct(productId);
    
    if (!error) {
      setProducts(products.filter(p => p.id !== productId));
    } else {
      alert(error?.message || "Failed to delete product");
    }
  };

  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct) return;

    // Upload images first
    let imageUrls: string[] = [];
    if (variantImages.length > 0) {
      const { data: urls, error: uploadError } = await apiClient.uploadImages(variantImages);
      if (uploadError) {
        alert("Failed to upload images: " + uploadError.message);
        return;
      }
      imageUrls = urls || [];
    }

    const { data, error } = await apiClient.createVariant(selectedProduct.id, {
      ...variantForm,
      price: parseFloat(variantForm.price) * 100, // Convert to paise
      image_url: JSON.stringify(imageUrls)
    });
    
    if (!error && data) {
      fetchProducts();
      setVariantForm({ color: "", hex_code: "#000000", size: "", price: "", quantity: 0, is_negotiable: false });
      setVariantImages([]);
      setShowVariantForm(false);
      setSelectedProduct(null);
    } else {
      alert(error?.message || "Failed to create variant");
    }
  };

  const handleUpdateStock = async (variantId: string, newQuantity: number) => {
    const { error } = await apiClient.updateStock(variantId, newQuantity);
    
    if (!error) {
      fetchProducts();
    } else {
      alert(error?.message || "Failed to update stock");
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm("Are you sure you want to delete this variant?")) return;

    const { error } = await apiClient.deleteVariant(variantId);
    
    if (!error) {
      fetchProducts();
    } else {
      alert(error?.message || "Failed to delete variant");
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500 mt-1">Manage products and variants</p>
        </div>
        <button
          onClick={() => {
            setShowProductForm(true);
            setEditingProduct(null);
            setProductForm({ name: "", description: "", category: "", featured: false, display_order: 0 });
          }}
          className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition flex items-center gap-2"
        >
          <Plus size={20} />
          Add New Product
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Product List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white rounded-lg border border-gray-200 p-6 text-gray-900">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-500">{product.category || "Uncategorized"}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingProduct(product);
                    setProductForm({
                      name: product.name,
                      description: product.description || "",
                      category: product.category || "",
                      featured: product.featured,
                      display_order: product.display_order
                    });
                    setShowProductForm(true);
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600">
                {product.variants?.length || 0} variant(s)
              </p>
              {product.featured && (
                <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                  Featured
                </span>
              )}
            </div>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-2 mb-4">
                {product.variants.map(variant => (
                  <div key={variant.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: variant.hex_code }}
                      />
                      <span className="text-sm">{variant.color}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={variant.quantity}
                        onChange={(e) => handleUpdateStock(variant.id, parseInt(e.target.value))}
                        className="w-16 px-2 py-1 text-sm border border-gray-200 rounded"
                      />
                      <button
                        onClick={() => handleDeleteVariant(variant.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                setSelectedProduct(product);
                setShowVariantForm(true);
                setVariantForm({ color: "", hex_code: "#000000", size: "", price: "", quantity: 0, is_negotiable: false });
              }}
              className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              + Add Variant
            </button>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No products found</p>
        </div>
      )}

      {/* Product Form Modal */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto text-gray-900">
            <h2 className="text-2xl font-bold mb-1 text-gray-900">
              {editingProduct ? "Edit Product" : "Create New Product"}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {editingProduct ? "Update the product details below." : "Add a new product to your catalogue."}
            </p>
            <form onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  required
                  maxLength={255}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  maxLength={2000}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <input
                  type="text"
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  placeholder="e.g. Kanjivaram, Banarasi, Silk"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none bg-white"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  id="featured"
                  checked={productForm.featured}
                  onChange={(e) => setProductForm({ ...productForm, featured: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                />
                <label htmlFor="featured" className="text-sm font-medium text-gray-700">
                  Featured Product
                  <span className="block text-xs font-normal text-gray-500">Show this product on the homepage</span>
                </label>
              </div>

              {productForm.featured && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
                  <input
                    type="number"
                    value={productForm.display_order}
                    onChange={(e) => setProductForm({ ...productForm, display_order: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none bg-white"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductForm(false);
                    setEditingProduct(null);
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition font-medium"
                >
                  {editingProduct ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Variant Form Modal */}
      {showVariantForm && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto text-gray-900">
            <h2 className="text-2xl font-bold mb-1 text-gray-900">
              Add Variant
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Adding variant to <span className="font-medium text-gray-900">{selectedProduct.name}</span>
            </p>
            <form onSubmit={handleCreateVariant} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color Name *</label>
                  <input
                    type="text"
                    value={variantForm.color}
                    onChange={(e) => setVariantForm({ ...variantForm, color: e.target.value })}
                    required
                    placeholder="e.g. Royal Blue"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                  <input
                    type="text"
                    value={variantForm.size}
                    onChange={(e) => setVariantForm({ ...variantForm, size: e.target.value })}
                    placeholder="e.g. Free Size, 6 yards"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none bg-white"
                  />
                </div>
              </div>

              <ColorPicker
                value={variantForm.hex_code}
                onChange={(hex) => setVariantForm({ ...variantForm, hex_code: hex })}
                label="Colour *"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={variantForm.price}
                    onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })}
                    required
                    placeholder="2999.00"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={variantForm.quantity}
                    onChange={(e) => setVariantForm({ ...variantForm, quantity: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  id="negotiable"
                  checked={variantForm.is_negotiable}
                  onChange={(e) => setVariantForm({ ...variantForm, is_negotiable: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                />
                <label htmlFor="negotiable" className="text-sm font-medium text-gray-700">
                  Price is Negotiable
                  <span className="block text-xs font-normal text-gray-500">Customers can request a custom price</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Images (up to 4)</label>
                <ImageUploader
                  maxImages={4}
                  onImagesChange={setVariantImages}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowVariantForm(false);
                    setSelectedProduct(null);
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition font-medium"
                >
                  Create Variant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
