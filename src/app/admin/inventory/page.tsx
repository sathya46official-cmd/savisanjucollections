"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Plus, Trash2, Edit3, Image as ImageIcon, CheckCircle, PackageSearch } from "lucide-react";

export default function InventoryManager() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [isAddMode, setIsAddMode] = useState(false);
    const [newProductName, setNewProductName] = useState("");
    const [newProductDesc, setNewProductDesc] = useState("");
    
    // Variant State
    const [colorName, setColorName] = useState("");
    const [hexCode, setHexCode] = useState("#000000");
    const [stockStatus, setStockStatus] = useState("in_stock");
    const [price, setPrice] = useState("");
    const [isNegotiable, setIsNegotiable] = useState(false);
    const [variantDescription, setVariantDescription] = useState("");
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);

    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

    const resetForm = () => {
        setNewProductName("");
        setNewProductDesc("");
        setColorName("");
        setHexCode("#000000");
        setPrice("");
        setIsNegotiable(false);
        setVariantDescription("");
        setImageFiles([]);
        setSelectedProductId(null);
        setEditingVariantId(null);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                product_variants (*)
            `)
            .order('name', { ascending: true });
        
        if (data) setProducts(data);
        setLoading(false);
    };

    const handleCreateProduct = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check for existing category name first
        const categoryExists = products.some(
            p => p.name.toLowerCase().trim() === newProductName.toLowerCase().trim()
        );

        if (categoryExists) {
            alert(`A category named "${newProductName}" already exists! Please click "+ Add Color" on the existing category below instead of creating a new one.`);
            return;
        }

        setUploading(true);

        const { data, error } = await supabase
            .from('products')
            .insert([{ name: newProductName.trim(), description: newProductDesc }])
            .select();

        if (error) {
            console.error("Error creating product:", error);
            alert("Failed to create product. Make sure you are using an admin authenticated session.");
            setUploading(false);
            return;
        }

        const newProductId = data[0].id;

        // If variant info exists, upload images and create variant
        if (imageFiles.length > 0 && colorName) {
            await createVariant(newProductId);
        } else {
            setUploading(false);
            setIsAddMode(false);
            fetchProducts();
        }
    };

    const createVariant = async (productId: string) => {
        if (imageFiles.length === 0) return;

        const mainImageUrl = await uploadSingleImage(imageFiles[0]);
        const additionalImageUrls = [];

        for (let i = 1; i < imageFiles.length; i++) {
            const url = await uploadSingleImage(imageFiles[i]);
            if (url) additionalImageUrls.push(url);
        }

        if (!mainImageUrl) {
            alert("Failed to upload primary image.");
            setUploading(false);
            return;
        }

        // Insert Variant to DB
        const { error: variantError } = await supabase
            .from('product_variants')
            .insert([{
                product_id: productId,
                color_name: colorName,
                hex_code: hexCode,
                stock_status: stockStatus,
                price: price ? parseFloat(price) : null,
                is_negotiable: isNegotiable,
                description: variantDescription || null,
                image_url: mainImageUrl,
                additional_images: additionalImageUrls
            }]);

        if (variantError) console.error("Error creating variant:", variantError);

        setUploading(false);
        setIsAddMode(false);
        resetForm();
        fetchProducts();
    };

    const uploadSingleImage = async (file: File) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${fileName}`;

        let { error: uploadError } = await supabase.storage
            .from('sarees')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
            console.error("Upload error:", uploadError);
            return null;
        }

        const { data: publicUrlData } = supabase.storage.from('sarees').getPublicUrl(filePath);
        return publicUrlData.publicUrl;
    };

    const handleAddVariantToExisting = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProductId || imageFiles.length === 0 || !colorName) return;
        setUploading(true);
        await createVariant(selectedProductId);
    };

    const handleUpdateVariant = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        let mainImageUrl = undefined;
        let additionalImageUrls = undefined;

        if (imageFiles.length > 0) {
            mainImageUrl = await uploadSingleImage(imageFiles[0]);
            additionalImageUrls = [];
            for (let i = 1; i < imageFiles.length; i++) {
                const url = await uploadSingleImage(imageFiles[i]);
                if (url) additionalImageUrls.push(url);
            }
        }

        const updates: any = {
            color_name: colorName,
            hex_code: hexCode,
            stock_status: stockStatus,
            price: price ? parseFloat(price) : null,
            is_negotiable: isNegotiable,
            description: variantDescription || null,
        };

        if (mainImageUrl) updates.image_url = mainImageUrl;
        if (additionalImageUrls) updates.additional_images = additionalImageUrls;

        const { error } = await supabase
            .from('product_variants')
            .update(updates)
            .eq('id', editingVariantId);

        if (error) {
            console.error("Error updating variant:", error);
            alert("Failed to update variant.");
        }

        setUploading(false);
        setIsAddMode(false);
        resetForm();
        fetchProducts();
    };

    const handleEditVariantClick = (product: any, variant: any) => {
        setIsAddMode(true);
        setSelectedProductId(product.id);
        setEditingVariantId(variant.id);
        
        setColorName(variant.color_name);
        setHexCode(variant.hex_code || "#000000");
        setStockStatus(variant.stock_status || "in_stock");
        setPrice(variant.price ? variant.price.toString() : "");
        setIsNegotiable(variant.is_negotiable || false);
        setVariantDescription(variant.description || "");
        setImageFiles([]);
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteProduct = async (id: string) => {
        if(!confirm("Are you sure you want to delete this product and all its colors?")) return;
        await supabase.from('products').delete().eq('id', id);
        fetchProducts();
    };

    const handleDeleteVariant = async (id: string) => {
        if(!confirm("Remove this color variant?")) return;
        await supabase.from('product_variants').delete().eq('id', id);
        fetchProducts();
    };

    const handleUpdateStock = async (id: string, newStatus: string) => {
        await supabase.from('product_variants').update({ stock_status: newStatus }).eq('id', id);
        fetchProducts();
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-serif text-gray-900">Inventory Management</h1>
                <button 
                    onClick={() => { setIsAddMode(!isAddMode); resetForm(); }}
                    className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition"
                >
                    <Plus size={18} /> Add New Saree
                </button>
            </div>

            {/* Form for New Product / New Variant */}
            {isAddMode && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8 animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-lg font-medium mb-4 border-b pb-2">
                        {editingVariantId ? "Edit Color Variant" : (selectedProductId ? "Add New Color Variant" : "Upload Full New Saree Type")}
                    </h2>
                    
                    <form onSubmit={editingVariantId ? handleUpdateVariant : (selectedProductId ? handleAddVariantToExisting : handleCreateProduct)} className="flex flex-col gap-6">
                        
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Select Category</label>
                            <select 
                                value={selectedProductId || "new"} 
                                onChange={e => {
                                    const val = e.target.value;
                                    setSelectedProductId(val === "new" ? null : val);
                                    if (val === "new") setEditingVariantId(null);
                                }}
                                disabled={!!editingVariantId}
                                className="w-full border rounded-md px-3 py-2 text-black outline-none focus:ring-1 focus:ring-black bg-white disabled:bg-gray-100 disabled:text-gray-500"
                            >
                                <option value="new">+ Create New Category</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {!selectedProductId && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Category Name (e.g. Silk, Banarasi)</label>
                                    <input required value={newProductName} onChange={e => setNewProductName(e.target.value)} type="text" className="w-full border rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-black text-black" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Rich Description</label>
                                    <textarea required value={newProductDesc} onChange={e => setNewProductDesc(e.target.value)} rows={3} className="w-full border rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-black resize-none text-black" />
                                </div>
                            </div>
                        )}

                        <div className="bg-white p-4 border border-gray-200 rounded-md">
                            <h3 className="text-sm font-medium text-gray-900 mb-3">{selectedProductId ? "Variant Details" : "Initial Color Details (Optional)"}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Color Name</label>
                                    <input required={!!selectedProductId} value={colorName} onChange={e => setColorName(e.target.value)} type="text" className="w-full border rounded-md px-3 py-2 text-sm text-black outline-none focus:ring-1 focus:ring-black" placeholder="Crimson Red" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Price (₹)</label>
                                    <input required={!!selectedProductId} value={price} onChange={e => setPrice(e.target.value)} type="number" min="0" step="0.01" className="w-full border rounded-md px-3 py-2 text-sm text-black outline-none focus:ring-1 focus:ring-black" placeholder="15000" />
                                </div>
                                <div className="space-y-1 flex flex-col justify-end h-full mb-1">
                                    <label className="flex items-center gap-2 cursor-pointer mt-5">
                                        <input type="checkbox" checked={isNegotiable} onChange={e => setIsNegotiable(e.target.checked)} className="w-4 h-4 text-black focus:ring-black border-gray-300 rounded" />
                                        <span className="text-sm text-gray-700">Negotiable Price</span>
                                    </label>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Stock Status</label>
                                    <select value={stockStatus} onChange={e => setStockStatus(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm text-black outline-none focus:ring-1 focus:ring-black bg-white">
                                        <option value="in_stock">In Stock</option>
                                        <option value="limited">Limited</option>
                                        <option value="out_of_stock">Out of Stock</option>
                                    </select>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-xs text-gray-500">Background Hex Match</label>
                                    <div className="flex gap-2 items-center">
                                        <input type="color" value={hexCode} onChange={e => setHexCode(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
                                        <input value={hexCode} onChange={e => setHexCode(e.target.value)} type="text" className="w-full border rounded-md px-3 py-2 text-sm text-black outline-none font-mono uppercase" />
                                    </div>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-xs text-gray-500">Variant Description (Optional)</label>
                                    <textarea value={variantDescription} onChange={e => setVariantDescription(e.target.value)} rows={2} className="w-full border rounded-md px-3 py-2 text-sm text-black outline-none focus:ring-1 focus:ring-black resize-none" placeholder="Special details for this color..." />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-xs text-gray-500">Images (Max 4)</label>
                                    <label className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 transition">
                                        <ImageIcon size={16} className="text-gray-400" />
                                        <span className="truncate text-gray-800">{imageFiles.length > 0 ? `${imageFiles.length} file(s) selected` : "Select Files..."}</span>
                                        <input required={!editingVariantId && (!!selectedProductId || !!colorName)} type="file" multiple accept="image/*" onChange={(e) => setImageFiles(Array.from(e.target.files || []).slice(0,4))} className="hidden" />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button type="button" onClick={() => { setIsAddMode(false); resetForm(); }} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-50 text-gray-600">Cancel</button>
                            <button disabled={uploading} type="submit" className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                                {uploading ? "Saving & Uploading..." : "Save to Database"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List Current Inventory */}
            {loading ? (
                <div className="py-12 text-center text-gray-400">Loading catalog...</div>
            ) : products.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-4">
                    <PackageSearch size={48} className="opacity-20" />
                    <p>No products in database. Add one above.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {products.map(product => (
                        <div key={product.id} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                                <div>
                                    <h3 className="font-serif text-lg font-medium text-gray-900">{product.name}</h3>
                                    <p className="text-xs text-gray-500 mt-1 max-w-xl truncate">{product.description}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => { 
                                            setIsAddMode(true); 
                                            setSelectedProductId(product.id); 
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="text-xs flex items-center gap-1 bg-white border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-50"
                                    >
                                        <Plus size={14}/> Add Color
                                    </button>
                                    <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded transition">
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {product.product_variants?.map((variant: any) => (
                                    <div key={variant.id} className="border border-gray-100 rounded-md p-3 relative group flex flex-col">
                                        <div className="aspect-square w-full rounded-md overflow-hidden bg-gray-100 mb-3 relative">
                                            <img src={variant.image_url} alt={variant.color_name} className="w-full h-full object-cover" />
                                            <div className="absolute top-2 left-2 w-4 h-4 rounded-full border border-white/50 shadow-sm" style={{ backgroundColor: variant.hex_code }} />
                                            
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                                <button onClick={() => handleEditVariantClick(product, variant)} className="p-2 bg-white text-black rounded-full hover:bg-gray-200 shadow-sm" title="Edit Color Details">
                                                    <Edit3 size={14} />
                                                </button>
                                                <button onClick={() => handleDeleteVariant(variant.id)} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-sm" title="Delete Color Variant">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end mt-auto">
                                            <div>
                                                <div className="font-medium text-sm text-gray-900">{variant.color_name}</div>
                                                <div className="text-xs text-gray-500 mt-1">₹{variant.price ? variant.price.toLocaleString('en-IN') : '--'} {variant.is_negotiable && '(Neg)'}</div>
                                                <select 
                                                    value={variant.stock_status}
                                                    onChange={(e) => handleUpdateStock(variant.id, e.target.value)}
                                                    className={`text-xs mt-1 bg-transparent border-0 p-0 font-medium focus:ring-0 ${variant.stock_status === 'in_stock' ? 'text-green-600' : variant.stock_status === 'limited' ? 'text-amber-600' : 'text-red-600'}`}
                                                >
                                                    <option value="in_stock" className="text-black">In Stock</option>
                                                    <option value="limited" className="text-black">Limited Stock</option>
                                                    <option value="out_of_stock" className="text-black">Out of Stock</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!product.product_variants || product.product_variants.length === 0) && (
                                    <div className="text-sm text-gray-400 italic py-4 col-span-full">No active colors for this saree.</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
