"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useToast } from './ToastContext';
import * as api from '@/services/adminApi';

const AdminDataContext = createContext();
export const useAdminData = () => useContext(AdminDataContext);

const ENTITY_FETCHERS = {
  products: api.getProducts,
  categories: api.getCategories,
  orders: api.getOrders,
  users: api.getUsers,
  offers: api.getOffers,
  reviews: api.getReviews,
  tags: api.getTags,
  attributes: api.getAttributes,
  specifications: api.getSpecifications,
  specificationGroups: api.getSpecificationGroups,
  taxes: api.getTaxes,
  taxClasses: api.getTaxClasses,
  media: api.getMedia,
  pages: api.getPages,
  banners: api.getBanners,
  testimonials: api.getTestimonials,
  homeSections: api.getHomeSections,
  settings: api.getSettings,
  inventory: api.getInventory,
  shippingMethods: api.getShippingMethods,
  faqs: api.getFaqs,
  productCareSteps: api.getProductCareStepsGrouped,
};

/**
 * Maps an active /admin/* pathname to ONLY the entities needed on that screen,
 * eliminating the 22-request startup stampede & 16,000-row inventory freeze!
 */
function resolveRequiredEntitiesForPath(pathname) {
  if (!pathname || !pathname.startsWith('/admin') || pathname.startsWith('/admin/login')) {
    return [];
  }
  if (pathname === '/admin' || pathname.startsWith('/admin/dashboard') || pathname.startsWith('/admin/cart-analytics')) {
    return ['settings'];
  }
  if (pathname.startsWith('/admin/orders')) {
    return ['orders', 'settings'];
  }
  if (pathname.startsWith('/admin/inventory')) {
    return ['inventory', 'products'];
  }
  if (pathname.startsWith('/admin/products/attributes')) {
    return ['attributes', 'media'];
  }
  if (pathname.startsWith('/admin/products/specifications')) {
    return ['specifications', 'specificationGroups'];
  }
  if (pathname.startsWith('/admin/products/tags')) {
    return ['tags'];
  }
  if (pathname.startsWith('/admin/products')) {
    return ['products', 'categories', 'tags', 'attributes', 'specifications', 'specificationGroups', 'taxes', 'taxClasses', 'media'];
  }
  if (pathname.startsWith('/admin/categories')) {
    return ['categories', 'media'];
  }
  if (pathname.startsWith('/admin/offers')) {
    return ['offers', 'products', 'categories'];
  }
  if (pathname.startsWith('/admin/users')) {
    return ['users', 'orders'];
  }
  if (pathname.startsWith('/admin/reviews')) {
    return ['reviews', 'products'];
  }
  if (pathname.startsWith('/admin/taxes')) {
    return ['taxes', 'taxClasses'];
  }
  if (pathname.startsWith('/admin/shipping')) {
    return ['shippingMethods', 'settings'];
  }
  if (pathname.startsWith('/admin/media/optimization') || pathname.startsWith('/admin/media/video') || pathname.startsWith('/admin/media/image') || pathname.startsWith('/admin/media/storage') || pathname.startsWith('/admin/media/purge')) {
    // Dedicated Speed Booster & DAM pages call their own lightweight endpoints directly
    return [];
  }
  if (pathname.startsWith('/admin/media')) {
    return ['media'];
  }
  if (pathname.startsWith('/admin/cms/banners')) {
    return ['banners', 'media'];
  }
  if (pathname.startsWith('/admin/cms/home-sections')) {
    return ['homeSections', 'banners', 'settings', 'media'];
  }
  if (pathname.startsWith('/admin/cms/products')) {
    return ['products', 'media'];
  }
  if (pathname.startsWith('/admin/cms')) {
    return ['pages', 'banners', 'homeSections', 'settings', 'media'];
  }
  if (pathname.startsWith('/admin/pages')) {
    return ['pages'];
  }
  if (pathname.startsWith('/admin/testimonials')) {
    return ['testimonials', 'media'];
  }
  if (pathname.startsWith('/admin/faqs')) {
    return ['faqs'];
  }
  if (pathname.startsWith('/admin/care-steps')) {
    return ['productCareSteps', 'products', 'media'];
  }
  if (pathname.startsWith('/admin/settings')) {
    return ['settings', 'taxes', 'taxClasses', 'shippingMethods', 'users'];
  }
  if (pathname.startsWith('/admin/reports')) {
    return ['orders', 'products'];
  }
  // Safe fallback for any other /admin sub-route (excludes massive inventory unless needed)
  return ['products', 'categories', 'media', 'settings'];
}

