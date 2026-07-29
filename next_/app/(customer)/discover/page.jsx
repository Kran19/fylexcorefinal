"use client";
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function DiscoverRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams ? searchParams.toString() : '';
    router.replace(`/explore${params ? `?${params}` : ''}`);
  }, [router, searchParams]);

  return null;
}
