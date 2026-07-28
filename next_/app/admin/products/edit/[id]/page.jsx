"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAdminData } from '@/context/AdminDataContext';
import MediaPickerModal from '@/components/admin/MediaPickerModal';
import * as api from '@/services/adminApi';
import PageHeader from '@/components/admin/ui/PageHeader';
import FormField from '@/components/admin/ui/FormField';
import Loader from '@/components/admin/ui/Loader';
import { useToast } from '@/context/ToastContext';
import { getFileUrl } from '@/lib/utils';
import '@/app/admin/css/custom.css';

const EditProductPage = () => {
    const toast = useToast();
    const router = useRouter();
    const params = useParams();
    const productId = params?.id;

    const { data, loading, updateRecord } = useAdminData();

    const categories = data.categories || [];
    const taxClasses = data.taxClasses || [];
    const [tags, setTags] = useState([]);
    const [belts, setBelts] = useState([]);
    const [boxes, setBoxes] = useState([]);

    const [processing, setProcessing] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const iframeRef = useRef(null);
    

    
    const [form, setForm] = useState({
        name: '', slug: '', productCode: '',
        shortDesc: '', description: '',
        status: 'draft', productType: 'configurable',

        heroImage: null, // {id, url}
        gallery: [], // [{id, url}]
        tagIds: [],
        specifications: {}, // specId: value
        sku: '',
        price: '',
        qty: '',
        subtitle: '',
        tagline: '',
        bgColor: '#ffffff',
        accentColor: '#c4a35a',
        textColor: '#1a1a1a',
        gradient: '',
        mistColor: '#f8fafc',
        videoUrl: '',
        discoverHeroBgImage: '',
        isFeatured: false,
        canSellBelts: false,
        beltIds: [],
        canShowBoxes: false,
        boxIds: [],
        configuredImageCount: 3
    });

    const [categoryDetails, setCategoryDetails] = useState(null);
    const searchParams = useSearchParams();
    const initialStep = searchParams?.get('step') || 'basic';
    const [activeTab, setActiveTab] = useState(initialStep);
    const [selectedAttributeValues, setSelectedAttributeValues] = useState({}); // attrId: [valIds]
    const [variants, setVariants] = useState([]);
    const [variantPage, setVariantPage] = useState(1);
    const [variantsPerPage, setVariantsPerPage] = useState(10);
    const [variantSearch, setVariantSearch] = useState('');
    const [pickerTarget, setPickerTarget] = useState(null); // 'primary' | 'gallery' | {variantIndex, type}
    const [variantImageModal, setVariantImageModal] = useState(null); // { index, name }
    const [pageThemeTab, setPageThemeTab] = useState('discover');

    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (iframeRef.current && activeTab === 'theme') {
            iframeRef.current.contentWindow.postMessage({
                type: 'PREVIEW_PRODUCT_THEME',
                payload: {
                    discoverBg: form.discoverBg,
                    discoverTextColor: form.discoverTextColor,
                    discoverAccentColor: form.discoverAccentColor,
                    productsBg: form.productsBg,
                    productsTextColor: form.productsTextColor,
                    productsAccentColor: form.productsAccentColor,
                    preConfigureBg: form.preConfigureBg,
                    preConfigureTextColor: form.preConfigureTextColor,
                    preConfigureAccentColor: form.preConfigureAccentColor
                }
            }, '*');
        }
    }, [
        form.discoverBg, form.discoverTextColor, form.discoverAccentColor,
        form.productsBg, form.productsTextColor, form.productsAccentColor,
        form.preConfigureBg, form.preConfigureTextColor, form.preConfigureAccentColor,
        activeTab, pageThemeTab
    ]);

    useEffect(() => {
        if (!productId || processing) return;
        
        const savedDraft = localStorage.getItem(`draft_edit_${productId}`);
        if (savedDraft && !isInitialized) {
            try {
                const parsed = JSON.parse(savedDraft);
                if (parsed.form && parsed.form.name) {
                    setForm(parsed.form);
                    if (parsed.variants) setVariants(parsed.variants);
                    if (parsed.selectedAttributeValues) setSelectedAttributeValues(parsed.selectedAttributeValues);
                }
            } catch (e) {}
        }
        setIsInitialized(true);
    }, [productId, processing]);

    useEffect(() => {
        if (isInitialized && !processing) {
            localStorage.setItem(`draft_edit_${productId}`, JSON.stringify({ form, variants, selectedAttributeValues }));
        }
    }, [form, variants, selectedAttributeValues, isInitialized, processing, productId]);

    const validateStep = (step, silent = false) => {
        switch (step) {
            case 'basic':
                if (!form.name || !form.slug || !form.categoryId || (form.productType === 'simple' && !form.price)) {
                    if (!silent) toast.error('Please fill Name, Slug, Category, and Price (if simple) in Basic Info.');
                    return false;
                }
                return true;
            case 'story':
                if (!form.shortDesc) {
                    if (!silent) toast.error('Please fill Short Description in Story & Details.');
                    return false;
                }
                return true;
            case 'taxonomy':
                if (!form.categoryId) {
                    if (!silent) toast.error('Please select a Category in Taxonomy.');
                    return false;
                }
                return true;
            case 'theme':
                return true;
            case 'variants':
                return true;
            default:
                return true;
        }
    };

    const handleTabChange = (targetTab) => {
        setActiveTab(targetTab);
    };



    const moveGalleryImage = (index, direction) => {
        const newGallery = [...form.gallery];
        const targetIndex = index + direction;
        if (targetIndex >= 0 && targetIndex < newGallery.length) {
            [newGallery[index], newGallery[targetIndex]] = [newGallery[targetIndex], newGallery[index]];
            setForm(prev => ({ ...prev, gallery: newGallery }));
        }
    };

    const moveVariantGalleryImage = (vIdx, gIdx, direction) => {
        setVariants(prev => {
            const newVariants = [...prev];
            const variant = { ...newVariants[vIdx] };
            const newGallery = [...(variant.gallery || [])];
            const targetIndex = gIdx + direction;
            if (targetIndex >= 0 && targetIndex < newGallery.length) {
                [newGallery[gIdx], newGallery[targetIndex]] = [newGallery[targetIndex], newGallery[gIdx]];
                variant.gallery = newGallery;
                newVariants[vIdx] = variant;
            }
            return newVariants;
        });
    };

    const moveVariantOrder = (index, direction) => {
        setVariants(prev => {
            const next = [...prev];
            const targetIndex = index + direction;
            if (targetIndex >= 0 && targetIndex < next.length) {
                [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
            }
            return next;
        });
    };

    const setPrimaryVariant = (index) => {
        setVariants(prev => prev.map((v, i) => ({ ...v, isPrimary: i === index })));
    };

    const fetchProductDetails = useCallback(async () => {
        if (!productId) return;
        setProcessing(true);
        
        try {
            const [prodRes, tagsRes, beltsRes, boxesRes] = await Promise.all([
                api.getProduct(productId),
                api.getTags(),
                api.getBelts(),
                api.getBoxes()
            ]);

            if (tagsRes.success) setTags(tagsRes.data);
            if (beltsRes.success) setBelts(beltsRes.data);
            if (boxesRes.success) setBoxes(boxesRes.data);

            if (prodRes.success) {
                const p = prodRes.data;
                
                let parsedTheme = {};
                if (p.theme) {
                    try {
                        parsedTheme = JSON.parse(p.theme);
                    } catch (e) {
                        console.error("Failed to parse theme JSON:", e);
                    }
                }
                
                if (p.pageThemes && Array.isArray(p.pageThemes)) {
                    p.pageThemes.forEach(pt => {
                        try {
                            const ptData = typeof pt.themeJson === 'string' ? JSON.parse(pt.themeJson) : pt.themeJson;
                            if (pt.pageName === 'discover') {
                                if (ptData.bgColor) parsedTheme.discoverBg = ptData.bgColor;
                                if (ptData.textColor) parsedTheme.discoverTextColor = ptData.textColor;
                                if (ptData.accentColor) parsedTheme.discoverAccentColor = ptData.accentColor;
                                if (ptData.gradient) parsedTheme.discoverGradient = ptData.gradient;
                            } else if (pt.pageName === 'products') {
                                if (ptData.bgColor) parsedTheme.productsBg = ptData.bgColor;
                                if (ptData.textColor) parsedTheme.productsTextColor = ptData.textColor;
                                if (ptData.accentColor) parsedTheme.productsAccentColor = ptData.accentColor;
                            } else if (pt.pageName === 'preConfigure') {
                                if (ptData.bgColor) parsedTheme.preConfigureBg = ptData.bgColor;
                                if (ptData.textColor) parsedTheme.preConfigureTextColor = ptData.textColor;
                                if (ptData.accentColor) parsedTheme.preConfigureAccentColor = ptData.accentColor;
                            }
                        } catch(e) {}
                    });
                }
                
                // 1. Basic Form
                setForm(prev => ({
                    ...prev,
                    name: p.name || '',
                    slug: p.slug || '',
                    productCode: p.productCode || '',
                    sku: p.sku || '',
                    shortDesc: p.shortDescription || '',
                    description: p.description || '',
                    heritageText: p.heritageText || '',
                    status: p.status || 'draft',
                    productType: p.productType || 'configurable',

                    categoryId: p.mainCategoryId?.toString() || '',
                    taxClassId: p.taxClassId?.toString() || '',
                    price: p.price?.toString() || '',
                    qty: p.qty?.toString() || '0',
                    subtitle: p.subtitle || '',
                    tagline: p.tagline || '',
                    bgColor: p.bgColor || '#ffffff',
                    accentColor: p.accentColor || '#c4a35a',
                    textColor: p.textColor || '#1a1a1a',
                    gradient: p.gradient || '',
                    mistColor: p.mistColor || '#f8fafc',
                    videoUrl: p.videoUrl || '',
                    discoverHeroBgImage: p.discoverHeroBgImage || '',
                    isFeatured: p.isFeatured || false,
                    configuredImageCount: Number(parsedTheme.configuredImageCount) || Number(p.configuredImageCount) || 3,
                    ...parsedTheme,
                    // Hero Image: Prioritize MAIN media from ProductMedia table
                    heroImage: (p.productMedia?.find(pm => pm.type === 'MAIN'))
                        ? { 
                            id: p.productMedia.find(pm => pm.type === 'MAIN').mediaId.toString(),
                            url: p.productMedia.find(pm => pm.type === 'MAIN').media?.url || (p.productMedia.find(pm => pm.type === 'MAIN').media?.fileName ? `/uploads/${p.productMedia.find(pm => pm.type === 'MAIN').media.fileName}` : '')
                          }
                        : (p.heroImage ? { url: p.heroImage.startsWith('http') || p.heroImage.startsWith('/') ? p.heroImage : `/uploads/${p.heroImage}` } : null),
                    // Gallery: Only include GALLERY media from ProductMedia table
                    gallery: (p.productMedia?.length > 0) 
                        ? p.productMedia.filter(pm => pm.type === 'GALLERY').map(pm => ({ 
                            id: pm.mediaId.toString(), 
                            url: pm.media?.url || (pm.media?.fileName ? `/uploads/${pm.media.fileName}` : '')
                        })) 
                        : (p.images || []).filter(img => img !== p.heroImage).map((img, idx) => ({
                            id: `img-${idx}`,
                            url: img.startsWith('http') || img.startsWith('/') ? img : `/uploads/${img}`
                        })),
                    tagIds: p.tags?.map(t => t.tagId.toString()) || [],
                    specifications: p.specifications?.reduce((acc, s) => {
                        acc[s.specificationId.toString()] = s.specificationValueId ? s.specificationValueId.toString() : s.value;
                        return acc;
                    }, {}) || {},
                    beltIds: p.productBelts?.map(b => b.beltId.toString()) || [],
                    canSellBelts: p.productBelts?.length > 0,
                    boxIds: p.productBoxes?.map(b => b.boxId.toString()) || [],
                    canShowBoxes: p.productBoxes?.length > 0
                }));

                // Note: Step locking has been removed. All tabs are accessible.
                
                // 2. Fetch Category Details
                if (p.mainCategoryId) {
                    const catRes = await api.getCategory(p.mainCategoryId);
                    if (catRes.success) setCategoryDetails(catRes.data);
                }

                // 3. Hydrate Variants
                if (p.variants?.length > 0) {
                    setVariants(p.variants.map(v => ({
                        id: v.id,
                        sku: v.sku,
                        comparePrice: v.comparePrice?.toString() || '',
                        price: v.price?.toString(),
                        stock: v.qty?.toString(),
                        name: v.variantAttributes?.map(va => va.attributeValue?.label || va.attributeValue?.value).join(', ') || v.sku,
                        attributeValues: v.variantAttributes?.map(va => ({
                            attributeId: va.attributeId.toString(),
                            attributeValueId: va.attributeValueId.toString()
                        })) || [],
                        heroImage: v.variantImages?.find(vi => vi.type === 'MAIN')?.media ? {
                            id: v.variantImages.find(vi => vi.type === 'MAIN').mediaId.toString(),
                            url: v.variantImages.find(vi => vi.type === 'MAIN').media.url || `/uploads/${v.variantImages.find(vi => vi.type === 'MAIN').media.fileName}`
                        } : null,
                        gallery: v.variantImages?.filter(vi => vi.type === 'GALLERY').map(vi => ({
                            id: vi.mediaId.toString(),
                            url: vi.media.url || `/uploads/${vi.media.fileName}`
                        })) || [],
                        heroBgImage: v.variantImages?.find(vi => vi.type === 'HERO_BG')?.media ? {
                            id: v.variantImages.find(vi => vi.type === 'HERO_BG').mediaId.toString(),
                            url: v.variantImages.find(vi => vi.type === 'HERO_BG').media.url || `/uploads/${v.variantImages.find(vi => vi.type === 'HERO_BG').media.fileName}`
                        } : null,
                        isSoldConfiguration: v.isSoldConfiguration || false,
                        fakeSoldCount: v.fakeSoldCount || 0,
                    })));

                    // Hydrate selectedAttributeValues
                    const attrMap = {};
                    p.variants.forEach(v => {
                        v.variantAttributes?.forEach(va => {
                            const aid = va.attributeId.toString();
                            const avid = va.attributeValueId.toString();
                            if (!attrMap[aid]) attrMap[aid] = [];
                            if (!attrMap[aid].includes(avid)) attrMap[aid].push(avid);
                        });
                    });
                    setSelectedAttributeValues(attrMap);
                }
            }
        } catch (err) {
            console.error("Hydration Error:", err);
            toast.error("Failed to load product details.");
        } finally {
            setProcessing(false);
        }
    }, [productId, toast]);

    useEffect(() => {
        fetchProductDetails();
    }, [fetchProductDetails]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleCategoryChange = async (e) => {
        const catId = e.target.value;
        setForm(prev => ({ ...prev, categoryId: catId, specifications: {} }));
        setSelectedAttributeValues({});
        setVariants([]);
        
        if (catId) {
            const res = await api.getCategory(catId);
            if (res.success) setCategoryDetails(res.data);
        } else {
            setCategoryDetails(null);
        }
    };

    const handleSpecChange = (specId, value) => {
        setForm(prev => ({
            ...prev,
            specifications: { ...prev.specifications, [specId]: value }
        }));
    };

    const toggleAttributeValue = (attrId, valId) => {
        setSelectedAttributeValues(prev => {
            const current = prev[attrId] || [];
            const valIdStr = valId.toString();
            if (current.includes(valIdStr)) {
                return { ...prev, [attrId]: current.filter(id => id !== valIdStr) };
            } else {
                return { ...prev, [attrId]: [...current, valIdStr] };
            }
        });
    };

    const generateVariants = async () => {
        if (!form.categoryId) return toast.error("Select category first");
        
        const selectedAttrs = [];
        categoryDetails?.attributes?.forEach(attrWrapper => {
            const attr = attrWrapper.attribute;
            const selectedValIds = selectedAttributeValues[attr.id.toString()] || [];
            if (selectedValIds.length > 0) {
                const vals = attr.values.filter(v => selectedValIds.includes(v.id.toString()));
                selectedAttrs.push({
                    attrId: attr.id.toString(),
                    attrName: attr.name,
                    values: vals
                });
            }
        });

        if (selectedAttrs.length === 0) return toast.error("Select at least one attribute value");

        const cartesian = (arrays) => arrays.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())), [[]]);
        const valueArrays = selectedAttrs.map(a => a.values.map(v => ({ attrId: a.attrId, val: v })));
        const combinations = cartesian(valueArrays);

        const newVariants = [];
        
        combinations.forEach((combo, idx) => {
            const comboIds = combo.map(c => c.val.id.toString()).sort().join(',');
            
            const exists = variants.find(v => {
                const vComboIds = v.attributeValues.map(av => av.attributeValueId.toString()).sort().join(',');
                return vComboIds === comboIds;
            });

            if (!exists) {
                const name = combo.map(c => c.val.label || c.val.value).join(', ');
                const skuCodes = combo.map(c => (c.val.code || (c.val.label || c.val.value).substring(0,3).toUpperCase()));
                newVariants.push({
                    id: `new-${Date.now()}-${idx}`,
                    sku: `${form.sku || form.productCode || 'PROD'}-${skuCodes.join('-')}`,
                    comparePrice: '',
                    price: '', 
                    stock: '',
                    name: name,
                    attributeValues: combo.map(c => ({
                        attributeId: c.attrId,
                        attributeValueId: c.val.id.toString()
                    })),
                    heroImage: null,
                    heroBgImage: null,
                    gallery: [],
                    isSoldConfiguration: false,
                    fakeSoldCount: 0
                });
            }
        });

        if (newVariants.length > 0) {
            setVariants(prev => [...prev, ...newVariants]);
            toast.success(`Generated ${newVariants.length} variants`);
        } else {
            toast.info("No new variants to generate");
        }
    };

    const updateVariantField = (idx, field, value) => {
        setVariants(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            return next;
        });
    };

    const removeVariant = (idx) => {
        setVariants(prev => prev.filter((_, i) => i !== idx));
    };

    const handleMediaSelect = (selection) => {
        if (pickerTarget === 'primary') {
            setForm(prev => ({ ...prev, heroImage: selection[0] }));
        } else if (pickerTarget === 'discoverHeroBgImage') {
            setForm(prev => ({ ...prev, discoverHeroBgImage: selection[0]?.url || selection[0] }));
        } else if (pickerTarget === 'gallery') {
            setForm(prev => {
                const existingIds = new Set(prev.gallery.map(g => g.id.toString()));
                const heroId = prev.heroImage?.id?.toString();
                const uniqueNew = selection.filter(s => {
                    const sid = s.id.toString();
                    return !existingIds.has(sid) && sid !== heroId;
                });
                return {
                    ...prev,
                    gallery: [...prev.gallery, ...uniqueNew]
                };
            });
        } else if (typeof pickerTarget === 'object') {
            const { variantIndex, type } = pickerTarget;
            setVariants(prev => {
                const next = [...prev];
                if (type === 'primary') {
                    next[variantIndex].heroImage = selection[0];
                } else if (type === 'background') {
                    next[variantIndex].heroBgImage = selection[0];
                } else {
                    const currentGallery = next[variantIndex].gallery || [];
                    const existingIds = new Set(currentGallery.map(g => g.id.toString()));
                    const heroId = next[variantIndex].heroImage?.id?.toString();
                    const uniqueNew = selection.filter(s => {
                        const sid = s.id.toString();
                        return !existingIds.has(sid) && sid !== heroId;
                    });
                    next[variantIndex].gallery = [...currentGallery, ...uniqueNew];
                }
                return next;
            });
        }
        setPickerTarget(null);
    };

    const removeVariantImage = (vIdx, imgId) => {
        setVariants(prev => {
            const next = [...prev];
            next[vIdx].gallery = next[vIdx].gallery.filter(img => img.id !== imgId);
            return next;
        });
    };

    const handleSubmit = async (e, advanceToNext = false) => {
        if (e) e.preventDefault();
        
        // Ensure current step is valid before saving
        if (!validateStep(activeTab)) return;

        // Automatically set status to active if finalizing step 5 and currently draft
        let submitStatus = form.status;
        if (activeTab === 'theme' && form.status === 'draft') {
            submitStatus = 'active';
        }

        setSubmitting(true);
        const { 
            canSellBelts, canShowBoxes, 
            discoverBg, discoverTextColor, discoverAccentColor, discoverGradient,
            productsBg, productsTextColor, productsAccentColor,
            preConfigureBg, preConfigureTextColor, preConfigureAccentColor,
            ...formData 
        } = form;
        
        const themeJson = JSON.stringify({
            configuredImageCount: Number(form.configuredImageCount) || 3,
            discoverBg: form.discoverBg || form.bgColor || '#ffffff',
            discoverTextColor: form.discoverTextColor || form.textColor || '#1a1a1a',
            discoverAccentColor: form.discoverAccentColor || form.accentColor || '#c4a35a',
            discoverGradient: form.discoverGradient || form.gradient || '',
            productsBg: form.productsBg || form.bgColor || '#1a1a1a',
            productsTextColor: form.productsTextColor || form.textColor || '#ffffff',
            productsAccentColor: form.productsAccentColor || form.accentColor || '#c4a35a',
            preConfigureBg: form.preConfigureBg || form.bgColor || '#ffffff',
            preConfigureTextColor: form.preConfigureTextColor || form.textColor || '#1a1a1a',
            preConfigureAccentColor: form.preConfigureAccentColor || form.accentColor || '#c4a35a',
        });
        const payload = {
            ...formData,
            configuredImageCount: Number(form.configuredImageCount) || 3,
            theme: themeJson,
            bgColor: form.discoverBg || form.bgColor || '#ffffff',
            textColor: form.discoverTextColor || form.textColor || '#1a1a1a',
            accentColor: form.discoverAccentColor || form.accentColor || '#c4a35a',
            status: submitStatus,
            shortDescription: form.shortDesc,
            videoUrl: form.videoUrl,
            discoverHeroBgImage: form.discoverHeroBgImage,
            mainCategoryId: form.categoryId,
            sku: form.sku || form.productCode || `SKU-${Date.now()}`,
            price: variants.length > 0 
                ? Math.min(...variants.map(v => parseFloat(v.price) || Infinity)).toString()
                : (form.price || '0'),
            qty: variants.length > 0 
                ? variants.reduce((acc, v) => acc + (parseInt(v.stock) || 0), 0)
                : (parseInt(form.qty) || 0),
            isFeatured: form.isFeatured,
            tagIds: form.tagIds,
            heroImage: form.heroImage?.url,
            heroImageId: form.heroImage?.id,
            galleryIds: form.gallery.map(g => g.id),
            images: [form.heroImage?.url, ...form.gallery.map(g => g.url)].filter(Boolean),
            beltIds: form.canSellBelts ? form.beltIds : [],
            boxIds: form.canShowBoxes ? form.boxIds : [],
            specifications: Object.entries(form.specifications || {}).map(([id, val]) => {
                const specItem = categoryDetails?.specGroups?.flatMap(sg => sg.specGroup.specifications).find(s => s.specification.id.toString() === id);
                const isDropdown = specItem?.specification.type === 'select';
                return {
                    specificationId: id,
                    value: isDropdown ? (specItem.specification.values.find(v => v.id.toString() === val)?.value || '') : (val || ''),
                    specificationValueId: isDropdown ? val : null
                };
            }),
            variants: variants.map(v => ({
                ...(v.id?.toString().startsWith('new') ? {} : { id: v.id }),
                sku: v.sku,
                comparePrice: parseFloat(v.comparePrice) || null,
                price: parseFloat(v.price) || 0,
                stock: parseInt(v.stock) || 0,
                attributeValues: v.attributeValues,
                heroImageId: v.heroImage?.id || undefined,
                heroBgImageId: v.heroBgImage?.id || undefined,
                isSoldConfiguration: v.isSoldConfiguration || false,
                fakeSoldCount: parseInt(v.fakeSoldCount) || 0,
                galleryIds: v.gallery?.map(g => g.id).filter(id => id != null) || []
            }))
        };

        const success = await updateRecord('products', productId, payload, api.updateProduct);
        setSubmitting(false);
        if (success) {
            toast.success("Product details saved successfully!");
            if (advanceToNext) {
                const tabs = ['basic', 'story', 'taxonomy', 'variants', 'theme'];
                const currentIndex = tabs.indexOf(activeTab);
                if (currentIndex < tabs.length - 1) {
                    const nextTab = tabs[currentIndex + 1];
                    setActiveTab(nextTab);
                    router.push(`/admin/products/edit/${productId}?step=${nextTab}`, { scroll: false });
                }
            }
        }
    };

    if (processing || loading.categories) return <Loader />;

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <div className="flex justify-between items-center mb-4">
                <PageHeader title="Edit Product" />
                <button
                    type="button"
                    onClick={() => router.push('/admin/products')}
                    className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-2 shadow-xs"
                >
                    <i className="fas fa-arrow-left"></i> Back to Products
                </button>
            </div>

            <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="flex flex-col md:flex-row min-h-[650px]">
                        {/* Sidebar Tabs */}
                        <div className="w-full md:w-64 min-w-[260px] bg-slate-50/90 border-r border-slate-200 p-4 space-y-2 shrink-0">
                            {[
                                { id: 'basic', label: 'Step 1: Basic Info', icon: 'fa-info-circle' },
                                { id: 'story', label: 'Step 2: Story & Copy', icon: 'fa-align-left' },
                                { id: 'taxonomy', label: 'Step 3: Taxonomy', icon: 'fa-tags' },
                                { id: 'variants', label: 'Step 4: Product Variants', icon: 'fa-cubes' },
                                { id: 'theme', label: 'Step 5: Visual Theme & Live Preview', icon: 'fa-palette' }
                            ].map((tab, idx) => {
                                return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        router.push(`/admin/products/edit/${productId}?step=${tab.id}`, { scroll: false });
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <i className={`fas ${tab.icon} w-5 text-center text-sm`}></i>
                                        <span>{tab.label}</span>
                                    </div>
                                </button>
                                );
                            })}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 p-6 md:p-8 space-y-8 min-w-0 bg-white">
                            {/* 1. Basic Information */}
                            {activeTab === 'basic' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <h3 className="text-xl font-bold text-gray-900 border-b pb-4 mb-6">Core Specifications</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <FormField label="Product Name" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Fylex Chronograph X" required />
                                        </div>
                                        <FormField label="Slug" name="slug" value={form.slug} onChange={handleChange} placeholder="fylex-chronograph-x" />
                                        <FormField label="Product Code" name="productCode" value={form.productCode} onChange={handleChange} placeholder="FY-CHR-001" />
                                        <FormField label="Status" name="status" type="select" value={form.status} onChange={handleChange} options={[
                                            { value: 'active', label: 'Active' },
                                            { value: 'inactive', label: 'Inactive' },
                                            { value: 'draft', label: 'Draft' }
                                        ]} />
                                        <FormField label="Product Type" name="productType" type="select" value={form.productType} onChange={handleChange} options={[
                                            { value: 'configurable', label: 'Configurable (Variants)' }
                                        ]} />
                                        {form.productType === 'simple' && (
                                            <>
                                                <FormField label="Base Price" name="price" type="number" value={form.price} onChange={handleChange} placeholder="0.00" required />
                                                <FormField label="Inventory (Qty)" name="qty" type="number" value={form.qty} onChange={handleChange} placeholder="0" required />
                                            </>
                                        )}
                                        <div className="md:col-span-2 flex items-center gap-3 bg-indigo-50/60 p-5 rounded-2xl border border-indigo-100">
                                            <input 
                                                type="checkbox" 
                                                id="isFeatured" 
                                                name="isFeatured" 
                                                checked={form.isFeatured} 
                                                onChange={handleChange} 
                                                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                            <label htmlFor="isFeatured" className="text-sm font-bold text-indigo-950 cursor-pointer">
                                                Featured Product (Show on Homepage)
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 2. Story & Copy */}
                            {activeTab === 'story' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <h3 className="text-xl font-bold text-gray-900 border-b pb-4 mb-6">Brand Storytelling</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField label="Marketing Tagline" name="tagline" value={form.tagline} onChange={handleChange} placeholder="e.g. A Legacy of Distinction" />
                                        <FormField label="Product Subtitle" name="subtitle" value={form.subtitle} onChange={handleChange} placeholder="e.g. Exceptional Timepieces" />
                                        <div className="md:col-span-2">
                                            <FormField label="Short Description" name="shortDesc" type="textarea" value={form.shortDesc} onChange={handleChange} rows={2} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <FormField label="Model Stories" name="description" type="textarea" value={form.description} onChange={handleChange} rows={4} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <FormField label="Heritage Story" name="heritageText" type="textarea" value={form.heritageText} onChange={handleChange} rows={3} placeholder="The legacy behind this craftsmanship..." />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 3. Taxonomy & Media */}
                            {activeTab === 'taxonomy' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <h3 className="text-xl font-bold text-gray-900 border-b pb-4 mb-6">Classification & Media</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField label="Main Category" name="categoryId" type="select" value={form.categoryId} onChange={handleCategoryChange} options={categories.map(c => ({ value: c.id.toString(), label: c.name }))} required />

                                        <div className="md:col-span-2 space-y-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Tags</label>
                                            <div className="flex flex-wrap gap-2.5 p-4 bg-slate-50 border border-slate-200 rounded-xl min-h-[60px] items-center">
                                                {tags.map(tag => (
                                                    <button
                                                        key={tag.id}
                                                        type="button"
                                                        onClick={() => setForm(prev => ({
                                                            ...prev,
                                                            tagIds: prev.tagIds.includes(tag.id.toString())
                                                                ? prev.tagIds.filter(id => id !== tag.id.toString())
                                                                : [...prev.tagIds, tag.id.toString()]
                                                        }))}
                                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${form.tagIds.includes(tag.id.toString())
                                                            ? 'bg-indigo-600 text-white shadow-sm'
                                                            : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        {tag.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Belts Configuration */}
                                        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-4 hover:border-slate-300 transition-all">
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="checkbox" 
                                                    id="canSellBelts" 
                                                    name="canSellBelts" 
                                                    checked={form.canSellBelts} 
                                                    onChange={handleChange}
                                                    className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                                                />
                                                <label htmlFor="canSellBelts" className="text-sm font-bold text-slate-900 cursor-pointer">
                                                    Allow customers to buy additional belts for this watch
                                                </label>
                                            </div>

                                            {form.canSellBelts && (
                                                <div className="pt-4 pb-2 border-t border-slate-100 space-y-3">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Select Compatible Belts</label>
                                                    {belts.length === 0 ? (
                                                        <p className="text-sm text-slate-500 italic">No belts found. Please create belts in the Belts section first.</p>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2.5 pt-1 pb-1">
                                                            {belts.map(belt => (
                                                                <button
                                                                    type="button"
                                                                    key={belt.id}
                                                                    onClick={() => {
                                                                        setForm(prev => ({
                                                                            ...prev,
                                                                            beltIds: prev.beltIds.includes(belt.id.toString())
                                                                                ? prev.beltIds.filter(id => id !== belt.id.toString())
                                                                                : [...prev.beltIds, belt.id.toString()]
                                                                        }));
                                                                    }}
                                                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${form.beltIds.includes(belt.id.toString())
                                                                        ? 'bg-slate-900 text-white shadow-md'
                                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                                    }`}
                                                                >
                                                                    {belt.name} (Rs. {belt.price})
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Boxes Configuration */}
                                        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-4 hover:border-slate-300 transition-all">
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="checkbox" 
                                                    id="canShowBoxes" 
                                                    name="canShowBoxes" 
                                                    checked={form.canShowBoxes} 
                                                    onChange={handleChange}
                                                    className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                                                />
                                                <label htmlFor="canShowBoxes" className="text-sm font-bold text-slate-900 cursor-pointer">
                                                    Show packaging boxes on the product page
                                                </label>
                                            </div>

                                            {form.canShowBoxes && (
                                                <div className="pt-4 pb-2 border-t border-slate-100 space-y-3">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Select Display Boxes</label>
                                                    {boxes.length === 0 ? (
                                                        <p className="text-sm text-slate-500 italic">No boxes found. Please create boxes in the Boxes section first.</p>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2.5 pt-1 pb-1">
                                                            {boxes.map(box => (
                                                                <button
                                                                    type="button"
                                                                    key={box.id}
                                                                    onClick={() => {
                                                                        setForm(prev => ({
                                                                            ...prev,
                                                                            boxIds: prev.boxIds.includes(box.id.toString())
                                                                                ? prev.boxIds.filter(id => id !== box.id.toString())
                                                                                : [...prev.boxIds, box.id.toString()]
                                                                        }));
                                                                    }}
                                                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${form.boxIds.includes(box.id.toString())
                                                                        ? 'bg-slate-900 text-white shadow-md'
                                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                                    }`}
                                                                >
                                                                    {box.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                          {/* Default Product Media */}
                                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 mt-4 border-t border-slate-200 pt-6">
                                              <div className="md:col-span-2">
                                                  <label className="block text-base font-bold text-slate-900 mb-1">Default Product Media</label>
                                                  <p className="text-xs text-slate-500 mb-4">Images shown on the Storefront Discover page before any variant attributes are selected.</p>
                                              </div>
                                              <div>
                                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Primary Image</label>
                                                     <div
                                                         onClick={() => setPickerTarget('primary')}
                                                         className="h-56 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center cursor-pointer overflow-hidden hover:border-indigo-500 transition-all shadow-xs"
                                                     >
                                                         {(() => {
                                                             const heroImgUrl = typeof form.heroImage === 'string' ? form.heroImage : (form.heroImage?.url || form.heroImage?.filePath || form.heroImage?.fileName);
                                                             if (heroImgUrl) {
                                                                 return <img src={getFileUrl(heroImgUrl)} className="w-full h-full object-contain p-2" alt="Primary Preview" />;
                                                             }
                                                             return (
                                                                 <div className="text-center p-4">
                                                                     <i className="fas fa-cloud-upload-alt text-indigo-400 text-3xl mb-2"></i>
                                                                     <p className="text-slate-700 text-xs font-bold uppercase tracking-wider">Select Primary Image</p>
                                                                     <p className="text-slate-400 text-[10px] mt-1">Click to browse media library</p>
                                                                 </div>
                                                             );
                                                         })()}
                                                     </div>
                                                 </div>
                                                 <div>
                                                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Gallery</label>
                                                     <div className="grid grid-cols-3 gap-3">
                                                         {form.gallery.map((img, i) => {
                                                             const galleryUrl = typeof img === 'string' ? img : (img.url || img.filePath || img.fileName);
                                                             return (
                                                             <div key={i} className="aspect-square rounded-xl border border-slate-200 overflow-hidden relative group shadow-xs">
                                                                 <img src={getFileUrl(galleryUrl)} className="w-full h-full object-cover" alt="Gallery" />
                                                                 <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1.5">
                                                                     <button
                                                                         type="button"
                                                                         onClick={() => moveGalleryImage(i, -1)}
                                                                         disabled={i === 0}
                                                                         className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-slate-700 disabled:opacity-30 hover:bg-slate-100"
                                                                     >
                                                                         <i className="fas fa-chevron-left text-xs"></i>
                                                                     </button>
                                                                     <button
                                                                         type="button"
                                                                         onClick={() => setForm(prev => ({ ...prev, gallery: prev.gallery.filter(g => g.id !== img.id) }))}
                                                                         className="w-7 h-7 bg-red-500 rounded-lg flex items-center justify-center text-white hover:bg-red-600"
                                                                     >
                                                                         <i className="fas fa-trash-alt text-xs"></i>
                                                                     </button>
                                                                     <button
                                                                         type="button"
                                                                         onClick={() => moveGalleryImage(i, 1)}
                                                                         disabled={i === form.gallery.length - 1}
                                                                         className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-slate-700 disabled:opacity-30 hover:bg-slate-100"
                                                                     >
                                                                         <i className="fas fa-chevron-right text-xs"></i>
                                                                     </button>
                                                                 </div>
                                                             </div>
                                                             );
                                                         })}
                                                         <button
                                                             type="button"
                                                             onClick={() => setPickerTarget('gallery')}
                                                             className="aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-600 transition-all"
                                                         >
                                                             <i className="fas fa-plus text-lg"></i>
                                                         </button>
                                                     </div>
                                                 </div>
                                             </div>
                                            </div>

                                    {/* Specifications */}
                                    {categoryDetails && (
                                        <div className="mt-8 border-t pt-8">
                                            <div>
                                                <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                                    <i className="fas fa-list-ul text-indigo-600"></i> Category Specifications
                                                </h4>
                                                <p className="text-sm text-gray-500 mb-6 mt-1">
                                                    These specifications are dynamically loaded based on the selected category. You can create or manage them by editing the category in <a href="/admin/categories" target="_blank" className="text-indigo-600 hover:underline">Categories</a>.
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {categoryDetails.specGroups?.map((group) =>
                                                    group.specGroup.specifications?.map((spec, sIdx) => {
                                                        const s = spec.specification;
                                                        return (
                                                            <div key={sIdx}>
                                                                {s.type === 'select' ? (
                                                                    <FormField
                                                                        label={s.name}
                                                                        type="select"
                                                                        value={form.specifications[s.id.toString()] || ''}
                                                                        onChange={(e) => handleSpecChange(s.id.toString(), e.target.value)}
                                                                        options={[{ value: '', label: `Select ${s.name}` }, ...s.values.map(v => ({ value: v.id.toString(), label: v.label || v.value }))]}
                                                                    />
                                                                ) : (
                                                                    <FormField
                                                                        label={s.name}
                                                                        value={form.specifications[s.id.toString()] || ''}
                                                                        onChange={(e) => handleSpecChange(s.id.toString(), e.target.value)}
                                                                        placeholder={s.name}
                                                                    />
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 5. Visual Theme & Real-Time Live Preview */}
                            {activeTab === 'theme' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="flex justify-between items-center border-b !pb-3">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">Per-Page Visual Theme Customization</h3>
                                            <p className="text-xs text-gray-500">Configure distinct background, text, and accent colors for Discover, Products, and Pre-Configure pages with real-time live layout analysis.</p>
                                        </div>
                                    </div>

                                    {/* Live Preview & Color Controls Grid */}
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                        {/* Controls Column (6 Cols) */}
                                        <div className="lg:col-span-6 space-y-6">
                                            {/* Page Theme Selection Tabs */}
                                            <div className="flex border-b border-gray-200 gap-2">
                                                {[
                                                    { id: 'discover', label: '1. Discover Page', icon: 'fa-compass' },
                                                    { id: 'products', label: '2. Products Page', icon: 'fa-th-large' },
                                                    { id: 'preConfigure', label: '3. Pre-Configure Page', icon: 'fa-sliders-h' },
                                                ].map(pTab => (
                                                    <button
                                                        key={pTab.id}
                                                        type="button"
                                                        onClick={() => setPageThemeTab(pTab.id)}
                                                        className={`!px-3 !py-2.5 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                                                            pageThemeTab === pTab.id
                                                                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                                                                : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <i className={`fas ${pTab.icon}`}></i>
                                                        {pTab.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Tab 1: Discover Page Theme Controls */}
                                            {pageThemeTab === 'discover' && (
                                                <div className="space-y-4 bg-gray-50/70 !p-4 rounded-xl border border-gray-200">
                                                    <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                                        <i className="fas fa-compass text-indigo-600"></i> Discover Page Theme
                                                    </h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <FormField label="Discover Hero Background Color" name="discoverBg" type="color" value={form.discoverBg || form.bgColor || '#ffffff'} onChange={handleChange} />
                                                        <FormField label="Discover Text Color (Title, Price)" name="discoverTextColor" type="color" value={form.discoverTextColor || form.textColor || '#1a1a1a'} onChange={handleChange} />
                                                        <FormField label="Discover Accent Color" name="discoverAccentColor" type="color" value={form.discoverAccentColor || form.accentColor || '#c4a35a'} onChange={handleChange} />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Tab 2: Products Page Theme Controls */}
                                            {pageThemeTab === 'products' && (
                                                <div className="space-y-4 bg-gray-50/70 !p-4 rounded-xl border border-gray-200">
                                                    <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                                        <i className="fas fa-th-large text-indigo-600"></i> Products Listing Card Theme
                                                    </h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <FormField label="Card Background Color" name="productsBg" type="color" value={form.productsBg || form.bgColor || '#1a1a1a'} onChange={handleChange} />
                                                        <FormField label="Card Text Color (Title, Price)" name="productsTextColor" type="color" value={form.productsTextColor || form.textColor || '#ffffff'} onChange={handleChange} />
                                                        <FormField label="Card Accent Color (Tagline, Links)" name="productsAccentColor" type="color" value={form.productsAccentColor || form.accentColor || '#c4a35a'} onChange={handleChange} />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Tab 3: Pre-Configure Page Theme Controls */}
                                            {pageThemeTab === 'preConfigure' && (
                                                <div className="space-y-4 bg-gray-50/70 !p-4 rounded-xl border border-gray-200">
                                                    <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                                        <i className="fas fa-sliders-h text-indigo-600"></i> Pre-Configure Slide Theme
                                                    </h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <FormField label="Pre-Configure Background Color" name="preConfigureBg" type="color" value={form.preConfigureBg || form.bgColor || '#ffffff'} onChange={handleChange} />
                                                        <FormField label="Pre-Configure Text Color" name="preConfigureTextColor" type="color" value={form.preConfigureTextColor || form.textColor || '#1a1a1a'} onChange={handleChange} />
                                                        <FormField label="Pre-Configure Accent Color" name="preConfigureAccentColor" type="color" value={form.preConfigureAccentColor || form.accentColor || '#c4a35a'} onChange={handleChange} />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Presets */}
                                            <div className="!p-4 bg-white border border-gray-200 rounded-xl">
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                                    Curated Presets (Apply to active page)
                                                </label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[
                                                        { name: 'Obsidian Dark', bg: '#0a0a0a', text: '#ffffff', accent: '#c4a35a' },
                                                        { name: 'Pearl Light', bg: '#ffffff', text: '#111111', accent: '#c4a35a' },
                                                        { name: 'Mist Blue', bg: '#e8edf3', text: '#111111', accent: '#3b82f6' },
                                                    ].map((preset, pIdx) => (
                                                        <button
                                                            key={pIdx}
                                                            type="button"
                                                            onClick={() => {
                                                                if (pageThemeTab === 'discover') {
                                                                    setForm(prev => ({ ...prev, discoverBg: preset.bg, discoverTextColor: preset.text, discoverAccentColor: preset.accent }));
                                                                } else if (pageThemeTab === 'products') {
                                                                    setForm(prev => ({ ...prev, productsBg: preset.bg, productsTextColor: preset.text, productsAccentColor: preset.accent }));
                                                                } else {
                                                                    setForm(prev => ({ ...prev, preConfigureBg: preset.bg, preConfigureTextColor: preset.text, preConfigureAccentColor: preset.accent }));
                                                                }
                                                            }}
                                                            className="!p-2 text-left rounded border border-gray-200 hover:border-black transition-all bg-white cursor-pointer"
                                                        >
                                                            <div className="h-5 rounded text-[9px] font-bold flex items-center justify-center mb-1 shadow-inner" style={{ background: preset.bg, color: preset.text }}>Aa</div>
                                                            <span className="text-[10px] font-semibold block text-center truncate">{preset.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Real-Time Live Preview Column (6 Cols) */}
                                        <div className="lg:col-span-6 border border-gray-300 rounded-2xl overflow-hidden shadow-lg bg-gray-900 flex flex-col">
                                            <div className="bg-gray-800 text-white !px-4 !py-3 flex justify-between items-center border-b border-gray-700">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                                    <span className="text-xs font-bold uppercase tracking-wider">Real-Time Live Layout Preview</span>
                                                </div>
                                                <span className="text-[10px] bg-gray-700 px-2.5 py-0.5 rounded text-gray-300 font-semibold">
                                                    {pageThemeTab === 'discover' ? 'Discover Page' : pageThemeTab === 'products' ? 'Products Page' : 'Pre-Configure Page'}
                                                </span>
                                            </div>

                                            {/* Live Canvas View */}
                                            <div className="flex-1 relative bg-black/5 rounded-b-2xl overflow-hidden" style={{ minHeight: '600px' }}>
                                                {/* Desktop Only Preview Notice */}
                                                <div className="absolute top-0 left-0 w-full bg-indigo-600/90 text-white text-[10px] font-bold tracking-widest uppercase py-1 text-center z-10 shadow-md backdrop-blur-sm">
                                                    Interactive Live Preview
                                                </div>
                                                <iframe
                                                    ref={iframeRef}
                                                    src={
                                                        pageThemeTab === 'discover' ? `/discover?watch=${productId}` :
                                                        pageThemeTab === 'products' ? `/products` :
                                                        `/pre-configure`
                                                    }
                                                    className="w-full h-full border-none"
                                                    title="Real-Time Layout Preview"
                                                    onLoad={() => {
                                                        // Fire initial styles on load
                                                        if (iframeRef.current) {
                                                            iframeRef.current.contentWindow.postMessage({
                                                                type: 'PREVIEW_PRODUCT_THEME',
                                                                payload: {
                                                                    discoverBg: form.discoverBg,
                                                                    discoverTextColor: form.discoverTextColor,
                                                                    discoverAccentColor: form.discoverAccentColor,
                                                                    productsBg: form.productsBg,
                                                                    productsTextColor: form.productsTextColor,
                                                                    productsAccentColor: form.productsAccentColor,
                                                                    preConfigureBg: form.preConfigureBg,
                                                                    preConfigureTextColor: form.preConfigureTextColor,
                                                                    preConfigureAccentColor: form.preConfigureAccentColor
                                                                }
                                                            }, '*');
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 5. Variants */}
                            {activeTab === 'variants' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <h3 className="text-xl font-bold text-gray-900 border-b !pb-2 !mb-2">Product Variants</h3>
                                    {form.productType === 'configurable' && categoryDetails ? (
                                        <div className="!space-y-6">
                                            <div className="grid grid-cols-1 !gap-4">
                                                {categoryDetails.attributes?.map((attrWrapper, idx) => {
                                                    const attr = attrWrapper.attribute;
                                                    return (
                                                        <div key={idx} className="!p-4 rounded-lg border border-gray-200 bg-white">
                                                            <label className="font-bold text-gray-700 !mb-3 block">{attr.name}</label>
                                                            <div className="flex flex-wrap gap-2">
                                                                {attr.values?.map(val => {
                                                                    const clientLabel = val.label;
                                                                    const adminValue = val.value || val.name;
                                                                    let displayName = clientLabel || adminValue;
                                                                    if (clientLabel && adminValue && clientLabel.trim().toLowerCase() !== adminValue.trim().toLowerCase()) {
                                                                        displayName = `${clientLabel} (${adminValue})`;
                                                                    }
                                                                    return (
                                                                        <button
                                                                            key={val.id}
                                                                            type="button"
                                                                            onClick={() => toggleAttributeValue(attr.id, val.id)}
                                                                            className={`!px-4 !py-2 rounded-lg text-xs font-bold transition-all border ${selectedAttributeValues[attr.id.toString()]?.includes(val.id.toString())
                                                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                                                                : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-400'
                                                                                }`}
                                                                        >
                                                                            {displayName}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={generateVariants}
                                                className="!px-6 !py-3 bg-gray-900 text-white rounded-lg font-bold transition-all shadow-lg flex items-center gap-2"
                                            >
                                                <i className="fas fa-magic"></i> Update Configurations
                                            </button>

                                             {variants.length > 0 && (
                                                 <div style={{ marginTop: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
                                                     
                                                     {/* TABULATOR TOOLBAR: SEARCH & BULK ACTIONS */}
                                                     <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                                         <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                                             <div style={{ position: 'relative', width: '260px' }}>
                                                                 <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}></i>
                                                                 <input
                                                                     type="text"
                                                                     placeholder="Search SKU or Variant..."
                                                                     value={variantSearch}
                                                                     onChange={(e) => { setVariantSearch(e.target.value); setVariantPage(1); }}
                                                                     style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, background: '#ffffff', outline: 'none' }}
                                                                 />
                                                             </div>
                                                             <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', background: '#e2e8f0', padding: '6px 12px', borderRadius: '20px' }}>
                                                                 {variants.filter(v => (v.name || '').toLowerCase().includes(variantSearch.toLowerCase()) || (v.sku || '').toLowerCase().includes(variantSearch.toLowerCase())).length} Variants
                                                             </span>
                                                         </div>

                                                         <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                             <button
                                                                 type="button"
                                                                 onClick={() => {
                                                                     const val = prompt('Enter Selling Price to apply to ALL variants:');
                                                                     if (val !== null && val !== '' && !isNaN(val)) {
                                                                         setVariants(prev => prev.map(v => ({ ...v, price: Number(val) })));
                                                                         toast?.success?.(`Updated selling price to ₹${val} for all variants`);
                                                                     }
                                                                 }}
                                                                 style={{ padding: '7px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#334155', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                                             >
                                                                 <i className="fas fa-tags" style={{ color: '#4f46e5' }}></i> Batch Price
                                                             </button>
                                                             <button
                                                                 type="button"
                                                                 onClick={() => {
                                                                     const val = prompt('Enter Stock count to apply to ALL variants:');
                                                                     if (val !== null && val !== '' && !isNaN(val)) {
                                                                         setVariants(prev => prev.map(v => ({ ...v, stock: Number(val) })));
                                                                         toast?.success?.(`Updated stock count to ${val} for all variants`);
                                                                     }
                                                                 }}
                                                                 style={{ padding: '7px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#334155', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                                             >
                                                                 <i className="fas fa-boxes" style={{ color: '#10b981' }}></i> Batch Stock
                                                             </button>
                                                         </div>
                                                     </div>

                                                     {/* FLEXIBLE HORIZONTAL SCROLL CONTAINER */}
                                                     <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                                                         <table style={{ width: '100%', minWidth: '1350px', borderCollapse: 'collapse' }}>
                                                             <thead>
                                                                 <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                                                     <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', width: '90px' }}>Order</th>
                                                                     <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', width: '220px' }}>Variant Combination</th>
                                                                     <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', width: '280px' }}>SKU Code</th>
                                                                     <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', width: '120px' }}>Actual Price</th>
                                                                     <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', width: '120px' }}>Selling Price</th>
                                                                     <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', width: '100px' }}>Stock</th>
                                                                     <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', width: '140px' }}>Media</th>
                                                                     <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', width: '110px' }}>Sold Config</th>
                                                                     <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', width: '110px' }}>Sold Count</th>
                                                                     <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', width: '60px' }}></th>
                                                                 </tr>
                                                             </thead>
                                                             <tbody style={{ divideY: '1px solid #f1f5f9' }}>
                                                                 {(() => {
                                                                     const activeList = variants.filter(v => 
                                                                         (v.name || '').toLowerCase().includes(variantSearch.toLowerCase()) || 
                                                                         (v.sku || '').toLowerCase().includes(variantSearch.toLowerCase())
                                                                     );
                                                                     if (activeList.length === 0) {
                                                                         return (
                                                                             <tr>
                                                                                 <td colSpan="10" style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontWeight: 600 }}>
                                                                                     No variants match your search filter "{variantSearch}".
                                                                                 </td>
                                                                             </tr>
                                                                         );
                                                                     }
                                                                     return activeList.slice((variantPage - 1) * variantsPerPage, variantPage * variantsPerPage).map((variant, localIdx) => {
                                                                         const vIdx = variants.findIndex(v => v.sku === variant.sku || v === variant);
                                                                         return (
                                                                         <tr key={variant.sku || localIdx} style={{ transition: 'background 0.2s', borderBottom: '1px solid #f1f5f9' }} className="hover:bg-slate-50/80">
                                                                             <td style={{ padding: '12px 16px' }}>
                                                                                 <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                     <button type="button" onClick={() => setPrimaryVariant(vIdx)} title={variant.isPrimary ? 'Primary Variant' : 'Make Primary'} style={{ border: 'none', background: variant.isPrimary ? '#fef3c7' : 'transparent', color: variant.isPrimary ? '#d97706' : '#cbd5e1', padding: '4px', borderRadius: '6px', cursor: 'pointer' }}><i className="fas fa-star" style={{ fontSize: '12px' }}></i></button>
                                                                                     <button type="button" onClick={() => moveVariantOrder(vIdx, -1)} disabled={vIdx === 0} style={{ border: 'none', background: 'transparent', color: '#94a3b8', padding: '2px', cursor: vIdx === 0 ? 'not-allowed' : 'pointer', opacity: vIdx === 0 ? 0.3 : 1 }}><i className="fas fa-chevron-up" style={{ fontSize: '11px' }}></i></button>
                                                                                     <button type="button" onClick={() => moveVariantOrder(vIdx, 1)} disabled={vIdx === variants.length - 1} style={{ border: 'none', background: 'transparent', color: '#94a3b8', padding: '2px', cursor: vIdx === variants.length - 1 ? 'not-allowed' : 'pointer', opacity: vIdx === variants.length - 1 ? 0.3 : 1 }}><i className="fas fa-chevron-down" style={{ fontSize: '11px' }}></i></button>
                                                                                 </div>
                                                                             </td>
                                                                             <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                                                                 {variant.name}
                                                                             </td>
                                                                             <td style={{ padding: '12px 16px' }}>
                                                                                 <input 
                                                                                     type="text" 
                                                                                     value={variant.sku} 
                                                                                     onChange={(e) => updateVariantField(vIdx, 'sku', e.target.value)} 
                                                                                     style={{ width: '100%', minWidth: '220px', fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#334155', outline: 'none' }}
                                                                                 />
                                                                             </td>
                                                                             <td style={{ padding: '12px 16px' }}>
                                                                                 <input 
                                                                                     type="number" 
                                                                                     value={variant.comparePrice || ''} 
                                                                                     onChange={(e) => updateVariantField(vIdx, 'comparePrice', e.target.value)} 
                                                                                     style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', fontWeight: 600, outline: 'none' }} 
                                                                                     placeholder="₹ Actual"
                                                                                 />
                                                                             </td>
                                                                             <td style={{ padding: '12px 16px' }}>
                                                                                 <input 
                                                                                     type="number" 
                                                                                     value={variant.price || ''} 
                                                                                     onChange={(e) => updateVariantField(vIdx, 'price', e.target.value)} 
                                                                                     style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', fontWeight: 700, color: '#4f46e5', outline: 'none' }} 
                                                                                     placeholder="₹ Selling"
                                                                                 />
                                                                             </td>
                                                                             <td style={{ padding: '12px 16px' }}>
                                                                                 <input 
                                                                                     type="number" 
                                                                                     value={variant.stock !== undefined ? variant.stock : ''} 
                                                                                     onChange={(e) => updateVariantField(vIdx, 'stock', e.target.value)} 
                                                                                     style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', fontWeight: 700, outline: 'none' }} 
                                                                                 />
                                                                             </td>
                                                                             <td style={{ padding: '12px 16px' }}>
                                                                                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                     {variant.heroImage ? (
                                                                                         <div style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', flexShrink: 0 }}>
                                                                                             <img src={getFileUrl(variant.heroImage?.url || variant.heroImage)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                                         </div>
                                                                                     ) : (
                                                                                         <div style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', flexShrink: 0 }}>
                                                                                             <i className="fas fa-image" style={{ fontSize: '12px' }}></i>
                                                                                         </div>
                                                                                     )}
                                                                                     <button type="button" onClick={() => setVariantImageModal({ index: vIdx, name: variant.name })} style={{ padding: '5px 10px', background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: '8px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}>Manage</button>
                                                                                 </div>
                                                                             </td>
                                                                             <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                                                 <input type="checkbox" checked={variant.isSoldConfiguration || false} onChange={(e) => updateVariantField(vIdx, 'isSoldConfiguration', e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#4f46e5' }} />
                                                                             </td>
                                                                             <td style={{ padding: '12px 16px' }}>
                                                                                 <input type="number" value={variant.fakeSoldCount || 0} onChange={(e) => updateVariantField(vIdx, 'fakeSoldCount', e.target.value)} style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', outline: 'none' }} />
                                                                             </td>
                                                                             <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                                                 <button type="button" onClick={() => removeVariant(vIdx)} style={{ border: 'none', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: '14px', transition: 'color 0.2s' }} className="hover:text-red-500"><i className="fas fa-trash-alt"></i></button>
                                                                             </td>
                                                                         </tr>
                                                                         );
                                                                     });
                                                                 })()}
                                                             </tbody>
                                                         </table>
                                                     </div>

                                                     {/* TABULATOR FOOTER & PAGINATION */}
                                                     {(() => {
                                                         const activeList = variants.filter(v => 
                                                             (v.name || '').toLowerCase().includes(variantSearch.toLowerCase()) || 
                                                             (v.sku || '').toLowerCase().includes(variantSearch.toLowerCase())
                                                         );
                                                         return (
                                                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 12 }}>
                                                             <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                                 <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                                                                     Showing <strong style={{ color: '#0f172a' }}>{activeList.length === 0 ? 0 : (variantPage - 1) * variantsPerPage + 1}</strong> to <strong style={{ color: '#0f172a' }}>{Math.min(variantPage * variantsPerPage, activeList.length)}</strong> of <strong style={{ color: '#0f172a' }}>{activeList.length}</strong> variants
                                                                 </span>
                                                                 <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                     <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Per page:</span>
                                                                     <select
                                                                         value={variantsPerPage}
                                                                         onChange={(e) => {
                                                                             setVariantsPerPage(Number(e.target.value));
                                                                             setVariantPage(1);
                                                                         }}
                                                                         style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 700, background: '#fff', color: '#1e293b', outline: 'none' }}
                                                                     >
                                                                         <option value={5}>5</option>
                                                                         <option value={10}>10</option>
                                                                         <option value={25}>25</option>
                                                                         <option value={50}>50</option>
                                                                         <option value={100}>100</option>
                                                                     </select>
                                                                 </div>
                                                             </div>

                                                             {Math.ceil(activeList.length / variantsPerPage) > 1 && (
                                                                 <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                                     <button
                                                                         type="button"
                                                                         onClick={() => setVariantPage(p => Math.max(1, p - 1))}
                                                                         disabled={variantPage === 1}
                                                                         style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, fontWeight: 700, cursor: variantPage === 1 ? 'not-allowed' : 'pointer', opacity: variantPage === 1 ? 0.4 : 1, color: '#334155' }}
                                                                     >
                                                                         Prev
                                                                     </button>
                                                                     {Array.from({ length: Math.ceil(activeList.length / variantsPerPage) }).map((_, pageIdx) => {
                                                                         const pageNum = pageIdx + 1;
                                                                         const isActive = variantPage === pageNum;
                                                                         return (
                                                                             <button
                                                                                 key={pageNum}
                                                                                 type="button"
                                                                                 onClick={() => setVariantPage(pageNum)}
                                                                                 style={{ minWidth: 32, height: 32, padding: '0 8px', borderRadius: 8, border: isActive ? 'none' : '1px solid #cbd5e1', background: isActive ? '#4f46e5' : '#fff', color: isActive ? '#fff' : '#334155', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                                             >
                                                                                 {pageNum}
                                                                             </button>
                                                                         );
                                                                     })}
                                                                     <button
                                                                         type="button"
                                                                         onClick={() => setVariantPage(p => Math.min(Math.ceil(activeList.length / variantsPerPage), p + 1))}
                                                                         disabled={variantPage === Math.ceil(activeList.length / variantsPerPage)}
                                                                         style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, fontWeight: 700, cursor: variantPage === Math.ceil(activeList.length / variantsPerPage) ? 'not-allowed' : 'pointer', opacity: variantPage === Math.ceil(activeList.length / variantsPerPage) ? 0.4 : 1, color: '#334155' }}
                                                                     >
                                                                         Next
                                                                     </button>
                                                                 </div>
                                                             )}
                                                         </div>
                                                         );
                                                             })()}

                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                                                <i className="fas fa-cubes text-2xl"></i>
                                            </div>
                                            <h4 className="text-lg font-bold text-gray-900">Configuration Required</h4>
                                            <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">
                                                Select &quot;Configurable&quot; in Basic Info and choose a category with attributes to manage variants.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 5. Visual Theme & Live Preview Tab */}
                            {activeTab === 'theme' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="border-b pb-4 flex items-center justify-between flex-wrap gap-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">Step 5: Visual Theme &amp; Live Preview</h3>
                                            <p className="text-xs text-gray-500 mt-1">Configure storefront layout settings &amp; preview final configured watch display in real time.</p>
                                        </div>
                                        <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100 flex items-center gap-2">
                                            <i className="fas fa-eye text-xs"></i> Real-Time Live Preview
                                        </span>
                                    </div>

                                    {/* Configured Product Image Display Count Setting */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                                        <div>
                                            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                                <i className="fas fa-images text-indigo-600"></i> Configured Product Image Display Count
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Choose how many images are displayed when a customer views or configures this watch on the storefront.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                            {[
                                                { count: 1, title: 'Single Primary Image (1)', desc: 'Show only 1 main watch image on final configured view' },
                                                { count: 2, title: '2 Images', desc: 'Show primary main image + 1 secondary thumbnail' },
                                                { count: 3, title: '3 Images (Default)', desc: 'Show all 3 gallery watch images & thumbnails' }
                                            ].map(opt => {
                                                const isSelected = (Number(form.configuredImageCount) || 3) === opt.count;
                                                return (
                                                    <div 
                                                        key={opt.count}
                                                        onClick={() => setForm(prev => ({ ...prev, configuredImageCount: opt.count }))}
                                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                            isSelected 
                                                                ? 'bg-indigo-50/90 border-indigo-600 text-indigo-950 shadow-sm' 
                                                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className="font-bold text-sm">{opt.title}</span>
                                                            <input 
                                                                type="radio" 
                                                                name="configuredImageCount" 
                                                                checked={isSelected}
                                                                onChange={() => setForm(prev => ({ ...prev, configuredImageCount: opt.count }))}
                                                                className="w-4 h-4 text-indigo-600 accent-indigo-600 cursor-pointer"
                                                            />
                                                        </div>
                                                        <p className="text-xs opacity-75">{opt.desc}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* REAL-TIME LIVE INTERACTIVE PREVIEW */}
                                    <div className="bg-slate-950 rounded-2xl p-6 text-white space-y-4 shadow-xl border border-slate-800">
                                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Live Storefront Preview</span>
                                            </div>
                                            <span className="text-xs text-indigo-400 font-bold bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-800/50">
                                                {(Number(form.configuredImageCount) || 3) === 1 ? 'Displaying Single Primary Image Only (1)' : `Displaying ${form.configuredImageCount || 3} Images`}
                                            </span>
                                        </div>

                                        <div className="bg-white text-slate-900 rounded-xl p-8 flex flex-col items-center text-center space-y-5 relative overflow-hidden shadow-inner">
                                            <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
                                                ✓ Configured View Preview Mode ({form.configuredImageCount || 3} {(Number(form.configuredImageCount) || 3) === 1 ? 'Image' : 'Images'})
                                            </div>
                                            
                                            <div>
                                                <h4 className="text-2xl md:text-3xl font-bold font-serif text-slate-900">{form.name || 'FYLEX Chronograph X'}</h4>
                                                <p className="text-sm font-semibold text-slate-500 mt-1">₹{(Number(form.price) || 25000).toLocaleString()}</p>
                                            </div>

                                            {/* Dynamic Live Images Display */}
                                            <div className="w-full flex flex-col items-center justify-center gap-4 py-4 min-h-[220px]">
                                                {(() => {
                                                    const count = Number(form.configuredImageCount) || 3;
                                                    const sampleImages = [
                                                        form.heroImage?.url || form.heroImage || (variants[0]?.heroImage?.url || variants[0]?.heroImage) || '/assets/fylex-watch-v2/36mm.png',
                                                        form.gallery?.[0]?.url || form.gallery?.[0] || '/assets/fylex-watch-v2/40mm.png',
                                                        form.gallery?.[1]?.url || form.gallery?.[1] || '/assets/fylex-watch-v2/olive-green.png'
                                                    ].map(getFileUrl).filter(Boolean);

                                                    const visibleImgs = sampleImages.slice(0, count);

                                                    return (
                                                        <div className="w-full flex flex-col items-center gap-4">
                                                            <div className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-4 shadow-md max-w-xs">
                                                                <img src={visibleImgs[0]} alt="Primary Watch" className="w-44 h-44 object-contain mx-auto" />
                                                                <span className="absolute top-2 left-2 bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                                                                    PRIMARY WATCH IMAGE
                                                                </span>
                                                            </div>

                                                            {count > 1 && visibleImgs.length > 1 && (
                                                                <div className="flex gap-3 justify-center items-center pt-2">
                                                                    {visibleImgs.map((imgSrc, idx) => (
                                                                        <div key={idx} className={`w-14 h-14 rounded-lg border-2 p-1 bg-slate-50 overflow-hidden ${idx === 0 ? 'border-indigo-600 shadow-sm' : 'border-slate-200 opacity-70'}`}>
                                                                            <img src={imgSrc} alt={`Thumb ${idx}`} className="w-full h-full object-contain" />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {count === 1 && (
                                                                <p className="text-xs text-slate-400 font-medium italic">
                                                                    Secondary thumbnails hidden (Single Primary Image Mode active)
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Form Footer */}
                    <div className="bg-gray-50 border-t border-gray-200 !px-2 flex items-center justify-between">
                        <div className="text-sm text-gray-500 flex items-center gap-2 font-medium">
                            <i className="fas fa-shield-alt text-indigo-500"></i>
                            All luxury details will be saved securely
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <button
                                type="button"
                                onClick={() => {
                                    const tabs = ['basic', 'story', 'taxonomy', 'variants', 'theme'];
                                    const currentIndex = tabs.indexOf(activeTab);
                                    if (currentIndex > 0) {
                                        const prevTab = tabs[currentIndex - 1];
                                        setActiveTab(prevTab);
                                        router.push(`/admin/products/edit/${productId}?step=${prevTab}`, { scroll: false });
                                    }
                                }}
                                className={`px-6 py-3 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-all shadow-xs ${activeTab === 'basic' ? 'invisible' : ''}`}
                            >
                                <i className="fas fa-arrow-left mr-2"></i> Previous Step
                            </button>
                            
                            <button
                                type="button"
                                onClick={(e) => handleSubmit(e, false)}
                                disabled={submitting}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                            >
                                {submitting ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-save"></i> Save Changes</>}
                            </button>

                            {activeTab !== 'theme' && (
                                <button
                                    type="button"
                                    onClick={(e) => handleSubmit(e, true)}
                                    disabled={submitting}
                                    className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                >
                                    Save & Next Step <i className="fas fa-arrow-right ml-1"></i>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <MediaPickerModal
                isOpen={!!pickerTarget}
                onClose={() => setPickerTarget(null)}
                onSelect={handleMediaSelect}
                multiple={pickerTarget === 'gallery' || (pickerTarget && typeof pickerTarget === 'object' && pickerTarget.type === 'gallery')}
            />

            {/* Variant Image Type Selection Modal */}
            {variantImageModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50" onClick={() => setVariantImageModal(null)}>
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 !p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="!px-6 !py-5 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h4 className="text-lg font-bold text-gray-900">Manage Variant Images</h4>
                                <p className="text-xs text-gray-500 mt-0.5">Configure media for <span className="text-indigo-600 font-semibold">{variantImageModal.name}</span></p>
                            </div>
                            <button type="button" onClick={() => setVariantImageModal(null)} className="!w-8 !h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {variants[variantImageModal.index]?.heroImage && (
                                <div className="!mb-4">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest !mb-2 block">Primary Image</label>
                                    <div className="flex gap-2.5">
                                        <div className="relative flex-none !w-24 !h-24 rounded-xl border-2 border-indigo-200 overflow-hidden shadow-sm group/main">
                                            <img src={getFileUrl(variants[variantImageModal.index].heroImage.url || variants[variantImageModal.index].heroImage)} className="w-full h-full object-cover" />
                                            <div className="absolute top-1 right-1 bg-indigo-500 text-white text-[9px] font-bold !px-1.5 !py-0.5 rounded shadow-sm group-hover/main:hidden">MAIN</div>
                                            <button type="button" onClick={() => updateVariantField(variantImageModal.index, 'heroImage', null)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-lg hidden group-hover/main:flex items-center justify-center text-white hover:bg-red-600 shadow-sm transition-all"><i className="fas fa-trash-alt text-[10px]"></i></button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Hero Background Preview */}
                            {variants[variantImageModal.index]?.heroBgImage && (
                                <div className="!mb-4">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest !mb-2 block">Variant Background</label>
                                    <div className="flex gap-2.5">
                                        <div className="relative flex-none !w-24 !h-24 rounded-xl border-2 border-emerald-200 overflow-hidden shadow-sm group/bg">
                                            <img src={getFileUrl(variants[variantImageModal.index].heroBgImage.url || variants[variantImageModal.index].heroBgImage)} className="w-full h-full object-cover" />
                                            <div className="absolute top-1 right-1 bg-emerald-500 text-white text-[9px] font-bold !px-1.5 !py-0.5 rounded shadow-sm group-hover/bg:hidden">BG</div>
                                            <button type="button" onClick={() => updateVariantField(variantImageModal.index, 'heroBgImage', null)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-lg hidden group-hover/bg:flex items-center justify-center text-white hover:bg-red-600 shadow-sm transition-all"><i className="fas fa-trash-alt text-[10px]"></i></button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Variant Gallery Preview & Reorder */}
                            {variants[variantImageModal.index]?.gallery?.length > 0 && (
                                <div className="!mb-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest !mb-3 block">Display Order</label>
                                    <div className="flex gap-2.5 overflow-x-auto pb-4 scrollbar-thin">
                                        {variants[variantImageModal.index].gallery.map((img, gIdx) => (
                                            <div key={gIdx} className="relative flex-none !w-16 !h-16 rounded-xl border border-gray-200 overflow-hidden group/item shadow-sm">
                                                <img src={getFileUrl(img.url)} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover/item:opacity-100 transition-all flex flex-col items-center justify-center gap-1.5">
                                                    <div className="flex gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => moveVariantGalleryImage(variantImageModal.index, gIdx, -1)}
                                                            disabled={gIdx === 0}
                                                            className="!w-5 !h-5 bg-white rounded-lg flex items-center justify-center text-indigo-600 disabled:opacity-30 hover:bg-indigo-50 cursor-pointer shadow-sm"
                                                        ><i className="fas fa-chevron-left text-[8px]"></i></button>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeVariantImage(variantImageModal.index, img.id)}
                                                            className="!w-5 !h-5 bg-red-500 rounded-lg flex items-center justify-center text-white hover:bg-red-600 cursor-pointer shadow-sm"
                                                        ><i className="fas fa-trash-alt text-[8px]"></i></button>
                                                        <button
                                                            type="button"
                                                            onClick={() => moveVariantGalleryImage(variantImageModal.index, gIdx, 1)}
                                                            disabled={gIdx === variants[variantImageModal.index].gallery.length - 1}
                                                            className="!w-5 !h-5 bg-white rounded-lg flex items-center justify-center text-indigo-600 disabled:opacity-30 hover:bg-indigo-50 cursor-pointer shadow-sm"
                                                        ><i className="fas fa-chevron-right text-[8px]"></i></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    setPickerTarget({ variantIndex: variantImageModal.index, type: 'primary' });
                                    setVariantImageModal(null);
                                }}
                                className="w-full flex items-center gap-4 !p-4 rounded-xl border border-gray-100 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all group/btn cursor-pointer"
                            >
                                <div className="!w-12 !h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover/btn:bg-indigo-600 group-hover/btn:text-white transition-all">
                                    <i className="fas fa-star text-lg"></i>
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-gray-900">Primary Image</div>
                                    <div className="text-xs text-gray-500">Main image for this variant</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setPickerTarget({ variantIndex: variantImageModal.index, type: 'gallery' });
                                    setVariantImageModal(null);
                                }}
                                className="w-full flex items-center gap-4 !p-4 rounded-xl border border-gray-100 hover:border-purple-400 hover:bg-purple-50/50 transition-all group/btn cursor-pointer"
                            >
                                <div className="!w-12 !h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover/btn:bg-purple-600 group-hover/btn:text-white transition-all">
                                    <i className="fas fa-images text-lg"></i>
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-gray-900">Add to Gallery</div>
                                    <div className="text-xs text-gray-500">Upload lifestyle or angle shots</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setPickerTarget({ variantIndex: variantImageModal.index, type: 'background' });
                                    setVariantImageModal(null);
                                }}
                                className="w-full flex items-center gap-4 !p-4 rounded-xl border border-gray-100 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all group/btn cursor-pointer"
                            >
                                <div className="!w-12 !h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover/btn:bg-emerald-600 group-hover/btn:text-white transition-all">
                                    <i className="fas fa-mountain text-lg"></i>
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-gray-900">Variant Hero Background</div>
                                    <div className="text-xs text-gray-500">Specific backdrop for this variant</div>
                                </div>
                            </button>
                        </div>
                        <div className="!p-4 bg-gray-50/80 border-t border-gray-100 flex justify-center">
                            <button
                                type="button"
                                onClick={() => setVariantImageModal(null)}
                                className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest cursor-pointer"
                            >
                                Close Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditProductPage;
;