export const AdminDataProvider = ({ children }) => {
  const toast = useToast();
  const pathname = usePathname() || '';
  const loadedEntitiesRef = useRef(new Set());
  const inflightEntitiesRef = useRef(new Set());

  const [data, setData] = useState({
    products: [],
    categories: [],
    orders: [],
    users: [],
    offers: [],
    reviews: [],
    taxes: [],
    taxClasses: [],
    tags: [],
    attributes: [],
    specifications: [],
    specificationGroups: [],
    media: [],
    pages: [],
    banners: [],
    testimonials: [],
    homeSections: [],
    settings: null,
    inventory: [],
    shippingMethods: [],
    faqs: [],
    productCareSteps: [],
  });

  const [loading, setLoading] = useState({
    products: false,
    categories: false,
    orders: false,
    users: false,
    offers: false,
    reviews: false,
    taxes: false,
    taxClasses: false,
    tags: false,
    attributes: false,
    specifications: false,
    specificationGroups: false,
    media: false,
    pages: false,
    banners: false,
    testimonials: false,
    homeSections: false,
    settings: false,
    inventory: false,
    shippingMethods: false,
    faqs: false,
    productCareSteps: false,
  });

  const [errors, setErrors] = useState({});

  const fetchEntity = useCallback(async (entity, apiFn, force = false) => {
    if (!apiFn) return;
    if (!force && (loadedEntitiesRef.current.has(entity) || inflightEntitiesRef.current.has(entity))) {
      return;
    }

    inflightEntitiesRef.current.add(entity);
    setLoading((prev) => ({ ...prev, [entity]: true }));
    setErrors((prev) => ({ ...prev, [entity]: null }));

    try {
      const { data: result, error } = await apiFn();

      if (error) {
        setErrors((prev) => ({ ...prev, [entity]: error }));
        setData((prev) => ({ ...prev, [entity]: entity === 'settings' ? null : [] }));
      } else {
        const list = Array.isArray(result)
          ? result
          : result?.data ?? result?.items ?? result ?? [];
        setData((prev) => ({ ...prev, [entity]: list }));
        loadedEntitiesRef.current.add(entity);
      }
    } finally {
      inflightEntitiesRef.current.delete(entity);
      setLoading((prev) => ({ ...prev, [entity]: false }));
    }
  }, []);

  // Route-aware lazy loading: only load entities required by the current /admin screen!
  useEffect(() => {
    const required = resolveRequiredEntitiesForPath(pathname);
    if (required.length === 0) return;

    required.forEach((entity) => {
      const fn = ENTITY_FETCHERS[entity];
      if (fn) {
        fetchEntity(entity, fn, false);
      }
    });
  }, [pathname, fetchEntity]);

  const memoizedRefetch = React.useMemo(
    () => ({
      products: () => fetchEntity('products', api.getProducts, true),
      categories: () => fetchEntity('categories', api.getCategories, true),
      orders: () => fetchEntity('orders', api.getOrders, true),
      users: () => fetchEntity('users', api.getUsers, true),
      offers: () => fetchEntity('offers', api.getOffers, true),
      reviews: () => fetchEntity('reviews', api.getReviews, true),
      tags: () => fetchEntity('tags', api.getTags, true),
      attributes: () => fetchEntity('attributes', api.getAttributes, true),
      specifications: () => fetchEntity('specifications', api.getSpecifications, true),
      specificationGroups: () => fetchEntity('specificationGroups', api.getSpecificationGroups, true),
      taxes: () => fetchEntity('taxes', api.getTaxes, true),
      taxClasses: () => fetchEntity('taxClasses', api.getTaxClasses, true),
      media: () => fetchEntity('media', api.getMedia, true),
      pages: () => fetchEntity('pages', api.getPages, true),
      banners: () => fetchEntity('banners', api.getBanners, true),
      testimonials: () => fetchEntity('testimonials', api.getTestimonials, true),
      homeSections: () => fetchEntity('homeSections', api.getHomeSections, true),
      settings: () => fetchEntity('settings', api.getSettings, true),
      inventory: () => fetchEntity('inventory', api.getInventory, true),
      shippingMethods: () => fetchEntity('shippingMethods', api.getShippingMethods, true),
      faqs: () => fetchEntity('faqs', api.getFaqs, true),
      productCareSteps: () => fetchEntity('productCareSteps', api.getProductCareStepsGrouped, true),
    }),
    [fetchEntity],
  );

  const addRecord = useCallback(
    async (entity, record, apiFn) => {
      if (!apiFn) {
        const local = { ...record, id: Date.now() };
        setData((prev) => ({ ...prev, [entity]: [local, ...(prev[entity] || [])] }));
        toast?.success?.('Added successfully');
        return local;
      }

      const res = await apiFn(record);
      const { data: created, error, success } = res;

      if (error || success === false) {
        toast?.error?.(error || 'Failed to save record');
        return null;
      }

      await memoizedRefetch[entity]?.();
      toast?.success?.('Added successfully');
      return created?.data || created;
    },
    [memoizedRefetch, toast],
  );

  const updateRecord = useCallback(
    async (entity, id, updates, apiFn) => {
      if (!apiFn) {
        setData((prev) => ({
          ...prev,
          [entity]: (prev[entity] || []).map((item) => (item.id === id ? { ...item, ...updates } : item)),
        }));
        toast?.success?.('Updated successfully');
        return;
      }

      const { error, success } = await apiFn(id, updates);
      if (error || success === false) {
        toast?.error?.(error || 'Failed to update');
        return false;
      }
      await memoizedRefetch[entity]?.();
      toast?.success?.('Updated successfully');
      return true;
    },
    [memoizedRefetch, toast],
  );

  const deleteRecord = useCallback(
    async (entity, id, apiFn) => {
      if (!apiFn) {
        setData((prev) => ({
          ...prev,
          [entity]: (prev[entity] || []).filter((item) => item.id !== id),
        }));
        toast?.success?.('Deleted successfully');
        return true;
      }

      const { error, success } = await apiFn(id);
      if (error || success === false) {
        toast?.error?.(error || 'Failed to delete');
        return false;
      }
      await memoizedRefetch[entity]?.();
      toast?.success?.('Deleted successfully');
      return true;
    },
    [memoizedRefetch, toast],
  );

  const generateVariants = useCallback(
    async (productId, selections) => {
      const res = await api.generateVariants(productId, selections);
      if (res.error || res.success === false) {
        toast?.error?.(res.error || 'Failed to generate variants');
        return null;
      }
      toast?.success?.(`Generated ${res.data?.count || 0} variants`);
      return res.data;
    },
    [toast],
  );

  const getProductVariants = useCallback(
    async (productId) => {
      const res = await api.getProductVariants(productId);
      if (res.error || res.success === false) {
        toast?.error?.(res.error || 'Failed to fetch variants');
        return [];
      }
      return res.data;
    },
    [toast],
  );

  const upload360Media = useCallback(
    async (productId, formData) => {
      const res = await api.upload360Media(productId, formData);
      if (res.error || res.success === false) {
        toast?.error?.(res.error || 'Failed to upload 360 media');
        return null;
      }
      toast?.success?.('360 media uploaded');
      return res.data;
    },
    [toast],
  );

  const value = React.useMemo(
    () => ({
      data,
      loading,
      errors,
      refetch: memoizedRefetch,
      addRecord,
      updateRecord,
      deleteRecord,
      generateVariants,
      getProductVariants,
      upload360Media,
    }),
    [
      data,
      loading,
      errors,
      memoizedRefetch,
      addRecord,
      updateRecord,
      deleteRecord,
      generateVariants,
      getProductVariants,
      upload360Media,
    ],
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
};
