// Auth API Service - Supabase Registration
import { apiClient } from './client';
import { User } from '@/types/api';

export interface RegisterResponse {
  message: string;
  user: User;
}

export const authApi = {
  /**
   * Supabase signup ke baad, backend me hotel aur user profile banane ke liye.
   */
  register: async (name: string, hotelName: string): Promise<RegisterResponse> => {
    return apiClient.post<RegisterResponse>('/auth/register', {
      name,
      hotel_name: hotelName,
    });
  },

  /**
   * Current user profile backend database se nikalne ke liye.
   */
  getCurrentUser: async (): Promise<User> => {
    return apiClient.get<User>('/users/me');
  },
};

export default authApi;
