/**
 * Yuding V2 - Central API Client Service Re-export
 *
 * For architectural consistency and backward compatibility, exports the
 * central API client and error models from `@/lib/api-client`.
 */

export {
  ApiClient,
  apiClient,
  ApiError,
  type ApiErrorDetails,
  type RequestOptions,
} from '@/lib/api-client';
