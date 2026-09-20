'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingService } from '@/services/booking.service';
import { queryKeys } from '@/lib/query-keys';
import { BookingRequest, BookingResponse } from '@/types/booking.types';

export function useMyBookings(options?: { enabled?: boolean }) {
  return useQuery<any[]>({
    queryKey: queryKeys.booking.my(),
    queryFn: () => bookingService.getMyBookings(),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation<BookingResponse, Error, BookingRequest>({
    mutationFn: (request: BookingRequest) => bookingService.createBooking(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.booking.my() });
    },
  });
}
