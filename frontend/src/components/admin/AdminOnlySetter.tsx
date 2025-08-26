// src/components/admin/AdminOnlySetter.tsx
import React from "react"
import { useIsFeeToSetter } from "../../hooks/useIsFeeToSetter"

export default function AdminOnlySetter({
  children,
  factory,
  fallback = null,          // what to show if not admin (default: nothing)
  showWhileLoading = false, // set true if you want a placeholder while reading
}: {
  children: React.ReactNode
  factory?: `0x${string}`
  fallback?: React.ReactNode
  showWhileLoading?: boolean
}) {
  const { isSetter, loading } = useIsFeeToSetter(factory)
  if (loading && !showWhileLoading) return null
  if (!isSetter) return <>{fallback}</>
  return <>{children}</>
}
